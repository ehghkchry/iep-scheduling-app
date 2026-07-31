import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useEventContext } from './EventLayout'
import CopyLink from '../../components/CopyLink'
import type { ClassRow } from '../../lib/types'

export default function ClassManagementPage() {
  const { event } = useEventContext()

  const [classes, setClasses] = useState<ClassRow[] | null>(null)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadClasses = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('classes')
      .select('*')
      .eq('event_id', event.id)
      .order('name')

    if (queryError) setError(queryError.message)
    else setClasses(data as ClassRow[])
  }, [event.id])

  useEffect(() => {
    void loadClasses()
  }, [loadClasses])

  async function handleAdd(formEvent: FormEvent) {
    formEvent.preventDefault()
    const name = newName.trim()
    if (!name) return

    setError(null)
    setSaving(true)
    const { error: insertError } = await supabase
      .from('classes')
      .insert({ event_id: event.id, name })

    if (insertError) setError(insertError.message)
    else {
      setNewName('')
      await loadClasses()
    }
    setSaving(false)
  }

  async function handleDelete(classRow: ClassRow) {
    const confirmed = window.confirm(
      `'${classRow.name}'을(를) 삭제하면 그 반에 제출된 학부모 응답도 함께 지워집니다. 삭제할까요?`,
    )
    if (!confirmed) return

    const { error: deleteError } = await supabase.from('classes').delete().eq('id', classRow.id)
    if (deleteError) setError(deleteError.message)
    else await loadClasses()
  }

  const parentUrl = `${window.location.origin}/event/${event.parent_access_token}`

  return (
    <div className="stack stack--lg">
      <section className="card stack">
        <div>
          <h2>학부모님께 보낼 링크</h2>
          <p className="muted" style={{ marginTop: 4 }}>
            모든 학부모님께 이 링크 하나를 보내시면 됩니다. 들어가서 자녀의 반을 고르게 됩니다.
          </p>
        </div>
        {classes && classes.length === 0 ? (
          <div className="alert alert--info">
            반을 먼저 만들어 주세요. 반이 없으면 학부모님이 고를 수 있는 항목이 없습니다.
          </div>
        ) : (
          <CopyLink url={parentUrl} />
        )}
      </section>

      <section className="stack">
        <div>
          <h2>반 만들기</h2>
          <p className="muted" style={{ marginTop: 4 }}>
            반마다 담임 선생님 전용 링크가 만들어집니다. 그 링크로 어려운 시간을 막고, 나중에 학부모
            응답도 확인하실 수 있습니다.
          </p>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <form className="row" onSubmit={handleAdd}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="예) 1학년 2반"
            aria-label="반 이름"
          />
          <button className="btn btn--primary" type="submit" disabled={saving || !newName.trim()}>
            추가
          </button>
        </form>

        {!classes && <p className="muted">불러오는 중…</p>}

        {classes && classes.length === 0 && (
          <div className="empty">아직 만든 반이 없습니다.</div>
        )}

        {classes?.map((classRow) => (
          <div key={classRow.id} className="card stack stack--sm">
            <div className="row row--between">
              <h3>{classRow.name}</h3>
              <button
                className="btn btn--sm btn--danger"
                type="button"
                onClick={() => handleDelete(classRow)}
              >
                삭제
              </button>
            </div>
            <span className="tiny">담임 선생님께 보낼 링크</span>
            <CopyLink url={`${window.location.origin}/teacher/${classRow.teacher_access_token}`} />
          </div>
        ))}
      </section>
    </div>
  )
}
