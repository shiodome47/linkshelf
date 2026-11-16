import { DndContext } from '@dnd-kit/core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { CategoryWidget } from '../components/CategoryWidget'
import { LinkShelfStoreProvider, useLinkShelf } from '../context'
import { memoryStorage } from '../storage/memory'
import { createLinkShelfStore, type LinkShelfStore } from '../store'
import type { Category, Link } from '../types'

const t = '2026-01-01T00:00:00.000Z'
const category: Category = { id: 'k1', name: '見本のカード', description: '', order: 0, createdAt: t, updatedAt: t }
const memo: Link = {
  id: 'm1', categoryId: 'k1', title: '牛乳', url: '', kind: 'text', text: '牛乳', description: '', tags: [],
  isFavorited: false, isPinned: false, order: 0, createdAt: t, updatedAt: t,
}

function Card() {
  const links = useLinkShelf((s) => s.links)
  return (
    <DndContext>
      <CategoryWidget category={category} links={links} indicator={null} wasDragging={() => false} onManage={() => {}} onEditLink={() => {}} />
    </DndContext>
  )
}

let store: LinkShelfStore

beforeEach(async () => {
  store = createLinkShelfStore(memoryStorage({ categories: [category], links: [memo] }))
  await store.getState().loadAll()
  render(
    <LinkShelfStoreProvider store={store}>
      <Card />
    </LinkShelfStoreProvider>,
  )
})

describe('1 行のテキストを、ダブルクリックでその場で書き換える', () => {
  it('Enter で保存すると、名前と本文がその文になる（全文の表示は開かない）', async () => {
    const row = screen.getByText('牛乳')
    fireEvent.click(row)
    fireEvent.click(row)
    fireEvent.doubleClick(row)
    const input = screen.getByRole('textbox', { name: '1 行のテキスト' })
    expect(input).toHaveValue('牛乳')
    fireEvent.change(input, { target: { value: '牛乳とパン' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(store.getState().links[0]).toMatchObject({ title: '牛乳とパン', text: '牛乳とパン' }))
    await act(() => new Promise((r) => setTimeout(r, 350)))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Esc でやめると、元のまま', () => {
    fireEvent.doubleClick(screen.getByText('牛乳'))
    const input = screen.getByRole('textbox', { name: '1 行のテキスト' })
    fireEvent.change(input, { target: { value: '消える文' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(store.getState().links[0].text).toBe('牛乳')
  })

  it('1 回押すと、少し待ってから全文を表示する', async () => {
    fireEvent.click(screen.getByText('牛乳'))
    expect(await screen.findByTestId('text-viewer')).toHaveTextContent('牛乳')
  })
})
