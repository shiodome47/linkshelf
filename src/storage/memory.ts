import type { Category, Link } from '../types'
import type { LinkShelfStorage } from './types'

/**
 * メモリの中だけに保存する（ページを閉じると消える）。テストや見本のページ向け。
 * initial を渡すと、その内容から始める。
 */
export function memoryStorage(initial?: { categories?: Category[]; links?: Link[] }): LinkShelfStorage {
  // 外から渡されたものや、外へ返したものを書き換えられても影響しないように、写しを持つ
  const copy = <T>(v: T): T => structuredClone(v)
  const categories = new Map<string, Category>((initial?.categories ?? []).map((c) => [c.id, copy(c)]))
  const links = new Map<string, Link>((initial?.links ?? []).map((l) => [l.id, copy(l)]))

  return {
    async loadAll() {
      return { categories: [...categories.values()].map(copy), links: [...links.values()].map(copy) }
    },
    async putCategory(category) {
      categories.set(category.id, copy(category))
    },
    async deleteCategory(id) {
      categories.delete(id)
    },
    async putLink(link) {
      links.set(link.id, copy(link))
    },
    async deleteLinks(ids) {
      for (const id of ids) links.delete(id)
    },
    async bulkPut(data) {
      for (const c of data.categories ?? []) categories.set(c.id, copy(c))
      for (const l of data.links ?? []) links.set(l.id, copy(l))
    },
  }
}
