import { supabase } from './supabaseClient'

/**
 * 협의회를 지우기 전에 무엇이 함께 사라지는지 숫자로 보여주고, 확인을 받으면 지운다.
 *
 * 반과 학부모 응답까지 연쇄로 지워지는 동작이라 이름만 확인시키면 손이 너무 쉽게 나간다.
 * 연습용이면 '응답 0건'이 보여 마음 편히 누를 수 있고, 진짜 협의회면 숫자가 손을 멈춘다.
 *
 * 지웠으면 true, 사용자가 취소했으면 false. 실패는 예외로 던진다.
 */
export async function confirmAndDeleteEvent(event: {
  id: string
  title: string
}): Promise<boolean> {
  const [classResult, bookingResult] = await Promise.all([
    supabase.from('classes').select('id', { count: 'exact', head: true }).eq('event_id', event.id),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('event_id', event.id),
  ])
  if (classResult.error) throw new Error(classResult.error.message)
  if (bookingResult.error) throw new Error(bookingResult.error.message)

  const confirmed = window.confirm(
    `'${event.title}'을(를) 지웁니다.\n\n` +
      `반 ${classResult.count ?? 0}개와 이미 제출된 학부모 응답 ${bookingResult.count ?? 0}건이 ` +
      `함께 사라지며, 되돌릴 수 없습니다.\n\n지울까요?`,
  )
  if (!confirmed) return false

  const { error } = await supabase.from('events').delete().eq('id', event.id)
  if (error) throw new Error(error.message)
  return true
}
