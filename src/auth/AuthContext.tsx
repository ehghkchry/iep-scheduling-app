import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { getEmailForUsername, isUsernameAvailable } from '../lib/rpc'

/**
 * 관리교사는 이메일 대신 "아이디"로 로그인한다.
 * Supabase Auth는 내부적으로 이메일을 쓰므로, 아이디 -> 이메일 변환을 여기서 감춘다.
 * 가입 때 받은 이메일은 비밀번호를 잊었을 때 재설정 링크를 받는 용도로만 쓰인다.
 */

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

interface AuthContextValue {
  session: Session | null
  /** 첫 세션 복원이 끝나기 전에는 true. 이때 화면을 그리면 로그인 화면이 깜빡인다. */
  loading: boolean
  signUp: (params: { username: string; email: string; password: string }) => Promise<void>
  signIn: (params: { username: string; password: string }) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (username: string) => Promise<string>
  updatePassword: (password: string) => Promise<void>
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

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,

      async signUp({ username, email, password }) {
        const id = normalizeUsername(username)
        if (!id) throw new Error('아이디를 입력해 주세요.')

        if (!(await isUsernameAvailable(id))) {
          throw new Error('이미 사용중인 아이디입니다. 다른 아이디를 입력해 주세요.')
        }

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          // DB 트리거가 이 값을 읽어 profiles 행을 만든다.
          options: { data: { username: id } },
        })

        if (error) {
          // 중복 확인과 실제 가입 사이에 다른 사람이 같은 아이디를 채간 경우
          if (error.message.includes('profiles_username_key')) {
            throw new Error('이미 사용중인 아이디입니다. 다른 아이디를 입력해 주세요.')
          }
          if (error.message.toLowerCase().includes('already registered')) {
            throw new Error('이미 가입된 이메일입니다.')
          }
          throw new Error(error.message)
        }
      },

      async signIn({ username, password }) {
        const email = await getEmailForUsername(normalizeUsername(username))
        if (!email) throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')

        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
      },

      async signOut() {
        await supabase.auth.signOut()
      },

      /** 재설정 메일을 보낸 이메일 주소를 돌려준다 (화면에 가려서 안내하기 위함). */
      async requestPasswordReset(username) {
        const email = await getEmailForUsername(normalizeUsername(username))
        if (!email) throw new Error('등록되지 않은 아이디입니다.')

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/admin/reset-password`,
        })
        if (error) throw new Error(error.message)
        return email
      },

      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw new Error(error.message)
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.')
  return context
}
