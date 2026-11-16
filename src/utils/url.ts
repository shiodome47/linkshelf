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
