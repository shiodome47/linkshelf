import type { Category, Link } from './types'
import { groupLinksByCategory } from './store'

/** 絞り込んだあとの、カード 1 枚分 */
export interface ShelfSection {
  category: Category
  links: Link[]
}

/**
 * 棚の検索・お気に入りだけの絞り込み（<LinkShelf> と同じ決まり）。カテゴリは順番どおり。
 * - query: 名前・URL・本文・メモ・タグ（大文字小文字を区別しない）。カテゴリの名前に当たれば、そのカードは全部出す
 * - favoritesOnly: 星の付いたものだけ。1 つも無いカードは出さない
 */
export function filterShelf(
  categories: Category[],
  links: Link[],
  { query = '', favoritesOnly = false }: { query?: string; favoritesOnly?: boolean } = {},
): ShelfSection[] {
  const q = query.trim().toLowerCase()
  const byCategory = groupLinksByCategory(links)
  return [...categories]
    .sort((a, b) => a.order - b.order)
    .map((category) => {
      const inCategory = byCategory.get(category.id) ?? []
      const all = favoritesOnly ? inCategory.filter((l) => l.isFavorited) : inCategory
      // お気に入りだけのときは、お気に入りが 1 つも無いカードを出さない
      if (!q) return { category, links: all, show: !favoritesOnly || all.length > 0 }
      const categoryHit = category.name.toLowerCase().includes(q)
      const hits = all.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q) ||
          (l.text ?? '').toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.tags.some((t) => t.toLowerCase().includes(q)),
      )
      const show = favoritesOnly ? hits.length > 0 || (categoryHit && all.length > 0) : categoryHit || hits.length > 0
      return { category, links: categoryHit && hits.length === 0 ? all : hits, show }
    })
    .filter((v) => v.show)
    .map(({ category, links }) => ({ category, links }))
}
