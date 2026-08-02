-- 살아 있는지 밖에서 물어보는 용도.
--
-- 무료 플랜은 이레 동안 아무 접속이 없으면 프로젝트를 재운다. 깨어 있게 하려면
-- 주기적으로 찔러줘야 하는데, 앱 주소(Vercel)를 찌르는 건 소용이 없다. 그건 정적
-- 파일이라 DB를 거치지 않는다. /auth/v1/health도 DB까지 가지 않을 수 있다.
--
-- 그래서 반드시 Postgres를 거치는 자리를 하나 열어둔다. 자료는 아무것도 내주지 않고
-- 'ok' 한 마디만 돌려준다. stable이라 PostgREST에서 GET으로 부를 수 있어,
-- 감시 서비스에서 주소만 등록하면 된다.
create or replace function public.ping()
returns text
language sql
stable
as $$
  select 'ok'::text;
$$;

grant execute on function public.ping() to anon, authenticated;
