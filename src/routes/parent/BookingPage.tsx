import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import {
  SubmitBookingError,
  parentGetBlockedSlots,
  parentGetEventContext,
  parentGetQuestions,
  parentListClasses,
  parentSubmitBooking,
} from '../../lib/rpc'
import { EMPTY_SLOT_GRID, generateSlotGrid, slotKey } from '../../lib/slots'
import { getStoredBookingToken, storeBookingToken } from '../../lib/bookingStorage'
import TimeGrid from '../../components/TimeGrid/TimeGrid'
import QuestionField from '../../components/QuestionForm/QuestionField'
import type { AnswerInput, ParentEventContext, ParentQuestion } from '../../lib/types'

interface BookingFormValues {
  studentName: string
  answers: Record<string, string | string[]>
  /** slotKey 형식. 시간을 고르지 않으면 빈 문자열 */
  slot: string
}

export default function BookingPage() {
  const { eventToken = '', classId = '' } = useParams<{ eventToken: string; classId: string }>()
  const navigate = useNavigate()

  const [context, setContext] = useState<ParentEventContext | null>(null)
  const [className, setClassName] = useState<string>('')
  const [questions, setQuestions] = useState<ParentQuestion[]>([])
  const [blockedKeys, setBlockedKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<BookingFormValues>({
    defaultValues: { studentName: '', answers: {}, slot: '' },
  })
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = form

  const selectedKey = watch('slot')

  // 이미 이 브라우저에서 제출했다면 입력 화면 대신 확인 화면으로 보낸다
  useEffect(() => {
    const stored = getStoredBookingToken(classId)
    if (stored) navigate(`/booking/${stored}`, { replace: true })
  }, [classId, navigate])

  const load = useCallback(async () => {
    try {
      const ctx = await parentGetEventContext(eventToken)
      if (!ctx) {
        setInvalid(true)
        return
      }
      setContext(ctx)

      const [classes, questionRows, blocked] = await Promise.all([
        parentListClasses(eventToken),
        parentGetQuestions(eventToken),
        parentGetBlockedSlots(eventToken, classId),
      ])

      const matched = classes.find((row) => row.class_id === classId)
      if (!matched) {
        setInvalid(true)
        return
      }

      setClassName(matched.class_name)
      setQuestions(questionRows)
      setBlockedKeys(new Set(blocked.map((s) => slotKey(s.slot_date, s.slot_start_time))))
    } catch {
      setInvalid(true)
    } finally {
      setLoading(false)
    }
  }, [eventToken, classId])

  useEffect(() => {
    void load()
  }, [load])

  const grid = useMemo(() => (context ? generateSlotGrid(context) : EMPTY_SLOT_GRID), [context])

  /** 답하지 않은 첫 항목으로 화면을 옮겨 어디가 빠졌는지 바로 보이게 한다. */
  function scrollToFirstInvalid() {
    // 브라우저가 오류 표시를 그린 뒤에 찾아야 한다
    requestAnimationFrame(() => {
      const target = document.querySelector('[data-invalid]')
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  async function onValid(values: BookingFormValues) {
    setSubmitError(null)

    const [slotDate, slotTime] = values.slot.split('T')
    const answers: AnswerInput[] = questions.map((question) => {
      const raw = values.answers?.[question.question_id] ?? ''
      // 체크박스가 하나뿐인 복수선택 질문은 react-hook-form이 배열 대신 문자열을 준다.
      // 저장되는 모양이 질문마다 달라지지 않도록 여기서 배열로 맞춘다.
      const value =
        question.question_type === 'multi_choice' && !Array.isArray(raw)
          ? raw
            ? [raw]
            : []
          : raw
      return { question_id: question.question_id, value }
    })

    try {
      const token = await parentSubmitBooking({
        token: eventToken,
        classId,
        studentName: values.studentName,
        slotDate,
        slotStartTime: slotTime,
        answers,
      })
      storeBookingToken(classId, token)
      navigate(`/booking/${token}`, { replace: true })
    } catch (err) {
      if (err instanceof SubmitBookingError && err.code === 'duplicate_student') {
        setError('studentName', { message: err.message })
        scrollToFirstInvalid()
        return
      }
      if (err instanceof SubmitBookingError && err.code === 'slot_unavailable') {
        // 다른 곳에서 방금 마감된 경우라 최신 상태를 다시 받아온다
        await load()
        setValue('slot', '')
      }
      setSubmitError(err instanceof Error ? err.message : '제출하지 못했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="page page--narrow">
        <p className="muted">불러오는 중…</p>
      </div>
    )
  }

  if (invalid || !context) {
    return (
      <div className="page page--narrow">
        <div className="card stack">
          <h1>링크를 확인해 주세요</h1>
          <p className="muted">
            주소가 잘못되었거나 협의회가 종료되었습니다. 학교에서 받으신 링크를 다시 확인해 주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <span className="badge">{className}</span>
        <h1>{context.title}</h1>
        {context.description && <p className="muted">{context.description}</p>}
      </div>

      <FormProvider {...form}>
        <form className="stack stack--lg" onSubmit={handleSubmit(onValid, scrollToFirstInvalid)}>
          <section className="card stack stack--sm" data-invalid={errors.studentName ? true : undefined}>
            <label className="label" htmlFor="student-name">
              학생 이름은 무엇인가요?<span className="required-mark">*</span>
            </label>
            <input
              id="student-name"
              className={`input ${errors.studentName ? 'input--error' : ''}`}
              {...register('studentName', {
                validate: (value) => value.trim().length > 0 || '학생 이름을 입력해 주세요.',
              })}
            />
            {errors.studentName && (
              <span className="field-error">{errors.studentName.message}</span>
            )}
          </section>

          {questions.map((question, index) => (
            <QuestionField key={question.question_id} question={question} index={index + 1} />
          ))}

          <section className="stack" data-invalid={errors.slot ? true : undefined}>
            <div>
              <h2>
                희망하시는 시간을 선택해 주세요<span className="required-mark">*</span>
              </h2>
              <p className="muted" style={{ marginTop: 4 }}>
                협의회는 <strong>{context.slot_duration_minutes}분</strong> 진행됩니다. 빗금 친 칸은
                선생님이 마감한 시간입니다. 다른 학부모님과 시간이 겹쳐도 괜찮습니다.
              </p>
            </div>

            <input type="hidden" {...register('slot', { required: '시간을 선택해 주세요.' })} />

            <TimeGrid
              grid={grid}
              mode="parent-select"
              blockedKeys={blockedKeys}
              selectedKey={selectedKey || null}
              onSelect={(date, time) =>
                setValue('slot', slotKey(date, time), { shouldValidate: true })
              }
            />

            {errors.slot && <span className="field-error">{errors.slot.message}</span>}
          </section>

          {submitError && <div className="alert alert--error">{submitError}</div>}

          <button className="btn btn--primary btn--block" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '제출 중…' : '제출하기'}
          </button>

          <p className="tiny" style={{ textAlign: 'center' }}>
            제출한 뒤에는 내용을 고칠 수 없습니다. 확인 후 눌러주세요.
          </p>
        </form>
      </FormProvider>
    </div>
  )
}
