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
import { addStoredBooking } from '../../lib/bookingStorage'
import { eventEntryPath } from '../../lib/parentLinks'
import TimeGrid from '../../components/TimeGrid/TimeGrid'
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

  /*
   * 이 화면에는 "이미 냈는지"를 따지는 장치가 없다.
   *
   * 예전에는 이미 제출한 반이면 확인 화면으로 되돌려보냈다. 실수로 두 번 내는 걸
   * 막으려는 것이었는데, 이제 학부모 링크를 누르면 신청 목록이 먼저 나온다.
   * 여기까지 왔다는 건 목록에서 '추가 신청하기'를 눌러 반을 고른 것이므로,
   * 새로 내려는 뜻이 이미 분명하다.
   */

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
      addStoredBooking(classId, token, values.studentName)
      // 낸 내용을 바로 펼치는 대신 목록으로 보낸다. 자녀가 여럿이면 다음 아이를
      // 이어서 넣어야 하고, 방금 낸 아이 것은 목록에서 이름을 눌러 보면 된다.
      navigate(eventEntryPath(eventToken, { justSubmitted: true }), { replace: true })
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
              {/*
                "희망하는 시간"이 아니라 "가능한 시간"이다. 학부모가 낸 시간들 중에서
                담임 선생님이 하나를 정하는 방식이라, 넓게 받아둘수록 서로 맞는 시간을
                찾기 쉽다.

                다만 그 사정을 "많이 고르실수록 좋습니다"라고 적으면 학부모에게 시키는
                말이 된다. 아쉬운 쪽은 시간을 맞춰야 하는 학교이므로, 부탁하고 저희가
                맞춰보겠다는 쪽으로 적는다.

                앞의 '가능한'은 학부모가 낼 수 있는 시간, 뒤의 '가능한'은 학교 쪽 사정이다.
                같은 말이지만 주어가 달라 겹쳐 읽히지 않는다.
              */}
              <div className="stack stack--sm">
                <h2>상담이 가능한 시간을 모두 선택해 주세요.</h2>
                <p className="tiny">
                  여러 시간을 알려주시면 그중에서 가능한 시간으로 연락드리겠습니다.
                </p>
              </div>

              <input
                type="hidden"
                {...register('slots', {
                  validate: (value) =>
                    value.length > 0 || '상담이 가능한 시간을 하나 이상 선택해 주세요.',
                })}
              />

              <TimeGrid
                grid={grid}
                mode="parent-select"
                blockedKeys={blockedKeys}
                selectedKeys={selectedKeys}
                onSelect={toggleSlot}
              />

              {/*
                아직 아무것도 안 고른 상태에서는 이 줄을 아예 두지 않는다. 예전에는
                "가능한 시간을 눌러 선택해 주세요"가 있었는데, 바로 위 제목이 이미
                같은 말을 하고 있어 표를 사이에 두고 두 번 읽히기만 했다.
              */}
              {selectedSlots.length > 0 && (
                <div className="row row--between">
                  <span className="tiny">
                    {selectedSlots.length}개 선택하셨습니다. 다시 누르면 선택이 풀립니다.
                  </span>
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => setValue('slots', [], { shouldValidate: true })}
                  >
                    전체 해제
                  </button>
                </div>
              )}

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
