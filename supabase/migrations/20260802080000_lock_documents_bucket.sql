-- 가정통신문은 총괄교사만 받으면 되므로 버킷을 닫는다.
--
-- public=true였을 때는 주소만 알면 로그인 없이 받을 수 있었다. 저장 경로에 시각이
-- 들어가 있어 아주 쉽게 맞힐 수 있는 건 아니지만, 그건 '가려둔 것'이지 '막은 것'이
-- 아니다. 닫아두면 받을 때마다 잠깐 쓰는 주소를 새로 발급받아야 한다.
update storage.buckets set public = false where id = 'documents';

-- 파일 정보도 관리자만 읽는다. 첫 화면에서 받기 링크를 없앴으므로
-- 로그인하지 않은 사람이 이 표를 볼 이유가 사라졌다.
drop policy if exists app_documents_public_read on public.app_documents;

drop policy if exists app_documents_owner_read on public.app_documents;

create policy app_documents_owner_read on public.app_documents
  for select to authenticated
  using (public.is_app_owner());
