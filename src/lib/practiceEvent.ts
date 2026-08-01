import { addDays, format } from 'date-fns'
import { supabase } from './supabaseClient'
import { PRESET_QUESTIONS } from './presetQuestions'

/**
 * 학부모가 되어 신청해 보려고 협의회·반·질문을 손으로 다 만드는 게 번거로워서, 버튼 하나로
 * 그 준비를 끝내주는 연습용 협의회를 둔다.
 *
 * 실제 협의회와 똑같은 테이블에 들어간다. 따로 표시하는 열은 만들지 않았다 — 목록에
 * 배지 하나 띄우자고 스키마를 늘릴 일은 아니고, 제목에 티가 나면 충분하다.
 * 확인이 끝나면 협의회를 통째로 지우면 반과 응답까지 함께 사라진다.
 */

export const PRACTICE_TITLE = '연습용 협의회 (지워도 됩니다)'

const PRACTICE_CLASS_NAMES = ['연습 1반', '연습 2반']

export function isPracticeEvent(title: string): boolean {
  return title === PRACTICE_TITLE
}

/** 협의회 → 반 → 질문 순으로 만들고, 만들어진 협의회 id를 돌려준다. */
export async function createPracticeEvent(): Promise<string> {
  const today = new Date()

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      title: PRACTICE_TITLE,
      description: '기능을 확인해 보려고 만든 협의회입니다. 확인이 끝나면 지워 주세요.',
      date_range_start: format(today, 'yyyy-MM-dd'),
      // 주말을 빼고도 며칠은 남도록 넉넉히 잡는다
      date_range_end: format(addDays(today, 4), 'yyyy-MM-dd'),
      daily_start_time: '09:00',
      daily_end_time: '12:00',
      slot_duration_minutes: 30,
      break_minutes: 0,
      include_weekends: false,
    })
    .select('id')
    .single()
  if (eventError) throw new Error(eventError.message)

  const eventId = event.id as string

  // 반이 둘이어야 "반마다 담임 링크가 따로 나온다"는 것도 같이 확인된다
  const { error: classError } = await supabase
    .from('classes')
    .insert(PRACTICE_CLASS_NAMES.map((name) => ({ event_id: eventId, name })))
  if (classError) throw new Error(classError.message)

  const { data: questions, error: questionError } = await supabase
    .from('questions')
    .insert(
      PRESET_QUESTIONS.map((preset, order_index) => ({
        event_id: eventId,
        order_index,
        question_text: preset.question_text,
        question_type: preset.question_type,
      })),
    )
    .select('id, order_index')
  if (questionError) throw new Error(questionError.message)

  // 선택지는 질문 id가 나온 뒤에야 넣을 수 있다. 돌아온 순서를 믿지 않고 order_index로 짝짓는다.
  const options = questions.flatMap((row) =>
    PRESET_QUESTIONS[row.order_index as number].options.map((option_text, order_index) => ({
      question_id: row.id as string,
      option_text,
      order_index,
    })),
  )
  const { error: optionError } = await supabase.from('question_options').insert(options)
  if (optionError) throw new Error(optionError.message)

  return eventId
}
