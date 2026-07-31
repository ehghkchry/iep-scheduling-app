import type { AnswerView } from '../lib/types'

/** 제출된 답변을 담임교사 결과 화면과 학부모 확인 화면이 같은 모양으로 보여준다. */
export default function AnswerList({ answers }: { answers: AnswerView[] }) {
  if (answers.length === 0) {
    return <p className="tiny">등록된 질문이 없습니다.</p>
  }

  return (
    <dl className="answer-list">
      {answers.map((answer, index) => (
        <div key={index} className="answer-list__item">
          <dt>{answer.question_text}</dt>
          <dd>
            {Array.isArray(answer.value)
              ? answer.value.length > 0
                ? answer.value.join(', ')
                : '(응답 없음)'
              : answer.value || '(응답 없음)'}
          </dd>
        </div>
      ))}
    </dl>
  )
}
