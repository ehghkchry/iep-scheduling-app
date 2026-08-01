-- 협의회 전체에 걸리는 마감.
--
-- 담임 선생님이 자기 반만 막는 unavailable_slots와 별개의 테이블로 둔다. 한 테이블에
-- 섞으면 "담임이 막은 것"과 "관리교사가 막은 것"을 구분할 수 없어지고, 그러면 담임
-- 화면에서 무엇을 풀 수 있는지 판단할 근거가 사라진다.

create table if not exists public.event_blocked_slots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  slot_date date not null,
  slot_start_time time without time zone not null,
  created_at timestamptz not null default now(),
  unique (event_id, slot_date, slot_start_time)
);

create index if not exists event_blocked_slots_event_id_idx
  on public.event_blocked_slots (event_id);

alter table public.event_blocked_slots enable row level security;

-- 이 프로젝트의 원본 테이블은 비로그인 접근을 권한 단계에서부터 끊는다. Supabase가 새
-- 테이블에 기본으로 주는 anon 권한을 회수해, RLS 하나에만 기대지 않게 한다.
revoke all on public.event_blocked_slots from anon;

-- 다른 관리자 테이블과 같은 규칙: 자기 협의회만
drop policy if exists event_blocked_slots_admin_all on public.event_blocked_slots;

create policy event_blocked_slots_admin_all
  on public.event_blocked_slots
  for all
  to authenticated
  using (is_event_owner(event_id))
  with check (is_event_owner(event_id));

-- ── 담임 조회 ───────────────────────────────────────────────────────────
-- 두 종류를 합쳐 주되, 관리교사가 막은 것은 locked = true로 구분해 보낸다.
-- 반환 열이 늘어나므로 replace가 아니라 다시 만든다.

drop function if exists public.teacher_get_blocked_slots (uuid);

