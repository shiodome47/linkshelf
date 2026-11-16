import Dexie, { type Table } from 'dexie'
import type { Category, Link } from '../types'
import type { LinkShelfStorage } from './types'

export interface IndexedDbStorageOptions {
  /** データベースの名前。1 つのサイトに 2 つ置くときは、別の名前にする（既定は 'linkshelf'） */
  name?: string
}

class LinkShelfDb extends Dexie {
  categories!: Table<Category, string>
  links!: Table<Link, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      categories: 'id',
      links: 'id, categoryId',
    })
  }
}

/** ブラウザの中（IndexedDB）に保存する。<LinkShelf> に保存先を渡さなかったときは、これを使う */
export function indexedDbStorage(options: IndexedDbStorageOptions = {}): LinkShelfStorage {
  let db: LinkShelfDb | undefined
  // 最初に使うときに開く（サーバー側の描画など、IndexedDB の無いところで作ってもエラーにしない）
  const open = () => (db ??= new LinkShelfDb(options.name ?? 'linkshelf'))

  return {
    async loadAll() {
      const d = open()
      const [categories, links] = await Promise.all([d.categories.toArray(), d.links.toArray()])
      return { categories, links }
    },
    async putCategory(category) {
      await open().categories.put(category)
    },
    async deleteCategory(id) {
      await open().categories.delete(id)
    },
    async putLink(link) {
      await open().links.put(link)
    },
    async deleteLinks(ids) {
      await open().links.bulkDelete(ids)
    },
    async bulkPut(data) {
      const d = open()
      await d.transaction('rw', d.categories, d.links, async () => {
        if (data.categories?.length) await d.categories.bulkPut(data.categories)
        if (data.links?.length) await d.links.bulkPut(data.links)
      })
    },
  }
}
