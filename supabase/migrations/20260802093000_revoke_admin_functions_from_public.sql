-- 관리자용 함수의 실행 권한을 PUBLIC에서 회수한다.
--
-- Postgres는 함수를 만들면 PUBLIC에게 EXECUTE를 기본으로 준다. anon 역할은 PUBLIC을
-- 물려받으므로, 'revoke from anon'만 해서는 실제로 닫히지 않는다. 실제로 두 함수가
-- 비로그인도 호출 가능한 상태였다.
--
-- 함수 안에서 소유자를 확인하기 때문에 뚫리지는 않았다(비로그인으로 불러보면
-- not_allowed로 막힌다). 다만 그건 마지막 방어선이고, 애초에 부를 수 없어야 한다.
-- 이름을 아는 사람이 남의 예약 id를 넣어가며 있는지 없는지를 떠볼 여지도 사라진다.
revoke all on function public.admin_remove_booking_slot(uuid, date, time without time zone)
  from public, anon;
grant execute on function public.admin_remove_booking_slot(uuid, date, time without time zone)
  to authenticated;

revoke all on function public.is_app_owner() from public, anon;
grant execute on function public.is_app_owner() to authenticated;
