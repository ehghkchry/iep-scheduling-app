import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** 환경 변수가 제대로 들어왔는지. 배포한 곳에 값을 넣지 않으면 여기서 걸린다. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error(
    'VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다. ' +
      '로컬에서는 .env 파일을, 배포한 곳에서는 환경 변수 설정을 확인하세요.',
  )
}

/*
 * 값이 없을 때 createClient가 예외를 던지면 React가 그려지기도 전에 멈춰서
 * 아무 설명 없는 흰 화면이 된다. 형식만 맞는 값을 넣어 예외를 피하고,
 * 안내 화면은 App에서 isSupabaseConfigured를 보고 띄운다.
 */
export const supabase = createClient(
  supabaseUrl || 'https://not-configured.supabase.co',
  supabaseAnonKey || 'not-configured',
)
