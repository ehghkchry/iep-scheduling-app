import { useEffect, useState } from 'react'

/** 선생님이 링크를 복사해서 카톡/문자로 보내는 게 이 앱의 핵심 동선이라 눈에 띄게 만든다. */
export default function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // 클립보드 권한이 없는 환경(구형 브라우저, http 접속 등)에서는 직접 복사하도록 둔다
      window.prompt('아래 주소를 복사해 주세요', url)
    }
  }

  return (
    <div className="link-box">
      <code>{url}</code>
      <button
        type="button"
        className={`btn btn--sm ${copied ? 'btn--primary' : ''}`}
        onClick={handleCopy}
      >
        {copied ? '복사됨' : '복사'}
      </button>
    </div>
  )
}
