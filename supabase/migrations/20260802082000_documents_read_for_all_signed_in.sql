-- 받는 사람과 바꾸는 사람을 가른다.
--
-- 총괄 선생님들은 각자 구글 계정으로 로그인해 자기 협의회를 운영한다. 그분들도
-- 가정통신문 양식은 받아야 하지만, 양식 자체를 바꾸는 건 앱을 관리하는 두 사람만 한다.
-- 로그인조차 하지 않은 사람에게는 여전히 아무것도 열리지 않는다.

drop policy if exists app_documents_public_read on public.app_documents;
drop policy if exists app_documents_owner_read on public.app_documents;
drop policy if exists app_documents_read on public.app_documents;

create policy app_documents_read on public.app_documents
  for select to authenticated using (true);

-- storage 쪽도 같은 기준으로 나눈다. 하나의 for all 정책으로는 '읽기는 모두,
-- 쓰기는 관리자'를 표현할 수 없어 명령별로 나눠 적는다.
drop policy if exists documents_owner_write on storage.objects;
drop policy if exists documents_read on storage.objects;
drop policy if exists documents_owner_insert on storage.objects;
drop policy if exists documents_owner_update on storage.objects;
drop policy if exists documents_owner_delete on storage.objects;

-- 잠깐 쓰는 내려받기 주소를 만들려면 select 권한이 있어야 한다
create policy documents_read on storage.objects
  for select to authenticated
  using (bucket_id = 'documents');

create policy documents_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and public.is_app_owner());

create policy documents_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and public.is_app_owner())
  with check (bucket_id = 'documents' and public.is_app_owner());

create policy documents_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and public.is_app_owner());
