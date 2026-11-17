/**
 * URL が安全に開けるものか（http: と https: だけ）。
 * javascript: スキームなどの危険な URL をはじく。
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * リンクや window.open に渡してよい URL だけを返す（それ以外は undefined）。
 * 入力画面で検査していても、保存先から読んだデータは検査を通っていないことがあるため、
 * 開く直前にも必ずこれを通す。
 */
export function safeExternalUrl(url: string | undefined | null): string | undefined {
  return typeof url === 'string' && isSafeUrl(url) ? url : undefined
}

/** 安全な URL のときだけ新しいタブで開く（opener を渡さない） */
export function openExternal(url: string | undefined | null): boolean {
  const safe = safeExternalUrl(url)
  if (!safe) return false
  window.open(safe, '_blank', 'noopener,noreferrer')
  return true
}

/** URL のホスト名（表示用。読めなければそのまま返す） */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/**
 * url が origin（既定は今のページ）と同じオリジンか。読めない URL は false。
 * サーバー側の描画など、location の無いところでは false
 */
export function isSameOrigin(url: string, origin?: string): boolean {
  const base = origin ?? (typeof location !== 'undefined' ? location.origin : undefined)
  if (!base) return false
  try {
    return new URL(url, base).origin === new URL(base).origin
  } catch {
    return false
  }
}
