import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { EMPTY_SLOT_GRID, formatSlotLabel, generateSlotGrid, slotKey } from '../../lib/slots'
import { useEventContext } from './EventLayout'
import TimeGrid from '../../components/TimeGrid/TimeGrid'

/**
 * 관리교사가 모든 반에 공통으로 막을 시간을 정하는 화면.
 *
 * 조작법은 담임 선생님의 '가능한 시간 정하기'와 똑같다 — 칸을 누르면 바로 저장된다.
 * 여기서 막은 시간은 담임 선생님이 열 수 없고(서버가 거절한다), 학부모님께는 그냥
 * 마감으로 보인다.
 */
export default function BlockedSlotsPage() {
  const { event } = useEventContext()

  const [blockedKeys, setBlockedKeys] = useState<Set<string> | null>(null)
  const [excludedDates, setExcludedDates] = useState<string[]>([])
  /** 칸마다 그 시간을 희망한 학생 수. 막기 전에 몇 명이 걸리는지 알려주는 데 쓴다. */
  const [wishCountByKey, setWishCountByKey] = useState<Map<string, number>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [blockedResult, excludedResult, slotResult] = await Promise.all([
      supabase
        .from('event_blocked_slots')
        .select('slot_date, slot_start_time')
        .eq('event_id', event.id),
      supabase.from('event_excluded_dates').select('excluded_date').eq('event_id', event.id),
      supabase
        .from('booking_slots')
        .select('slot_date, slot_start_time, bookings!inner(event_id)')
        .eq('bookings.event_id', event.id),
    ])

    if (blockedResult.error) return setError(blockedResult.error.message)
    if (excludedResult.error) return setError(excludedResult.error.message)
    if (slotResult.error) return setError(slotResult.error.message)

    setBlockedKeys(
      new Set((blockedResult.data ?? []).map((s) => slotKey(s.slot_date, s.slot_start_time))),
    )
    setExcludedDates((excludedResult.data ?? []).map((row) => row.excluded_date as string))

    const counts = new Map<string, number>()
    for (const slot of slotResult.data ?? []) {
      const key = slotKey(slot.slot_date, slot.slot_start_time)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    setWishCountByKey(counts)
  }, [event.id])

  useEffect(() => {
    void load()
  }, [load])

  const grid = useMemo(
    () => (blockedKeys ? generateSlotGrid({ ...event, excluded_dates: excludedDates }) : EMPTY_SLOT_GRID),
    [event, excludedDates, blockedKeys],
  )

  async function handleToggle(date: string, time: string) {
    const key = slotKey(date, time)
    const nextBlocked = !blockedKeys?.has(key)

    // 이미 그 시간을 희망한 학생이 있으면, 몇 명이 걸리는지 보고 정하시게 한다
    const wishes = wishCountByKey.get(key) ?? 0
    if (nextBlocked && wishes > 0) {
      const confirmed = window.confirm(
        `${formatSlotLabel(date, time)}을(를) 막습니다.\n\n` +
          `이미 이 시간을 희망한 학생이 ${wishes}명 있습니다. 신청 내용이 지워지지는 않지만, ` +
          `이 시간은 닫히고 담임 선생님도 다시 열 수 없습니다.\n\n막을까요?`,
      )
      if (!confirmed) return
    }

    setError(null)
    setBusy(true)
    try {
      if (nextBlocked) {
        const { error: insertError } = await supabase
          .from('event_blocked_slots')
          .insert({ event_id: event.id, slot_date: date, slot_start_time: time })
        if (insertError) throw new Error(insertError.message)
      } else {
        const { error: deleteError } = await supabase
          .from('event_blocked_slots')
          .delete()
          .eq('event_id', event.id)
          .eq('slot_date', date)
          .eq('slot_start_time', time)
        if (deleteError) throw new Error(deleteError.message)
      }

      setBlockedKeys((prev) => {
        const next = new Set(prev)
        if (nextBlocked) next.add(key)
        else next.delete(key)
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (!blockedKeys) return <p className="muted">불러오는 중…</p>

  return (
    <div className="stack">
      <div>
        <h2>모든 반 마감</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          점심시간이나 전교직원 회의처럼 어느 반도 상담할 수 없는 시간을 미리 막아둡니다. 여기서
          막은 시간은 <strong>담임 선생님이 열 수 없고</strong>, 학부모님께도 보이지 않습니다.
        </p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="alert alert--info">
        반별로 어려운 시간을 정하는 것은 담임 선생님 몫입니다. 여기서는 <strong>전체에 공통으로</strong>{' '}
        해당하는 시간만 막아 주세요.
      </div>

      <TimeGrid
        grid={grid}
        mode="teacher-edit"
        blockedKeys={blockedKeys}
        busy={busy}
        onToggleBlocked={(date, time) => void handleToggle(date, time)}
      />

      <p className="tiny">누르는 즉시 저장됩니다. 다시 누르면 풀립니다.</p>
    </div>
  )
}
