import { useFormContext } from 'react-hook-form'
import { hasOptions } from '../../lib/types'
import type { ParentQuestion } from '../../lib/types'

/**
 * 질문 하나를 유형에 맞는 입력 요소로 그린다.
 * 모든 질문이 필수이므로 검증 규칙은 여기서 일괄로 건다.
 */
export default function QuestionField({ question }: { question: ParentQuestion }) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext()

  const name = `answers.${question.question_id}`
  const error = (errors.answers as Record<string, { message?: string }> | undefined)?.[
    question.question_id
  ]
  const invalid = Boolean(error)
  const currentValue = watch(name)

  // 안내 문구는 값의 모양이 아니라 질문 유형으로 정한다.
  // 값의 모양은 선택지 개수에 따라 배열이 되기도 문자열이 되기도 해서 들쭉날쭉해진다.
  const emptyMessage = hasOptions(question.question_type)
    ? '선택해 주세요.'
    : '답변을 입력해 주세요.'

  const rules = {
    validate: (value: unknown) => {
      const filled = Array.isArray(value)
        ? value.length > 0
        : typeof value === 'string' && value.trim().length > 0
      return filled || emptyMessage
    },
  }

  return (
    <div
      className={`card stack stack--sm ${invalid ? 'card--invalid' : ''}`}
      data-invalid={invalid || undefined}
    >
      <label className="label" htmlFor={`${name}-input`}>
        {question.question_text}
        <span className="required-mark">*</span>
      </label>

      {question.question_type === 'short_text' && (
        <input
          id={`${name}-input`}
          className={`input ${invalid ? 'input--error' : ''}`}
          {...register(name, rules)}
        />
      )}

      {question.question_type === 'paragraph' && (
        <textarea
          id={`${name}-input`}
          className={`textarea ${invalid ? 'textarea--error' : ''}`}
          {...register(name, rules)}
        />
      )}

      {question.question_type === 'dropdown' && (
        <select
          id={`${name}-input`}
          className={`select ${invalid ? 'select--error' : ''}`}
          defaultValue=""
          {...register(name, rules)}
        >
          <option value="" disabled>
            선택해 주세요
          </option>
          {question.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {question.question_type === 'single_choice' && (
        <div className="stack stack--sm">
          {question.options.map((option, optionIndex) => (
            <label
              key={option}
              className={`choice ${currentValue === option ? 'choice--selected' : ''} ${
                invalid ? 'choice--error' : ''
              }`}
            >
              <input
                type="radio"
                value={option}
                id={optionIndex === 0 ? `${name}-input` : undefined}
                {...register(name, rules)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}

      {question.question_type === 'multi_choice' && (
        <div className="stack stack--sm">
          {question.options.map((option, optionIndex) => (
            <label
              key={option}
              className={`choice ${
                // 선택지가 하나뿐이면 배열이 아니라 문자열이 온다
                (Array.isArray(currentValue) ? currentValue.includes(option) : currentValue === option)
                  ? 'choice--selected'
                  : ''
              } ${invalid ? 'choice--error' : ''}`}
            >
              <input
                type="checkbox"
                value={option}
                id={optionIndex === 0 ? `${name}-input` : undefined}
                {...register(name, rules)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}

      {invalid && <span className="field-error">{error?.message ?? emptyMessage}</span>}
    </div>
  )
}
