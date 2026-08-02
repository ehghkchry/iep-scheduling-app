-- 이 앱을 관리하는 사람. 협의회를 만드는 '로그인한 사람'과는 다른 층이다.
-- 구글 계정만 있으면 누구나 로그인해 자기 협의회를 만들 수 있지만, 앱 전체에 걸린
-- 자료(가정통신문 양식 같은)를 바꾸는 건 여기 적힌 사람만 할 수 있다.
create table if not exists public.app_owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- 나중에 대시보드에서 볼 때 누구인지 알아보려고 적어둔다
  note text,
  created_at timestamptz not null default now()
);

alter table public.app_owners enable row level security;
-- 정책을 하나도 두지 않아 아무도 직접 읽거나 쓸 수 없다. 아래 함수로만 묻는다.
revoke all on public.app_owners from anon, authenticated;

-- 지금 로그인한 사람이 관리자인지. 명단은 감추고 예/아니오만 돌려준다.
create or replace function public.is_app_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.app_owners where user_id = auth.uid());
$$;

revoke all on function public.is_app_owner() from anon;
grant execute on function public.is_app_owner() to authenticated;

-- 앱 전체에 하나씩만 두는 파일들. 지금은 가정통신문 양식 한 건이지만,
-- 나중에 다른 양식이 생겨도 id만 달리해 같은 방식으로 얹을 수 있다.
create table if not exists public.app_documents (
  id text primary key,
  file_name text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users (id)
);

alter table public.app_documents enable row level security;

-- 받는 건 누구나. 로그인하지 않는 각 학급 특수교사도 받아야 한다.
create policy app_documents_public_read on public.app_documents
  for select to anon, authenticated using (true);

create policy app_documents_owner_write on public.app_documents
  for all to authenticated
  using (public.is_app_owner())
  with check (public.is_app_owner());

-- 파일 자체가 담기는 곳. public=true라 내려받기는 주소만 알면 되고,
-- 올리고 지우는 것만 아래 정책으로 막는다. 10MB면 한글 문서에는 넉넉하다.
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', true, 10485760)
on conflict (id) do update set public = true, file_size_limit = 10485760;

drop policy if exists documents_owner_write on storage.objects;

create policy documents_owner_write on storage.objects
  for all to authenticated
  using (bucket_id = 'documents' and public.is_app_owner())
  with check (bucket_id = 'documents' and public.is_app_owner());

-- 관리자 명단은 사람마다 다르므로 여기에 적지 않는다.
-- 새로 배포하는 곳에서는 아래처럼 직접 넣는다:
--   insert into public.app_owners (user_id, note)
--   select id, email from auth.users where email = '...';
