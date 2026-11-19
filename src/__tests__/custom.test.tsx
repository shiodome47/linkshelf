import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LinkShelf } from '../LinkShelf'
import { createLinkShelfStore } from '../store'
import { memoryStorage } from '../storage/memory'
import type { Category, Link } from '../types'

const t = '2026-01-01T00:00:00.000Z'
const cat = (id: string, name: string, order: number, extra: Partial<Category> = {}): Category => ({ id, name, description: '', order, createdAt: t, updatedAt: t, ...extra })
const link = (id: string, categoryId: string, title: string, url: string, extra: Partial<Link> = {}): Link => ({
  id, categoryId, title, url, description: '', tags: [], isFavorited: false, isPinned: false, order: 0, createdAt: t, updatedAt: t, ...extra,
})

describe('アプリが自由に使う欄（meta）', () => {
  it('作るときに渡せて、更新・移動・並べ替えでも消えない', async () => {
    const storage = memoryStorage({ categories: [cat('c1', 'A', 0, { meta: { owner: 'me' } }), cat('c2', 'B', 1)] })
    const store = createLinkShelfStore(storage)
    await store.getState().loadAll()
    const l = await store.getState().addLink({ categoryId: 'c1', title: '会議', url: 'https://e.com/', meta: { due: '2026-12-01' } })
    await store.getState().updateLink(l.id, { title: '定例会議' })
    await store.getState().moveLink(l.id, 'c2')
    await store.getState().updateLink(l.id, { isFavorited: true })
    await store.getState().updateCategory('c1', { name: 'A2' })
    const saved = await storage.loadAll()
    expect(saved.links.find((x) => x.id === l.id)).toMatchObject({ title: '定例会議', categoryId: 'c2', meta: { due: '2026-12-01' } })
    expect(saved.categories.find((c) => c.id === 'c1')).toMatchObject({ name: 'A2', meta: { owner: 'me' } })
    // 更新で渡すと、丸ごと置き換える
    await store.getState().updateLink(l.id, { meta: { due: '2026-12-24', done: true } })
    expect((await storage.loadAll()).links[0].meta).toEqual({ due: '2026-12-24', done: true })
  })
})

describe('言葉の差し替え（messages）', () => {
  it('渡した言葉だけ変わり、ほかは locale のまま', async () => {
    render(<LinkShelf storage={memoryStorage({ categories: [cat('c1', '行事', 0)] })} messages={{ addCategory: 'ノートを追加' }} jumpBar="never" />)
    expect(await screen.findByRole('button', { name: 'ノートを追加' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'リンクを検索' })).toBeInTheDocument()
  })
})

describe('差し込み口（renderLinkExtra / renderCardExtra）', () => {
  const storage = () =>
    memoryStorage({
      categories: [cat('c1', '行事', 0)],
      links: [link('l1', 'c1', '防災訓練', 'https://e.com/', { meta: { due: '11/29' } }), link('l2', 'c1', '回覧板', 'https://f.com/')],
    })

  it('リンク行の右と、カードの見出しの右に、アプリの表示を出せる（何も返さなければ出さない）', async () => {
    render(
      <LinkShelf
        storage={storage()}
        jumpBar="never"
        renderLinkExtra={(l) => (l.meta?.due ? <span>期日 {String(l.meta.due)}</span> : null)}
        renderCardExtra={(_c, links) => <span>{links.filter((l) => l.meta?.due).length} 件に期日</span>}
      />,
    )
    const card = await screen.findByRole('region', { name: '行事' })
    expect(within(card).getByTestId('card-extra')).toHaveTextContent('1 件に期日')
    const extras = within(card).getAllByTestId('link-extra')
    expect(extras).toHaveLength(1)
    expect(extras[0]).toHaveTextContent('期日 11/29')
  })

  it('差し込んだボタンを押しても、リンクは開かない（行の外の場所に出す）', async () => {
    let pressed = 0
    render(
      <LinkShelf
        storage={storage()}
        jumpBar="never"
        renderLinkExtra={() => (
          <button type="button" onClick={() => pressed++}>
            印
          </button>
        )}
      />,
    )
    const buttons = await screen.findAllByRole('button', { name: '印' })
    expect(fireEvent.click(buttons[0])).toBe(true)
    await waitFor(() => expect(pressed).toBe(1))
  })
})
