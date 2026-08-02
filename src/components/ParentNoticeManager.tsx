import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { formatDateLong } from '../lib/slots'
import {
  ALLOWED_EXTENSIONS,
  MAX_BYTES,
  extensionOf,
  getParentNotice,
  parentNoticeUrl,
  removeParentNotice,
  uploadParentNotice,
} from '../lib/parentNotice'
import type { ParentNotice } from '../lib/parentNotice'

/**
 * 가정통신문 양식을 올리고 바꾸는 자리. 앱 관리자에게만 보인다.
 *
 * 협의회 목록 화면에 두는 건 이 파일이 협의회마다 따로 있는 게 아니라 앱 전체에
 * 하나뿐이기 때문이다. 특정 협의회 안에 두면 협의회마다 다른 통신문이 있는 것처럼 읽힌다.
 */
export default function ParentNoticeManager() {
  const { session, isAppOwner } = useAuth()

  const [notice, setNotice] = useState<ParentNotice | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setNotice(await getParentNotice())
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!isAppOwner) return null

  async function handleFile(file: File) {
    setError(null)

    const extension = extensionOf(file.name)
    if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
      setError(`${ALLOWED_EXTENSIONS.join(', ')} 파일만 올릴 수 있습니다.`)
      return
    }
    if (file.size > MAX_BYTES) {
      setError('파일이 너무 큽니다. 10MB까지 올릴 수 있습니다.')
      return
    }

    setBusy(true)
    try {
      await uploadParentNotice(file, session!.user.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일을 올리지 못했습니다.')
    } finally {
      setBusy(false)
      // 같은 파일을 고쳐서 다시 고르는 경우에도 변경으로 잡히도록 비워둔다
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemove() {
    if (!window.confirm('가정통신문 양식을 내릴까요?\n\n첫 화면의 받기 링크도 함께 사라집니다.'))
      return

    setBusy(true)
    setError(null)
    try {
      await removeParentNotice()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일을 내리지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    // 아래 협의회 목록과 붙지 않게 여백을 둔다. 관리자가 아니면 위에서 null로 빠지므로
    // 빈 자리가 남지 않는다.
    <section className="card stack stack--sm" style={{ marginBottom: 32 }}>
      <div>
        <h2>가정통신문 양식</h2>
        <p className="tiny">
          학부모님께 링크를 보내기 전에 상신하실 통신문입니다. 첫 화면에서 누구나 받을 수 있고,
          올리고 바꾸는 것은 관리자만 할 수 있습니다.
        </p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {notice ? (
        <div className="row row--between">
          <span className="tiny">
            <a href={parentNoticeUrl(notice)}>{notice.fileName}</a>
            {` · ${formatDateLong(notice.uploadedAt)}에 올림`}
          </span>
          <button
            className="btn btn--sm btn--ghost"
            type="button"
            onClick={() => void handleRemove()}
            disabled={busy}
          >
            내리기
          </button>
        </div>
      ) : (
        <p className="tiny">아직 올린 파일이 없습니다.</p>
      )}

      <div>
        <label className="btn btn--sm" htmlFor="parent-notice-file">
          {busy ? '올리는 중…' : notice ? '다른 파일로 바꾸기' : '파일 올리기'}
        </label>
        <input
          ref={fileInputRef}
          id="parent-notice-file"
          type="file"
          className="visually-hidden"
          accept={ALLOWED_EXTENSIONS.join(',')}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
      </div>
    </section>
  )
}
