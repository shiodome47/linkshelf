import { useLinkShelf } from './context'
import { useMessages } from './i18n'
import { useOptions } from './options'
import { isSafeUrl } from './utils/url'
import type { Link } from './types'

/** 受け付ける画像の種類 */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** 貼り付けたもの・落としたものの中から、受け付ける画像を 1 つ取り出す（無ければ null） */
export function imageFileOf(data: DataTransfer | null): File | null {
  if (!data) return null
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === 'file' && IMAGE_TYPES.includes(item.type)) {
      const file = item.getAsFile()
      if (file) return file
    }
  }
  for (const file of Array.from(data.files ?? [])) {
    if (IMAGE_TYPES.includes(file.type)) return file
  }
  return null
}

/**
 * 大きな画像を、長い辺が maxSide に収まるよう縮める（WebP、使えなければ JPEG）。
 * 小さい画像（1MB 未満で maxSide 以内）や、縮められない環境では、そのまま返す。
 */
export async function shrinkImage(file: File, maxSide: number, quality = 0.85): Promise<File> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 1024 * 1024) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
    let blob = await toBlob('image/webp')
    if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg')
    if (!blob) return file
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], file.name.replace(/\.[^.]*$/, '') + `.${ext}`, { type: blob.type })
  } catch {
    return file
  }
}

/** 今日の日付（YYYY/MM/DD） */
export function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 画像を置く（縮める → uploadImage に渡す → 返ってきた URL でカードの末尾にリンクを足す）。
 * カードの「画像を追加」と、どこでも貼り付けの両方で使う。失敗したら Error（message は画面に出せる言葉）
 */
export function useImagePlacer(): ((file: File, categoryId: string) => Promise<Link>) | null {
  const { addLink } = useLinkShelf()
  const { uploadImage, imageMaxSide } = useOptions()
  const m = useMessages()
  if (!uploadImage) return null
  return async (file, categoryId) => {
    if (!IMAGE_TYPES.includes(file.type)) throw new Error(m.imageOnly)
    const prepared = imageMaxSide ? await shrinkImage(file, imageMaxSide) : file
    let result: { url: string; title?: string }
    try {
      result = await uploadImage(prepared, { categoryId })
    } catch (e) {
      const detail = e instanceof Error && e.message && e.message.length <= 80 ? e.message : ''
      throw new Error(m.uploadFailed(detail))
    }
    // 相対の URL（/images/a.jpg など）は、今のページを基準にして絶対の URL にする
    const url = typeof location !== 'undefined' ? new URL(result.url, location.href).toString() : result.url
    if (!isSafeUrl(url)) throw new Error(m.uploadFailed(''))
    return addLink({ categoryId, title: result.title?.trim() || m.imageTitle(todayString()), url })
  }
}
