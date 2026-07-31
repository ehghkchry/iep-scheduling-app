import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabaseClient'
import EventForm from '../../components/EventForm'
import type { EventFormValues } from '../../components/EventForm'

export default function EventCreatePage() {
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')

  async function handleSubmit(values: EventFormValues) {
    const { data, error } = await supabase
      .from('events')
      .insert({
        title: values.title,
        description: values.description || null,
        date_range_start: values.date_range_start,
        date_range_end: values.date_range_end,
        daily_start_time: values.daily_start_time,
        daily_end_time: values.daily_end_time,
        slot_duration_minutes: values.slot_duration_minutes,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    navigate(`/admin/events/${data.id}/classes`, { replace: true })
  }

  return (
    <div className="page">
      <div className="page-header">
        <Link className="tiny" to="/admin">
          ← 목록으로
        </Link>
        <h1>새 협의회 만들기</h1>
        <p className="muted">
          날짜와 시간대를 정하면, 다음 단계에서 반을 만들고 담임 선생님께 보낼 링크를 받게 됩니다.
        </p>
      </div>

      <EventForm
        submitLabel="만들기"
        onSubmit={handleSubmit}
        initial={{
          title: '',
          description: '',
          date_range_start: today,
          date_range_end: today,
          daily_start_time: '09:00',
          daily_end_time: '17:00',
          slot_duration_minutes: 30,
        }}
      />
    </div>
  )
}
