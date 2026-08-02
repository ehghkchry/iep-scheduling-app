-- 관리교사가 결과 시간표에서 학생 이름 옆 ✕로 그 시간대 하나를 빼는 기능.
--
-- 슬롯만 지우는 것과 "마지막 하나면 제출을 통째로 지우는 것"을 한 트랜잭션에 묶는다.
-- 화면에서 두 번에 나눠 부르면, 사이에서 실패했을 때 희망 시간대가 하나도 없는
-- 제출이 남는다. 그건 결과 화면에 이름만 뜨고 시간은 비어 있는 상태라 읽는 사람이
-- 무슨 뜻인지 알 수 없다.
--
-- booking_slots에는 관리자 DELETE 정책이 없다(SELECT만). 여기서만 지울 수 있게 두어,
-- 위 규칙을 건너뛸 길 자체를 만들지 않는다.
create or replace function public.admin_remove_booking_slot(
  p_booking_id uuid,
  p_slot_date date,
  p_slot_start_time time without time zone
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_left integer;
begin
  select event_id into v_event_id from public.bookings where id = p_booking_id;

  if v_event_id is null then
    raise exception 'booking_not_found';
  end if;

  -- 남의 협의회를 건드리지 못하게 한다. SECURITY DEFINER라 RLS가 비켜서므로
  -- 소유 확인을 여기서 직접 한다.
  if not public.is_event_owner(v_event_id) then
    raise exception 'not_allowed';
  end if;

  delete from public.booking_slots
  where booking_id = p_booking_id
    and slot_date = p_slot_date
    and slot_start_time = p_slot_start_time;

  select count(*) into v_left
  from public.booking_slots
  where booking_id = p_booking_id;

  if v_left = 0 then
    -- 답변은 외래키 cascade로 함께 사라진다
    delete from public.bookings where id = p_booking_id;
    return 'booking_deleted';
  end if;

  return 'slot_deleted';
end;
$$;

revoke all on function public.admin_remove_booking_slot(uuid, date, time without time zone) from anon;
grant execute on function public.admin_remove_booking_slot(uuid, date, time without time zone) to authenticated;
