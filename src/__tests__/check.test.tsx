import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LinkShelf } from '../LinkShelf'
import { QuickAdd } from '../components/CategoryWidget'
import { isChecked, localDateKey, parseCheckInput } from '../linkUtils'
import { createLinkShelfStore, type LinkShelfStore } from '../store'
import { memoryStorage } from '../storage/memory'
import type { LinkShelfStorage } from '../storage/types'
import type { Category, Link } from '../types'

const t = '2026-01-01T00:00:00.000Z'
const cat = (id: string, name: string, order: number): Category => ({ id, name, description: '', order, createdAt: t, updatedAt: t })
const item = (id: string, categoryId: string, title: string, extra: Partial<Link> = {}): Link => ({
  id, categoryId, title, url: '', kind: 'check', description: '', tags: [], isFavorited: false, isPinned: false, order: 0, createdAt: t, updatedAt: t, ...extra,
})

describe('チェック済みかどうか（isChecked）', () => {
  const now = new Date(2026, 10, 17, 9, 0)

  it('1 回だけの項目は、一度チェックすれば済みのまま', () => {
    expect(isChecked({ kind: 'check', checkedAt: new Date(2026, 0, 1).toISOString() }, now)).toBe(true)
    expect(isChecked({ kind: 'check' }, now)).toBe(false)
  })

  it('毎日の項目は、今日チェックしたときだけ済み', () => {
    const today = new Date(2026, 10, 17, 0, 5).toISOString()
    const yesterday = new Date(2026, 10, 16, 23, 55).toISOString()
    expect(isChecked({ kind: 'check', repeat: 'daily', checkedAt: today }, now)).toBe(true)
    expect(isChecked({ kind: 'check', repeat: 'daily', checkedAt: yesterday }, now)).toBe(false)
  })

  it('チェック項目でなければ、いつも false', () => {
    expect(isChecked({ kind: 'text', checkedAt: t }, now)).toBe(false)
    expect(isChecked({ checkedAt: t }, now)).toBe(false)
  })

  it('日付の文字列は端末の時刻で作る', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('チェック項目の書き方（parseCheckInput）', () => {
  it('[] や □ で始めると 1 回だけの項目', () => {
    expect(parseCheckInput('[] 防災訓練の準備')).toEqual({ title: '防災訓練の準備' })
    expect(parseCheckInput('[ ]ニュースの原稿')).toEqual({ title: 'ニュースの原稿' })
    expect(parseCheckInput('□ 片付け')).toEqual({ title: '片付け' })
  })

  it('[毎日] や [daily] で始めると毎日の項目', () => {
    expect(parseCheckInput('[毎日] 瞑想')).toEqual({ title: '瞑想', repeat: 'daily' })
    expect(parseCheckInput('[Daily] meditate')).toEqual({ title: 'meditate', repeat: 'daily' })
  })

  it('それ以外や、中身が空なら null', () => {
    expect(parseCheckInput('瞑想')).toBeNull()
    expect(parseCheckInput('[]')).toBeNull()
    expect(parseCheckInput('[メモ] あとで')).toBeNull()
  })
})

describe('ストアのチェック項目', () => {
  let storage: LinkShelfStorage
  let store: LinkShelfStore
  const stored = async (id: string) => (await storage.loadAll()).links.find((l) => l.id === id)

  beforeEach(() => {
    storage = memoryStorage()
    store = createLinkShelfStore(storage)
  })
  afterEach(() => vi.useRealTimers())

  it('足す・チェックする・外す', async () => {
    const c = await store.getState().addCategory({ name: '今日' })
    const l = await store.getState().addLink({ categoryId: c.id, title: '瞑想', url: '', kind: 'check', repeat: 'daily' })
    expect(l).toMatchObject({ kind: 'check', repeat: 'daily', url: '' })
    expect(l.checkedAt).toBeUndefined()

    await store.getState().toggleCheck(l.id)
    expect((await stored(l.id))?.checkedAt).toBeTruthy()
    expect(isChecked(store.getState().links[0])).toBe(true)

    await store.getState().toggleCheck(l.id)
    expect(await stored(l.id)).not.toHaveProperty('checkedAt')
  })

  it('毎日の項目は、日付が変わったあとに押すと、今日の分のチェックになる', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 16, 22, 0))
    const c = await store.getState().addCategory({ name: '今日' })
    const l = await store.getState().addLink({ categoryId: c.id, title: '瞑想', url: '', kind: 'check', repeat: 'daily' })
    await store.getState().toggleCheck(l.id)

    vi.setSystemTime(new Date(2026, 10, 17, 7, 0))
    expect(isChecked(store.getState().links[0])).toBe(false)
    await store.getState().toggleCheck(l.id)
    expect(isChecked(store.getState().links[0])).toBe(true)
    expect(localDateKey(new Date(store.getState().links[0].checkedAt!))).toBe('2026-11-17')
  })

  it('くり返しを変える（null で 1 回だけに戻す）', async () => {
    const c = await store.getState().addCategory({ name: 'A' })
    const l = await store.getState().addLink({ categoryId: c.id, title: '片付け', url: '', kind: 'check' })
    await store.getState().updateLink(l.id, { repeat: 'daily' })
    expect((await stored(l.id))?.repeat).toBe('daily')
    await store.getState().updateLink(l.id, { repeat: null })
    expect(await stored(l.id)).not.toHaveProperty('repeat')
  })

  it('済んだ「1 回だけ」の項目だけをまとめて消す（毎日の項目と、ほかのカードは残す）', async () => {
    const s = store.getState()
    const a = await s.addCategory({ name: 'A' })
    const b = await s.addCategory({ name: 'B' })
    const done = await s.addLink({ categoryId: a.id, title: '済み', url: '', kind: 'check' })
    await s.addLink({ categoryId: a.id, title: 'まだ', url: '', kind: 'check' })
    const daily = await s.addLink({ categoryId: a.id, title: '毎日', url: '', kind: 'check', repeat: 'daily' })
    const other = await s.addLink({ categoryId: b.id, title: '別のカード', url: '', kind: 'check' })
    for (const id of [done.id, daily.id, other.id]) await store.getState().toggleCheck(id)

    await store.getState().clearDoneChecks(a.id)
    expect(store.getState().links.map((l) => l.title).sort()).toEqual(['まだ', '別のカード', '毎日'].sort())
    expect(await stored(done.id)).toBeUndefined()
  })
})

