import { beforeEach, describe, expect, it } from 'vitest'
import { createLinkShelfStore, groupLinksByCategory, type LinkShelfStore } from '../store'
import { memoryStorage } from '../storage/memory'
import type { LinkShelfStorage } from '../storage/types'

let storage: LinkShelfStorage
let store: LinkShelfStore

const titles = (categoryId: string) =>
  (groupLinksByCategory(store.getState().links).get(categoryId) ?? []).map((l) => l.title)
const stored = async (id: string) => (await storage.loadAll()).links.find((l) => l.id === id)

async function setup() {
  const s = store.getState()
  const a = await s.addCategory({ name: 'A' })
  const b = await s.addCategory({ name: 'B' })
  for (const t of ['a1', 'a2', 'a3']) await store.getState().addLink({ categoryId: a.id, title: t, url: `https://${t}.example.com` })
  for (const t of ['b1', 'b2']) await store.getState().addLink({ categoryId: b.id, title: t, url: `https://${t}.example.com` })
  const id = (t: string) => store.getState().links.find((l) => l.title === t)!.id
  return { a: a.id, b: b.id, id }
}

beforeEach(() => {
  storage = memoryStorage()
  store = createLinkShelfStore(storage)
})

describe('リンクの移動・並べ替え', () => {
  it('同じカテゴリ内で位置を変える', async () => {
    const { a, id } = await setup()
    await store.getState().moveLink(id('a3'), a, 0)
    expect(titles(a)).toEqual(['a3', 'a1', 'a2'])
  })

  it('別のカテゴリの途中へ移し、元のカテゴリの順番を詰める', async () => {
    const { a, b, id } = await setup()
    await store.getState().moveLink(id('a1'), b, 1)
    expect(titles(a)).toEqual(['a2', 'a3'])
    expect(titles(b)).toEqual(['b1', 'a1', 'b2'])
    const saved = await stored(id('a1'))
    expect(saved?.categoryId).toBe(b)
    expect(saved?.order).toBe(1)
  })

  it('位置を省略すると末尾に入る', async () => {
    const { a, b, id } = await setup()
    await store.getState().moveLink(id('b1'), a)
    expect(titles(a)).toEqual(['a1', 'a2', 'a3', 'b1'])
    expect(titles(b)).toEqual(['b2'])
  })

  it('まとめて移すと今の順番のまま末尾に入る', async () => {
    const { a, b, id } = await setup()
    await store.getState().moveLinks([id('a3'), id('a1')], b)
    expect(titles(a)).toEqual(['a2'])
    expect(titles(b)).toEqual(['b1', 'b2', 'a1', 'a3'])
  })

  it('まとめて削除する', async () => {
    const { a, id } = await setup()
    await store.getState().deleteLinks([id('a1'), id('a2')])
    expect(titles(a)).toEqual(['a3'])
    expect((await storage.loadAll()).links).toHaveLength(3)
  })

  it('名前順に並べ替えて保存する', async () => {
    const { a, id } = await setup()
    await store.getState().updateLink(id('a1'), { title: 'ん' })
    await store.getState().sortLinks(a, 'title')
    expect(titles(a)).toEqual(['a2', 'a3', 'ん'])
    const saved = (await storage.loadAll()).links.filter((l) => l.categoryId === a).sort((x, y) => x.order - y.order)
    expect(saved.map((l) => l.title)).toEqual(['a2', 'a3', 'ん'])
  })
})

describe('名前をまとめて変える', () => {
  it('指定したリンクだけ名前が変わり、保存される', async () => {
    const { a, id } = await setup()
    const a3 = id('a3')
    await store.getState().renameLinks(new Map([[id('a1'), 'いち'], [a3, 'さん']]))
    expect(titles(a)).toEqual(['いち', 'a2', 'さん'])
    expect((await stored(a3))?.title).toBe('さん')
  })
})

