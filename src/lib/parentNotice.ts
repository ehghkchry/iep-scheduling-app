import { supabase } from './supabaseClient'

/**
 * 학부모님께 링크를 보내기 전에 상신하는 가정통신문 양식.
 *
 * 협의회마다 다른 게 아니라 앱 전체에 한 벌만 둔다. 그래서 협의회 안이 아니라
 * app_documents 표에 고정된 id 하나로 얹는다.
 *
 * 올리는 것도 받는 것도 app_owners에 적힌 사람만 할 수 있다(DB 정책).
 * 상신은 총괄교사가 하는 일이고, 그때는 로그인해 있다.
 */

const DOCUMENT_ID = 'parent_notice'
const BUCKET = 'documents'

/** 한글 문서를 기대하지만, 학교마다 pdf로 돌리는 곳도 있어 함께 받는다 */
export const ALLOWED_EXTENSIONS = ['.hwp', '.hwpx', '.pdf'] as const
export const MAX_BYTES = 10 * 1024 * 1024

export interface ParentNotice {
  fileName: string
  storagePath: string
  uploadedAt: string
}

export async function getParentNotice(): Promise<ParentNotice | null> {
  const { data, error } = await supabase
    .from('app_documents')
    .select('file_name, storage_path, uploaded_at')
    .eq('id', DOCUMENT_ID)
    .maybeSingle()

  if (error || !data) return null
  return {
    fileName: data.file_name as string,
    storagePath: data.storage_path as string,
    uploadedAt: data.uploaded_at as string,
  }
}

/**
 * 파일을 받아서 원래 이름으로 저장한다.
 *
 * 주소에 ?download=이름 을 붙이는 방법도 있지만, 그러면 한글 이름이
 * '%28%EC%96%91%EC%8B%9D%29…'처럼 인코딩된 채로 저장된다. 주소에 실으려면 인코딩을
 * 해야 하고, 서버는 그 값을 파일명 헤더에 그대로 옮겨 적기 때문이다.
 *
 * 그래서 파일을 먼저 받아온 뒤 이 브라우저 안에서 이름을 붙인다. a 태그의 download
 * 속성은 글자를 있는 그대로 쓰므로 한글이 깨지지 않는다. 통신문 한 건은 수십 KB라
 * 통째로 받아도 부담이 없다.
 */
export async function downloadParentNotice(notice: ParentNotice): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).download(notice.storagePath)
  if (error || !data) throw new Error(error?.message ?? '파일을 받지 못했습니다.')

  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = notice.fileName
  document.body.appendChild(link)
  link.click()
  link.remove()

  // 누르자마자 거둬들이면 브라우저가 저장을 시작하기 전에 주소가 사라질 수 있다
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot < 0 ? '' : fileName.slice(dot).toLowerCase()
}

/**
 * 파일을 올리고 기존 것을 지운다.
 *
 * 저장 경로에 시각을 붙이는 건 캐시 때문이다. 같은 이름에 덮어쓰면 CDN이 예전 파일을
 * 한동안 계속 내주어, 바꿔놓고도 옛날 통신문이 받아지는 일이 생긴다.
 */
export async function uploadParentNotice(file: File, userId: string): Promise<void> {
  const extension = extensionOf(file.name)
  const path = `${DOCUMENT_ID}/${Date.now()}${extension}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file)
  if (uploadError) throw new Error(uploadError.message)

  const previous = await getParentNotice()

  const { error: saveError } = await supabase.from('app_documents').upsert({
    id: DOCUMENT_ID,
    file_name: file.name,
    storage_path: path,
    uploaded_at: new Date().toISOString(),
    uploaded_by: userId,
  })
  if (saveError) {
    // 표에 못 적었으면 방금 올린 파일은 아무도 찾을 수 없다. 남겨두지 않는다.
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error(saveError.message)
  }

  // 새 파일이 자리를 잡은 뒤에 지운다. 먼저 지우면 그 사이에 받는 사람이 빈손이 된다.
  if (previous) await supabase.storage.from(BUCKET).remove([previous.storagePath])
}

export async function removeParentNotice(): Promise<void> {
  const current = await getParentNotice()
  if (!current) return

  const { error } = await supabase.from('app_documents').delete().eq('id', DOCUMENT_ID)
  if (error) throw new Error(error.message)

  await supabase.storage.from(BUCKET).remove([current.storagePath])
}
