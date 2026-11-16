/**
 * ページの名前を取る窓口（<LinkShelf fetchTitle={fetchTitle} /> に渡す）。
 * 同じサイトの /api/title（api/title.ts）に頼む。取れないとき（開発サーバーなど）は null。
 */
export async function fetchTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/title?url=${encodeURIComponent(url)}`, {
      headers: { accept: 'application/json' },
    })
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null
    const data = (await res.json()) as { title?: unknown }
    return typeof data.title === 'string' && data.title.trim() ? data.title.trim() : null
  } catch {
    return null
  }
}