describe('カテゴリ', () => {
  it('消すと中のリンクも消え、保存先からも消える', async () => {
    const { a, b } = await setup()
    await store.getState().deleteCategory(a)
    expect(store.getState().categories.map((c) => c.name)).toEqual(['B'])
    expect(store.getState().links.every((l) => l.categoryId === b)).toBe(true)
    const all = await storage.loadAll()
    expect(all.categories.map((c) => c.name)).toEqual(['B'])
    expect(all.links).toHaveLength(2)
  })

  it('ドラッグで決めた列と順番を保存し、列を外すこともできる', async () => {
    const { a, b } = await setup()
    await store.getState().arrangeCategories([{ id: a, order: 0, column: 1 }, { id: b, order: 0, column: 0 }])
    expect((await storage.loadAll()).categories.find((c) => c.id === a)).toMatchObject({ order: 0, column: 1 })
    await store.getState().arrangeCategories([{ id: a, order: 3 }])
    const cat = store.getState().categories.find((c) => c.id === a)!
    expect(cat.order).toBe(3)
    expect('column' in cat).toBe(false)
  })
})

describe('保存先から読む', () => {
  it('はじめにある中身を読み、読み終わった印が付く', async () => {
    const t = '2026-01-01T00:00:00.000Z'
    const s = createLinkShelfStore(
      memoryStorage({
        categories: [{ id: 'c', name: '見本', description: '', order: 0, createdAt: t, updatedAt: t }],
        links: [{ id: 'l', categoryId: 'c', title: 'Example', url: 'https://example.com/', description: '', tags: [], isFavorited: false, isPinned: false, order: 0, createdAt: t, updatedAt: t }],
      }),
    )
    expect(s.getState().loaded).toBe(false)
    await s.getState().loadAll()
    expect(s.getState().loaded).toBe(true)
    expect(s.getState().categories.map((c) => c.name)).toEqual(['見本'])
    expect(s.getState().links.map((l) => l.title)).toEqual(['Example'])
  })

  it('ストアは <LinkShelf> ごとに別々（片方に足しても、もう片方には出ない）', async () => {
    const other = createLinkShelfStore(memoryStorage())
    await store.getState().addCategory({ name: 'こちらだけ' })
    expect(store.getState().categories).toHaveLength(1)
    expect(other.getState().categories).toHaveLength(0)
  })
})

describe('ページの名前を取る窓口', () => {
  it('窓口が無ければ、名前は URL から作り、取り直しもしない', async () => {
    const { a } = await setup()
    const link = await store.getState().addLinkFromUrl(a, 'https://www.example.com/page')
    expect(link.title).toBe('example.com')
    expect(store.getState().fetchingTitleIds).toEqual([])
    expect(await store.getState().lookupTitle('https://example.com/')).toBeNull()
  })

  it('窓口があれば、取れた名前に置き換える', async () => {
    let resolve!: (v: string | null) => void
    const s = createLinkShelfStore(memoryStorage(), { fetchTitle: () => new Promise((r) => (resolve = r)) })
    const cat = await s.getState().addCategory({ name: 'A' })
    const link = await s.getState().addLinkFromUrl(cat.id, 'https://example.com/')
    expect(s.getState().fetchingTitleIds).toEqual([link.id])
    resolve('  Example Domain  ')
    await vi.waitFor(() => expect(s.getState().fetchingTitleIds).toEqual([]))
    expect(s.getState().links[0].title).toBe('Example Domain')
  })

  it('取りに行っている間に名前を変えていたら、置き換えない', async () => {
    let resolve!: (v: string | null) => void
    const s = createLinkShelfStore(memoryStorage(), { fetchTitle: () => new Promise((r) => (resolve = r)) })
    const cat = await s.getState().addCategory({ name: 'A' })
    const link = await s.getState().addLinkFromUrl(cat.id, 'https://example.com/')
    await s.getState().updateLink(link.id, { title: '自分で付けた名前' })
    resolve('Example Domain')
    await vi.waitFor(() => expect(s.getState().fetchingTitleIds).toEqual([]))
    expect(s.getState().links[0].title).toBe('自分で付けた名前')
  })

  it('窓口がエラーを出しても、仮の名前のまま続ける', async () => {
    const s = createLinkShelfStore(memoryStorage(), { fetchTitle: () => Promise.reject(new Error('offline')) })
    const cat = await s.getState().addCategory({ name: 'A' })
    await s.getState().addLinkFromUrl(cat.id, 'https://example.com/')
    await vi.waitFor(() => expect(s.getState().fetchingTitleIds).toEqual([]))
    expect(s.getState().links[0].title).toBe('example.com')
  })
})
