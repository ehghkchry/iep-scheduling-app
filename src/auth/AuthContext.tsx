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
  /**
   * 앱 자체를 관리하는 사람인지. 구글 계정만 있으면 누구나 로그인해 자기 협의회를
   * 만들 수 있으므로, '로그인했다'와 '이 앱의 주인이다'는 다른 이야기다.
   * 가정통신문 양식처럼 앱 전체에 하나뿐인 자료를 바꿀 수 있는지가 이 값으로 갈린다.
   */
  isAppOwner: boolean
  signInWithGoogle: (redirectPath?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAppOwner, setIsAppOwner] = useState(false)

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

  /*
   * 관리자 명단은 화면에 내려주지 않고 예/아니오만 물어본다.
   * 이 값은 무엇을 보여줄지 정하는 데만 쓰고, 실제로 막는 일은 DB 정책이 한다 —
   * 화면에서 감춘 것만으로는 막았다고 할 수 없다.
   */
  const userId = session?.user.id ?? null
  useEffect(() => {
    if (!userId) {
      setIsAppOwner(false)
      return
    }

    let cancelled = false
    supabase.rpc('is_app_owner').then(({ data, error }) => {
      if (!cancelled) setIsAppOwner(!error && data === true)
    })

    return () => {
      cancelled = true
    }
  }, [userId])

  const value = useMemo<AuthContextValue>(() => {
    const meta = session?.user.user_metadata as { full_name?: string; name?: string } | undefined

    return {
      session,
      loading,
      displayName: meta?.full_name ?? meta?.name ?? session?.user.email ?? null,
      isAppOwner,

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
  }, [session, loading, isAppOwner])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.')
  return context
}
