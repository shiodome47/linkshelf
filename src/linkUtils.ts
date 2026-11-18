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
  // スキームが無いときは、ホスト名が半角の英数字のドメイン（example.com など）のときだけ URL とみなす。
  // 「今日は晴れ。明日も」のような文は、URL の決まりで「。」が「.」として読まれ、日本語のドメインに
  // 見えてしまうため（日本語のドメインは https:// から書けば URL になる）
  if (!hasScheme && !/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z][a-z0-9-]*(:\d+)?([/?#]|$)/i.test(text) && !/^localhost(:\d+)?([/?#]|$)/i.test(text)) {
    return null
  }
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

// ─── チェック項目 ───────────────────────────────────────────────

/** その日の日付を表す文字列（端末の時刻で YYYY-MM-DD） */
export function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * チェック項目がチェック済みか。
 * 毎日くり返す項目（repeat === 'daily'）は、今日（端末の時刻）チェックしたときだけ済みとする。
 */
export function isChecked(
  link: { kind?: string; checkedAt?: string; repeat?: string },
  now: Date = new Date(),
): boolean {
  if (link.kind !== 'check' || !link.checkedAt) return false
  if (link.repeat !== 'daily') return true
  const at = new Date(link.checkedAt)
  if (Number.isNaN(at.getTime())) return false
  return localDateKey(at) === localDateKey(now)
}

/**
 * 入力欄に打った文がチェック項目の書き方か。
 * 「[] 瞑想」「[ ] 瞑想」「□ 瞑想」は 1 回だけ、「[毎日] 瞑想」「[daily] 瞑想」は毎日くり返す。
 * 書き方に合わなければ null。
 */
export function parseCheckInput(input: string): { title: string; repeat?: 'daily' } | null {
  const text = input.trim()
  const daily = /^\[(?:毎日|daily)\]\s*(.+)$/i.exec(text)
  if (daily) return { title: daily[1].trim(), repeat: 'daily' }
  const once = /^(?:\[\s?\]|□|☐)\s*(.+)$/.exec(text)
  if (once) return { title: once[1].trim() }
  return null
}
