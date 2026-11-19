import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button, ConfirmDialog, LinkIcon, LinkShelf, LinkShelfScope, filterShelf, mergeShelfData, parseShelfData, toShelfData } from '../index'
import { createLinkShelfStore } from '../store'
import { memoryStorage } from '../storage/memory'
import type { Category, Link } from '../types'

const t = '2026-01-01T00:00:00.000Z'
const cat = (id: string, name: string, order: number): Category => ({ id, name, description: '', order, createdAt: t, updatedAt: t })
const link = (id: string, categoryId: string, title: string, extra: Partial<Link> = {}): Link => ({
  id, categoryId, title, url: `https://${id}.example.com/`, description: '', tags: [], isFavorited: false, isPinned: false, order: 0, createdAt: t, updatedAt: t, ...extra,
})

describe('絞り込み（filterShelf）', () => {
  const cats = [cat('c2', '趣味', 1), cat('c1', '仕事', 0)]
  const links = [link('a', 'c1', '議事録', { isFavorited: true }), link('b', 'c1', 'カレンダー'), link('c', 'c2', '山歩き', { tags: ['週末'] })]
  it('カテゴリは順番どおり。検索は名前・タグなどに当てる。カテゴリ名に当たれば全部', () => {
    expect(filterShelf(cats, links).map((s) => s.category.name)).toEqual(['仕事', '趣味'])
    expect(filterShelf(cats, links, { query: '週末' }).map((s) => [s.category.name, s.links.map((l) => l.title)])).toEqual([['趣味', ['山歩き']]])
    expect(filterShelf(cats, links, { query: '仕事' })[0].links).toHaveLength(2)
  })
  it('お気に入りだけ: 星の無いカードは出さない', () => {
    expect(filterShelf(cats, links, { favoritesOnly: true }).map((s) => s.links.map((l) => l.title))).toEqual([['議事録']])
  })
})

describe('バックアップ', () => {
  it('書き出した形は、そのまま読み込める。足りない欄は補い、形が違えば断る', () => {
    const data = toShelfData([cat('c1', '仕事', 0)], [link('a', 'c1', '議事録', { meta: { due: 'x' } })])
    const back = parseShelfData(JSON.parse(JSON.stringify(data)))
    expect(back.links[0]).toMatchObject({ title: '議事録', meta: { due: 'x' } })
    expect(parseShelfData({ app: 'linkshelf', version: 1, categories: [{ id: 'c', name: 'n' }], links: [{ id: 'l', categoryId: 'c', title: 't', url: '' }] }).links[0]).toMatchObject({ tags: [], description: '', isFavorited: false })
    expect(() => parseShelfData({ app: 'other' })).toThrow()
    expect(() => parseShelfData({ app: 'linkshelf', version: 1, categories: [], links: [{ id: 'l', categoryId: 'none', title: 't', url: '' }] })).toThrow()
  })

  it('足す: 同じ id は読み込んだ方、新しいカテゴリは後ろに並ぶ', () => {
    const merged = mergeShelfData(
      { categories: [cat('c1', '仕事', 0)], links: [link('a', 'c1', '古い名前')] },
      toShelfData([cat('c1', '仕事', 0), cat('c9', '新しい', 0)], [link('a', 'c1', '新しい名前'), link('z', 'c9', '追加')]),
    )
    expect(merged.categories.map((c) => [c.id, c.order])).toEqual([['c1', 0], ['c9', 1]])
    expect(merged.links.map((l) => l.title).sort()).toEqual(['新しい名前', '追加'])
  })

  it('ストアで読み込むと、保存先も画面も変わる（置き換える・足す）', async () => {
    const storage = memoryStorage({ categories: [cat('c1', '仕事', 0)], links: [link('a', 'c1', '議事録')] })
    const store = createLinkShelfStore(storage)
    await store.getState().loadAll()
    const incoming = toShelfData([cat('c5', '趣味', 0)], [link('m', 'c5', '山歩き')])
    await store.getState().importData(incoming, 'merge')
    expect(store.getState().categories.map((c) => c.name)).toEqual(['仕事', '趣味'])
    await store.getState().importData(incoming, 'replace')
    const saved = await storage.loadAll()
    expect(saved.categories.map((c) => c.name)).toEqual(['趣味'])
    expect(saved.links.map((l) => l.title)).toEqual(['山歩き'])
    expect(store.getState().exportData().links.map((l) => l.title)).toEqual(['山歩き'])
  })

  it('<LinkShelf backup>: 読み込むファイルを選ぶと、置き換えるか足すかを聞く', async () => {
    const storage = memoryStorage({ categories: [cat('c1', '仕事', 0)] })
    render(<LinkShelf storage={storage} backup jumpBar="never" />)
    await screen.findByRole('region', { name: '仕事' })
    expect(screen.getByRole('button', { name: '書き出す' })).toBeInTheDocument()
    const file = new File([JSON.stringify(toShelfData([cat('c5', '趣味', 0)], []))], 'b.json', { type: 'application/json' })
    fireEvent.change(screen.getByTestId('backup-file'), { target: { files: [file] } })
    const dialog = await screen.findByRole('dialog', { name: '読み込む' })
    expect(dialog).toHaveTextContent('カテゴリ 1 件・項目 0 件')
    fireEvent.click(within(dialog).getByRole('button', { name: '今の中身に足す' }))
    expect(await screen.findByRole('region', { name: '趣味' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '仕事' })).toBeInTheDocument()
  })

  it('閲覧専用では、書き出すだけ', async () => {
    render(<LinkShelf storage={memoryStorage({ categories: [cat('c1', '仕事', 0)] })} backup readOnly jumpBar="never" />)
    await screen.findByRole('region', { name: '仕事' })
    expect(screen.getByRole('button', { name: '書き出す' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '読み込む' })).not.toBeInTheDocument()
  })
})

describe('組み立て用の部品（LinkShelfScope の中で）', () => {
  it('部品は .linkshelf の中に描かれ、言葉の差し替えも効く', async () => {
    let confirmed = false
    const { container } = render(
      <LinkShelfScope theme="light" locale="en" messages={{ cancel: 'やめる' }}>
        <Button>押す</Button>
        <LinkIcon link={link('a', 'c1', 'x')} />
        <ConfirmDialog isOpen onClose={() => {}} onConfirm={async () => void (confirmed = true)} title="消す？" description="本当に" />
      </LinkShelfScope>,
    )
    expect(container.querySelector('.linkshelf[data-theme="light"]')).not.toBeNull()
    const dialog = screen.getByRole('dialog', { name: '消す？' })
    expect(within(dialog).getByRole('button', { name: 'やめる' })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(confirmed).toBe(true))
  })
})
