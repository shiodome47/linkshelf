import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import type { Category, Link } from '../types'
import { indexedDbStorage } from '../storage/indexedDb'
import { memoryStorage } from '../storage/memory'
import { putMany, type LinkShelfStorage } from '../storage/types'

const t = '2026-01-01T00:00:00.000Z'
const cat = (id: string): Category => ({ id, name: id, description: '', order: 0, createdAt: t, updatedAt: t })
const link = (id: string, categoryId: string): Link => ({
  id, categoryId, title: id, url: `https://${id}.example.com/`, description: '', tags: [],
  isFavorited: false, isPinned: false, order: 0, createdAt: t, updatedAt: t,
})

let dbCount = 0
const kinds: [string, () => LinkShelfStorage][] = [
  ['memoryStorage', () => memoryStorage()],
  ['indexedDbStorage', () => indexedDbStorage({ name: `linkshelf-test-${dbCount++}` })],
]

describe.each(kinds)('%s', (_name, make) => {
  it('書いたものを読み、上書き・削除ができる', async () => {
    const s = make()
    await s.putCategory(cat('c1'))
    await s.putLink(link('l1', 'c1'))
    await s.putLink(link('l2', 'c1'))
    await s.putLink({ ...link('l1', 'c1'), title: '新しい名前' })
    await s.deleteLinks(['l2'])
    const all = await s.loadAll()
    expect(all.categories.map((c) => c.id)).toEqual(['c1'])
    expect(all.links.map((l) => l.title)).toEqual(['新しい名前'])
    await s.deleteCategory('c1')
    expect((await s.loadAll()).categories).toEqual([])
  })

  it('まとめて書ける', async () => {
    const s = make()
    await putMany(s, { categories: [cat('a'), cat('b')], links: [link('x', 'a'), link('y', 'b')] })
    const all = await s.loadAll()
    expect(all.categories.map((c) => c.id).sort()).toEqual(['a', 'b'])
    expect(all.links.map((l) => l.id).sort()).toEqual(['x', 'y'])
  })
})

describe('indexedDbStorage', () => {
  it('名前が違えば、別のデータベースになる', async () => {
    const one = indexedDbStorage({ name: 'linkshelf-one' })
    const two = indexedDbStorage({ name: 'linkshelf-two' })
    await one.putCategory(cat('only-one'))
    expect((await two.loadAll()).categories).toEqual([])
  })

  it('同じ名前なら、作り直しても前のデータを読める', async () => {
    await indexedDbStorage({ name: 'linkshelf-same' }).putCategory(cat('kept'))
    expect((await indexedDbStorage({ name: 'linkshelf-same' }).loadAll()).categories.map((c) => c.id)).toEqual(['kept'])
  })
})

describe('memoryStorage', () => {
  it('読んだものを書き換えても、保存した中身は変わらない', async () => {
    const s = memoryStorage({ categories: [cat('c')] })
    const first = await s.loadAll()
    first.categories[0].name = '書き換え'
    expect((await s.loadAll()).categories[0].name).toBe('c')
  })
})

describe('putMany', () => {
  it('bulkPut の無い保存先では 1 件ずつ書く', async () => {
    const base = memoryStorage()
    const s: LinkShelfStorage = { ...base, bulkPut: undefined, putLink: vi.fn(base.putLink) }
    await putMany(s, { links: [link('a', 'c'), link('b', 'c')] })
    expect(s.putLink).toHaveBeenCalledTimes(2)
    expect((await base.loadAll()).links).toHaveLength(2)
  })

  it('何も無ければ書かない', async () => {
    const bulkPut = vi.fn()
    await putMany({ ...memoryStorage(), bulkPut }, {})
    expect(bulkPut).not.toHaveBeenCalled()
  })
})