describe('カードの入力欄からチェック項目を足す', () => {
  const setup = (defaultCheck: { repeat?: 'daily' } | null = null) => {
    const onAdd = vi.fn(async () => {})
    const onAddText = vi.fn(async () => {})
    const onAddCheck = vi.fn(async () => {})
    render(
      <QuickAdd onAdd={onAdd} onAddText={onAddText} onWriteText={async () => {}} onAddCheck={onAddCheck} defaultCheck={defaultCheck} />,
    )
    fireEvent.click(screen.getByRole('button', { name: defaultCheck ? /チェック項目を追加/ : /リンク・テキストを追加/ }))
    const input = screen.getByRole('textbox')
    const enter = (v: string) => {
      fireEvent.change(input, { target: { value: v } })
      fireEvent.keyDown(input, { key: 'Enter' })
    }
    return { onAdd, onAddText, onAddCheck, enter, input }
  }

  it('[毎日] で始めると、毎日の項目として足す', async () => {
    const { onAddCheck, onAddText, enter } = setup()
    enter('[毎日] アファメーションを読む')
    await waitFor(() => expect(onAddCheck).toHaveBeenCalledWith({ title: 'アファメーションを読む', repeat: 'daily' }))
    expect(onAddText).not.toHaveBeenCalled()
  })

  it('「チェック項目にする」を押すと、ふつうの文もチェック項目になり、続けて打てる', async () => {
    const { onAddCheck, enter, input } = setup()
    fireEvent.click(screen.getByRole('button', { name: /チェック項目にする/ }))
    fireEvent.click(screen.getByRole('button', { name: /毎日くり返す/ }))
    enter('瞑想')
    await waitFor(() => expect(onAddCheck).toHaveBeenCalledWith({ title: '瞑想', repeat: 'daily' }))
    expect(input).toBeInTheDocument()
    enter('23 時に寝る')
    await waitFor(() => expect(onAddCheck).toHaveBeenCalledTimes(2))
  })

  it('カードの最後がチェック項目なら、はじめからチェック項目として足す', async () => {
    const { onAddCheck, enter } = setup({})
    expect(screen.getByRole('button', { name: /チェック項目にする/ })).toHaveAttribute('aria-pressed', 'true')
    enter('ニュースのネタ出し')
    await waitFor(() => expect(onAddCheck).toHaveBeenCalledWith({ title: 'ニュースのネタ出し' }))
  })

  it('チェック項目にしていなければ、今までどおりリンク・テキストとして足す', async () => {
    const { onAddCheck, onAdd, enter } = setup()
    enter('example.com')
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith('https://example.com'))
    expect(onAddCheck).not.toHaveBeenCalled()
  })
})

describe('<LinkShelf /> のチェック項目', () => {
  const sample = () =>
    memoryStorage({
      categories: [cat('c1', '今日', 0)],
      links: [
        item('k1', 'c1', '瞑想', { repeat: 'daily' }),
        item('k2', 'c1', '防災訓練の準備', { order: 1, checkedAt: t }),
        item('k3', 'c1', '23 時に寝る', { order: 2, repeat: 'daily', checkedAt: t }),
      ],
    })

  it('チェックの数を見出しに出し、押すとチェックが付く', async () => {
    const storage = sample()
    render(<LinkShelf storage={storage} />)
    const card = await screen.findByRole('region', { name: '今日' })
    // 1 回だけの k2 は済み、毎日の k3 は前の日のチェックなので外れている
    expect(within(card).getByTestId('check-progress')).toHaveTextContent('1/3')
    const box = within(card).getByRole('checkbox', { name: /瞑想/ })
    expect(box).toHaveAttribute('aria-checked', 'false')
    expect(within(card).getByRole('checkbox', { name: /23 時に寝る/ })).toHaveAttribute('aria-checked', 'false')

    await act(async () => {
      fireEvent.click(box)
    })
    await waitFor(() => expect(within(card).getByRole('checkbox', { name: /瞑想/ })).toHaveAttribute('aria-checked', 'true'))
    expect(within(card).getByTestId('check-progress')).toHaveTextContent('2/3')
    expect((await storage.loadAll()).links.find((l) => l.id === 'k1')?.checkedAt).toBeTruthy()
  })

  it('済んだ項目をまとめて消せる（確認してから）', async () => {
    const storage = sample()
    render(<LinkShelf storage={storage} />)
    const card = await screen.findByRole('region', { name: '今日' })
    fireEvent.click(within(card).getByRole('button', { name: '済んだ 1 件を消す' }))
    const dialog = await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: '削除' }))
    })
    await waitFor(() => expect(within(card).queryByText('防災訓練の準備')).not.toBeInTheDocument())
    expect((await storage.loadAll()).links.map((l) => l.id).sort()).toEqual(['k1', 'k3'])
  })
})
