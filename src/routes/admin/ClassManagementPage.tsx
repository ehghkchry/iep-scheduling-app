import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { isPracticeEvent } from '../../lib/practiceEvent'
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
      {isPracticeEvent(event.title) && (
        <div className="alert alert--info">
          <strong>연습용 협의회입니다.</strong> 무엇이든 눌러보셔도 됩니다. 확인이 끝나면{' '}
          <Link to={`/admin/events/${event.id}/settings`}>협의회 설정</Link>에서 통째로 지워 주세요.
        </div>
      )}

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
          <>
            <CopyLink url={parentUrl} />

            {/*
              신청해 보는 버튼은 연습용 협의회에만 둔다.

              이 버튼으로 낸 신청은 진짜 신청과 똑같이 저장되어 담임 선생님 결과 화면에
              학생 한 명으로 올라간다. 그런데 앱에는 신청을 한 건만 지우는 길이 없다 —
              협의회를 통째로 지우거나 그 반을 지우는 수밖에 없고, 실전 협의회에서 그건
              진짜 신청까지 함께 버리는 일이다. 그래서 실전에서는 아예 내주지 않는다.
            */}
            {isPracticeEvent(event.title) ? (
              <>
                <hr className="divider" />

                <div>
                  <h3>학부모가 되어 신청해 보고 결과 확인하기</h3>
                  <p className="muted" style={{ marginTop: 4 }}>
                    학부모님이 보시는 화면이 그대로 열립니다. 직접 신청해 보시고, 담임 선생님
                    링크나 결과 탭에서 그 신청이 어떻게 나오는지 확인하실 수 있습니다. 한 반에
                    여러 명을 넣어보시면 이름이 색깔별로 어떻게 쌓이는지도 보입니다.
                  </p>
                </div>
                <div className="alert alert--info">
                  여기서 신청한 내용도 <strong>실제로 저장됩니다.</strong> 확인이 끝나면 이
                  협의회를 통째로 지워 주세요.
                </div>
                <div>
                  <a
                    className="btn btn--primary"
                    href={`${parentUrl}?test=1`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    학부모 화면으로 신청해 보기
                  </a>
                </div>
              </>
            ) : (
              <p className="tiny">
                이 링크를 그대로 열어보시면 학부모님 화면을 미리 보실 수 있습니다. 직접 신청까지
                해 보시려면 <Link to="/admin">협의회 목록</Link>에서 연습용 협의회를 만들어
                쓰세요. 여기서 신청하면 <strong>진짜 신청으로 남고, 한 건만 따로 지울 수는
                없습니다.</strong>
              </p>
            )}
          </>
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
