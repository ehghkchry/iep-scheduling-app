import type { QuestionType } from './types'

/**
 * 학교마다 거의 똑같이 쓰는 질문들. 질문 만들기 화면에서 한 번 눌러 넣을 수 있고,
 * 연습용 협의회에도 이 두 개가 미리 들어간다.
 * 넣은 뒤 문구나 형식을 고치는 것은 일반 질문과 똑같이 할 수 있다.
 */
export const PRESET_QUESTIONS: {
  label: string
  question_text: string
  question_type: QuestionType
  options: string[]
}[] = [
  {
    label: '상담 방법',
    question_text: '상담 방법을 선택하세요.',
    question_type: 'single_choice',
    options: ['유선(전화)', '방문'],
  },
  {
    label: '개인정보 수집 동의',
    question_text:
      '[개인정보 수집 및 이용 동의] 수집된 정보(이름)는 협의회 종료 후 즉시 파기됩니다.',
    question_type: 'single_choice',
    options: ['동의', '동의하지 않음'],
  },
]

export type PresetQuestion = (typeof PRESET_QUESTIONS)[number]
