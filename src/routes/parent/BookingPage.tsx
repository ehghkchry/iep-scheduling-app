import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import { isTestMode, withTestMode } from '../../lib/testMode'
import TimeGrid from '../../components/TimeGrid/TimeGrid'
import TestModeBanner from '../../components/TestModeBanner'
import QuestionField from '../../components/QuestionForm/QuestionField'
import type { AnswerInput, ParentEventContext, ParentQuestion } from '../../lib/types'

interface BookingFormValues {
  studentName: string
  answers: Record<string, string | string[]>
  /** 고른 시간대의 slotKey 목록. 하나 이상이어야 제출할 수 있다. */
  slots: string[]
}

export default function BookingPage() {
  const { eventToken = '', classId = '' } = useParams<{ eventToken: string; classId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const testMode = isTestMode(searchParams)

  const [context, setContext] = useState<ParentEventContext | null>(null)
  const [className, setClassName] = useState<string>('')
  const [questions, setQuestions] = useState<ParentQuestion[]>([])
  const [blockedKeys, setBlockedKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<BookingFormValues>({
    defaultValues: { studentName: '', answers: {}, slots: [] },
  })
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = form

  const selectedSlots = watch('slots')
  const selectedKeys = useMemo(() => new Set(selectedSlots), [selectedSlots])

  /** 이미 고른 칸을 다시 누르면 선택이 풀린다 */
  function toggleSlot(date: string, time: string) {
    const key = slotKey(date, time)
    const next = selectedKeys.has(key)
      ? selectedSlots.filter((k) => k !== key)
      : [...selectedSlots, key]
    setValue('slots', next, { shouldValidate: true })
  }

  // 이미 이 브라우저에서 제출했다면 입력 화면 대신 확인 화면으로 보낸다.
  // 테스트 모드에서는 한 반에 여러 명을 넣어봐야 하므로 건너뛴다.
  useEffect(() => {
    if (testMode) return
    const stored = getStoredBookingToken(classId)
    if (stored) navigate(`/booking/${stored}`, { replace: true })
  }, [classId, navigate, testMode])

  const load = useCallback(async () => {
    try {
      // 넷 다 URL의 토큰만 있으면 부를 수 있다. 차례로 기다릴 이유가 없다 —
      // 서버가 싱가포르에 있어 왕복 한 번이 그대로 기다림으로 쌓인다.
      const [ctx, classes, questionRows, blocked] = await Promise.all([
        parentGetEventContext(eventToken),
        parentListClasses(eventToken),
        parentGetQuestions(eventToken),
        parentGetBlockedSlots(eventToken, classId),
      ])

      if (!ctx) {
        setInvalid(true)
        return
      }
      setContext(ctx)

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

    const slots = values.slots.map((key) => {
      const [slot_date, slot_start_time] = key.split('T')
      return { slot_date, slot_start_time }
    })

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
        slots,
        answers,
      })
      // 테스트 모드에서는 토큰을 남기지 않는다. 남기면 다음 학생을 넣을 수 없다.
      if (!testMode) storeBookingToken(classId, token)
      navigate(
        withTestMode(`/booking/${token}`, testMode, { event: eventToken, class: classId }),
        { replace: true },
      )
    } catch (err) {
      if (err instanceof SubmitBookingError && err.code === 'duplicate_student') {
        setError('studentName', { message: err.message })
        scrollToFirstInvalid()
        return
      }
      if (err instanceof SubmitBookingError && err.code === 'slot_unavailable') {
        // 다른 곳에서 방금 마감된 경우라 최신 상태를 다시 받아온다
        await load()
        setValue('slots', [])
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
    <>
      {testMode && <TestModeBanner />}

      <div className="page">
        <div className="page-header">
          <span className="badge">{className}</span>
          <h1>{context.title}</h1>
          {context.description && <p className="muted">{context.description}</p>}
        </div>

        <FormProvider {...form}>
          <form className="stack stack--lg" onSubmit={handleSubmit(onValid, scrollToFirstInvalid)}>
            <section
              className={`card stack stack--sm ${errors.studentName ? 'card--invalid' : ''}`}
              data-invalid={errors.studentName ? true : undefined}
            >
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

            {questions.map((question) => (
              <QuestionField key={question.question_id} question={question} />
            ))}

            <section
              className={`stack ${errors.slots ? 'grid-invalid' : ''}`}
              data-invalid={errors.slots ? true : undefined}
            >
              <h2>희망하시는 상담 시간대를 모두 선택해 주세요.(여러 개 고르실 수 있습니다)</h2>

              <input
                type="hidden"
                {...register('slots', {
                  validate: (value) =>
                    value.length > 0 || '희망하시는 시간대를 하나 이상 선택해 주세요.',
                })}
              />

              <TimeGrid
                grid={grid}
                mode="parent-select"
                blockedKeys={blockedKeys}
                selectedKeys={selectedKeys}
                onSelect={toggleSlot}
              />

              <div className="row row--between">
                <span className="tiny">
                  {selectedSlots.length > 0
                    ? `${selectedSlots.length}개 선택하셨습니다. 다시 누르면 선택이 풀립니다.`
                    : '가능한 시간을 눌러 선택해 주세요.'}
                </span>
                {selectedSlots.length > 0 && (
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => setValue('slots', [], { shouldValidate: true })}
                  >
                    전체 해제
                  </button>
                )}
              </div>

              {errors.slots && <span className="field-error">{errors.slots.message}</span>}
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
    </>
  )
}
