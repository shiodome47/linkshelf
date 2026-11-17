import { isSafeUrl } from './utils/url'

/**
 * 入力された文字列をリンクの URL にする。
 * 「example.com/page」のようにスキームが無いときは https:// を補う。
 * 開けない URL（javascript: など）や URL として読めないものは null。
 */
export function normalizeLinkInput(input: string): string | null {
  const text = input.trim()
  if (!text || /\s/.test(text)) return null
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text)
  const candidate = hasScheme ? text : `https://${text}`
  if (!isSafeUrl(candidate)) return null
  // ドメインに「.」が無いもの（例: "hello"）は打ち間違いとみなす（localhost は許可）
  const host = new URL(candidate).hostname
  if (!host.includes('.') && host !== 'localhost') return null
  return candidate
}

/** URL から仮のタイトルを作る（例: https://www.example.com/a → example.com） */
export function titleFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * 名前が「仮の名前」のままか（サイト名や URL そのもの）。
 * まとめて取り直すとき、自分で付けた名前と見分けるのに使う。
 */
export function isPlaceholderTitle(title: string, url: string): boolean {
  const t = title.trim().toLowerCase().replace(/\/$/, '')
  if (!t) return true
  const host = titleFromUrl(url).toLowerCase()
  const bare = url.trim().toLowerCase().replace(/\/$/, '')
  return t === host || t === `www.${host}` || t === bare || t === bare.replace(/^https?:\/\//, '')
}

/**
 * 並列数を絞って順に処理する（タイトルの取得を一度に投げすぎないため）。
 * onEach は 1 件終わるごとに呼ぶ。signal で途中でやめられる。
 */
export async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  onEach?: (item: T, result: R) => void,
  signal?: AbortSignal,
): Promise<void> {
  let next = 0
  const worker = async () => {
    while (next < items.length && !signal?.aborted) {
      const item = items[next++]
      const result = await fn(item)
      if (signal?.aborted) return
      onEach?.(item, result)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

/**
 * サイトのアイコン（/favicon.ico）の URL。
 * http のサイトは null（混在コンテンツを避けるため。画面では頭文字で代用する）。
 * 外部のアイコン取得サービスは使わない（見ているサイトの一覧を第三者に渡さないため）。
 */
export function faviconUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null
    return `${parsed.origin}/favicon.ico`
  } catch {
    return null
  }
}

/** 1 行のテキストの名前（長ければ 60 字で切る） */
export function oneLineTitle(text: string): string {
  const t = text.trim()
  return t.length > 60 ? `${t.slice(0, 60)}…` : t
}

/**
 * 1 行のテキスト（カードの入力欄から打ったもの）か。
 * 本文が 1 行で、名前が本文そのもの（長いときは切ったもの）なら、その場で書き換えられる。
 */
export function isOneLineText(link: { kind?: string; title: string; text?: string }): boolean {
  if (link.kind !== 'text') return false
  const text = link.text ?? ''
  return text.trim() !== '' && !text.includes('\n') && link.title === oneLineTitle(text)
}

/** 画像だとみなす拡張子 */
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif)$/i

/** URL のパスが画像の拡張子（.jpg / .jpeg / .png / .webp / .gif）で終わるか */
export function isImageUrl(url: string): boolean {
  try {
    return IMAGE_EXTENSIONS.test(new URL(url).pathname)
  } catch {
    return false
  }
}
