import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

/**
 * 관리교사는 구글 계정으로 로그인한다.
 * 비밀번호를 만들거나 외울 일이 없고, 잊었을 때 메일을 보낼 일도 없다.
 * (Supabase 기본 메일 발송은 팀원 주소로만, 시간당 2통까지만 나가서 실사용이 어렵다.)
 */

interface AuthContextValue {
  session: Session | null
  /** 첫 세션 복원이 끝나기 전에는 true. 이때 화면을 그리면 로그인 화면이 깜빡인다. */
  loading: boolean
  /** 화면에 표시할 이름. 구글 프로필 이름이 없으면 이메일로 대신한다. */
  displayName: string | null
  signInWithGoogle: (redirectPath?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const meta = session?.user.user_metadata as { full_name?: string; name?: string } | undefined

    return {
      session,
      loading,
      displayName: meta?.full_name ?? meta?.name ?? session?.user.email ?? null,

      async signInWithGoogle(redirectPath = '/admin') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}${redirectPath}` },
        })
        if (error) throw new Error(error.message)
        // 성공하면 구글 동의 화면으로 이동하므로 여기 아래는 실행되지 않는다
      },

      async signOut() {
        await supabase.auth.signOut()
      },
    }
  }, [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.')
  return context
}
