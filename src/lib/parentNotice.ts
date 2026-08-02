import { supabase } from './supabaseClient'

/**
 * 학부모님께 링크를 보내기 전에 상신하는 가정통신문 양식.
 *
 * 협의회마다 다른 게 아니라 앱 전체에 한 벌만 둔다. 그래서 협의회 안이 아니라
 * app_documents 표에 고정된 id 하나로 얹는다.
 *
 * 올리는 건 app_owners에 적힌 사람만(DB 정책), 받는 건 누구나 할 수 있다.
 * 각 학급 특수교사는 로그인하지 않고 반 링크로만 들어오기 때문이다.
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
 * 내려받기 주소.
 *
 * download 옵션을 주면 브라우저가 새 탭에서 열지 않고 원래 파일명 그대로 저장한다.
 * 이게 없으면 저장 이름이 storage_path의 임의 문자열이 되어 무슨 파일인지 알 수 없다.
 */
export function parentNoticeUrl(notice: ParentNotice): string {
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(notice.storagePath, { download: notice.fileName })
  return data.publicUrl
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
