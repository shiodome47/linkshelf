import type { Category, Link } from '../types'

/**
 * データの「読む・書く」の窓口（ストレージアダプタ）。
 * 保存先（ブラウザの IndexedDB、サーバー、メモリなど）は、組み込む側がこの形で渡す。
 */
export interface LinkShelfStorage {
  /** すべてのカテゴリとリンクを読む */
  loadAll(): Promise<{ categories: Category[]; links: Link[] }>
  /** カテゴリを 1 件書く（同じ id があれば上書き） */
  putCategory(category: Category): Promise<void>
  /** カテゴリを 1 件消す（中のリンクは消さない。リンクは deleteLinks で消す） */
  deleteCategory(id: string): Promise<void>
  /** リンクを 1 件書く（同じ id があれば上書き） */
  putLink(link: Link): Promise<void>
  /** リンクをまとめて消す */
  deleteLinks(ids: string[]): Promise<void>
  /** まとめて書く（並べ替えなど）。無ければ 1 件ずつ put する */
  bulkPut?(data: { categories?: Category[]; links?: Link[] }): Promise<void>
  /**
   * 保存先の中身が外から変わったら知らせる（同期でほかの端末の変更が届いたときなど）。
   * 知らせを受けると、<LinkShelf> は loadAll で読み直す。戻り値は、知らせをやめる関数。
   * 無ければ、開いたときに 1 回だけ読む。
   */
  subscribe?(onChange: () => void): () => void
}

/** まとめて書く。bulkPut が無い保存先では 1 件ずつ書く */
export async function putMany(
  storage: LinkShelfStorage,
  data: { categories?: Category[]; links?: Link[] },
): Promise<void> {
  const categories = data.categories ?? []
  const links = data.links ?? []
  if (categories.length === 0 && links.length === 0) return
  if (storage.bulkPut) {
    await storage.bulkPut({ categories, links })
    return
  }
  await Promise.all([...categories.map((c) => storage.putCategory(c)), ...links.map((l) => storage.putLink(l))])
}