create function public.teacher_get_blocked_slots (p_token uuid)
returns table (
  slot_date date,
  slot_start_time time without time zone,
  locked boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  -- 담임과 관리교사가 같은 칸을 둘 다 막았으면 한 줄로 합치고, 잠금이 이긴다
  select s.slot_date, s.slot_start_time, bool_or(s.locked) as locked
  from (
    select u.slot_date, u.slot_start_time, false as locked
    from public.unavailable_slots u
    join public.classes c on c.id = u.class_id
    where c.teacher_access_token = p_token

    union all

    select b.slot_date, b.slot_start_time, true as locked
    from public.event_blocked_slots b
    join public.classes c on c.event_id = b.event_id
    where c.teacher_access_token = p_token
  ) s
  group by s.slot_date, s.slot_start_time;
$$;

-- ── 담임 마감 토글 ──────────────────────────────────────────────────────
-- 관리교사가 막아둔 칸은 담임이 열지도 닫지도 못한다. 화면에서 버튼을 비활성화하는
-- 것만으로는 우회할 수 있으므로 여기서 막는다.

create or replace function public.teacher_set_slot_blocked (
  p_token uuid,
  p_slot_date date,
  p_slot_start_time time without time zone,
  p_blocked boolean
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_class_id uuid;
  v_event_id uuid;
begin
  select c.id, c.event_id into v_class_id, v_event_id
  from public.classes c
  where c.teacher_access_token = p_token;

  if v_class_id is null then
    raise exception 'invalid_token';
  end if;

  if exists (
    select 1 from public.event_blocked_slots b
    where b.event_id = v_event_id
      and b.slot_date = p_slot_date
      and b.slot_start_time = p_slot_start_time
  ) then
    raise exception 'slot_locked_by_admin';
  end if;

  if p_blocked then
    insert into public.unavailable_slots (class_id, slot_date, slot_start_time)
    values (v_class_id, p_slot_date, p_slot_start_time)
    on conflict (class_id, slot_date, slot_start_time) do nothing;
  else
    delete from public.unavailable_slots u
    where u.class_id = v_class_id
      and u.slot_date = p_slot_date
      and u.slot_start_time = p_slot_start_time;
  end if;
end;
$$;

-- ── 학부모 조회 ─────────────────────────────────────────────────────────
-- 학부모는 누가 막았는지 알 필요가 없다. 합쳐서 하나로 준다.

create or replace function public.parent_get_blocked_slots (p_token uuid, p_class_id uuid)
returns table (slot_date date, slot_start_time time without time zone)
language sql
stable
security definer
set search_path to 'public'
as $$
  select u.slot_date, u.slot_start_time
  from public.unavailable_slots u
  join public.classes c on c.id = u.class_id
  join public.events e on e.id = c.event_id
  where e.parent_access_token = p_token and c.id = p_class_id

  union

  select b.slot_date, b.slot_start_time
  from public.event_blocked_slots b
  join public.events e on e.id = b.event_id
  join public.classes c on c.event_id = e.id
  where e.parent_access_token = p_token and c.id = p_class_id;
$$;

-- ── 학부모 제출 ─────────────────────────────────────────────────────────
-- 반 단위 마감만 검사하고 있었다. 화면을 열어둔 채 관리교사가 시간을 막으면 그 칸으로
-- 신청이 들어갈 수 있어, 같은 자리에서 협의회 단위 마감도 함께 본다.

create or replace function public.parent_submit_booking (
  p_token uuid,
  p_class_id uuid,
  p_student_name text,
  p_slots jsonb,
  p_answers jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_event public.events;
  v_booking_id uuid;
  v_access_token uuid;
  v_name text := btrim(coalesce(p_student_name, ''));
  v_slots jsonb := coalesce(p_slots, '[]'::jsonb);
  v_answers jsonb := coalesce(p_answers, '[]'::jsonb);
  v_slot jsonb;
  v_answer jsonb;
  v_date date;
  v_time time;
  v_required int;
  v_provided int;
begin
  select e.* into v_event
  from public.events e
  join public.classes c on c.event_id = e.id
  where e.parent_access_token = p_token and c.id = p_class_id;

  if v_event.id is null then
    raise exception 'invalid_token_or_class';
  end if;

  if v_name = '' then
    raise exception 'student_name_required';
  end if;

  if jsonb_array_length(v_slots) = 0 then
    raise exception 'slots_required';
  end if;

  for v_slot in select * from jsonb_array_elements(v_slots)
  loop
    v_date := (v_slot->>'slot_date')::date;
    v_time := (v_slot->>'slot_start_time')::time;

    -- 학교가 쉬는 날인지 (주말 또는 관리교사가 뺀 날)
    if not v_event.include_weekends and extract(isodow from v_date) >= 6 then
      raise exception 'day_excluded';
    end if;

    if exists (
      select 1 from public.event_excluded_dates x
      where x.event_id = v_event.id and x.excluded_date = v_date
    ) then
      raise exception 'day_excluded';
    end if;

    -- 날짜 범위 안이고 격자에 정확히 맞는 시각인지
    if v_date < v_event.date_range_start
       or v_date > v_event.date_range_end
       or v_time < v_event.daily_start_time
       or v_time + make_interval(mins => v_event.slot_duration_minutes) > v_event.daily_end_time
       or mod(
            (extract(epoch from v_time) - extract(epoch from v_event.daily_start_time))::int,
            (v_event.slot_duration_minutes + v_event.break_minutes) * 60
          ) <> 0
    then
      raise exception 'slot_out_of_range';
    end if;

    if exists (
      select 1 from public.unavailable_slots u
      where u.class_id = p_class_id and u.slot_date = v_date and u.slot_start_time = v_time
    ) then
      raise exception 'slot_unavailable';
    end if;

    if exists (
      select 1 from public.event_blocked_slots b
      where b.event_id = v_event.id and b.slot_date = v_date and b.slot_start_time = v_time
    ) then
      raise exception 'slot_unavailable';
    end if;
  end loop;

  select count(*) into v_required from public.questions q where q.event_id = v_event.id;

  select count(distinct (elem->>'question_id')::uuid) into v_provided
  from jsonb_array_elements(v_answers) elem
  where exists (
    select 1 from public.questions q
    where q.id = (elem->>'question_id')::uuid and q.event_id = v_event.id
  );

  if v_provided < v_required then
    raise exception 'answers_incomplete';
  end if;

  insert into public.bookings (event_id, class_id, student_name)
  values (v_event.id, p_class_id, v_name)
  returning id, access_token into v_booking_id, v_access_token;

  insert into public.booking_slots (booking_id, slot_date, slot_start_time)
  select v_booking_id, (s->>'slot_date')::date, (s->>'slot_start_time')::time
  from jsonb_array_elements(v_slots) s
  on conflict (booking_id, slot_date, slot_start_time) do nothing;

  for v_answer in select * from jsonb_array_elements(v_answers)
  loop
    insert into public.answers (booking_id, question_id, value)
    values (v_booking_id, (v_answer->>'question_id')::uuid, v_answer->'value');
  end loop;

  return v_access_token;
exception
  when unique_violation then
    raise exception 'duplicate_student';
end;
$$;
