import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LinkShelf } from '../LinkShelf'
import { isImageUrl } from '../linkUtils'
import { memoryStorage } from '../storage/memory'
import type { Category, Link } from '../types'
import { isSameOrigin } from '../utils/url'

const t = '2026-01-01T00:00:00.000Z'
const cat = (id: string, name: string, order: number): Category => ({ id, name, description: '', order, createdAt: t, updatedAt: t })
const link = (id: string, categoryId: string, title: string, url: string, extra: Partial<Link> = {}): Link => ({
  id, categoryId, title, url, description: '', tags: [], isFavorited: false, isPinned: false, order: 0, createdAt: t, updatedAt: t, ...extra,
})
const png = () => new File(['x'], 'photo.png', { type: 'image/png' })

describe('画像を追加（uploadImage）', () => {
  it('uploadImage が無ければ、ボタンは出ない', async () => {
    render(<LinkShelf storage={memoryStorage({ categories: [cat('c1', '行事', 0)] })} jumpBar="never" />)
    await screen.findByRole('region', { name: '行事' })
    expect(screen.queryByRole('button', { name: '画像を追加' })).not.toBeInTheDocument()
  })

  it('閲覧専用のときは、uploadImage があってもボタンは出ない', async () => {
    render(<LinkShelf storage={memoryStorage({ categories: [cat('c1', '行事', 0)] })} uploadImage={async () => ({ url: 'https://example.com/a.png' })} readOnly jumpBar="never" />)
    await screen.findByRole('region', { name: '行事' })
    expect(screen.queryByRole('button', { name: '画像を追加' })).not.toBeInTheDocument()
  })

  it('選んだ画像を渡し、返ってきた URL でカードの末尾にリンクを足す（名前が無ければ「画像（日付）」）', async () => {
    const storage = memoryStorage({ categories: [cat('c1', '行事', 0)], links: [link('l1', 'c1', '前からあるリンク', 'https://example.com/')] })
    let resolve!: (v: { url: string; title?: string }) => void
    const uploadImage = vi.fn(() => new Promise<{ url: string; title?: string }>((r) => (resolve = r)))
    render(<LinkShelf storage={storage} uploadImage={uploadImage} jumpBar="never" />)
    const card = await screen.findByRole('region', { name: '行事' })
    expect(within(card).getByRole('button', { name: '画像を追加' })).toBeInTheDocument()

    const input = card.querySelector('input[type="file"][accept="image/jpeg,image/png,image/webp"]') as HTMLInputElement
    const file = png()
    fireEvent.change(input, { target: { files: [file] } })
    expect(uploadImage).toHaveBeenCalledWith(file, { categoryId: 'c1' })
    expect(await within(card).findByText('アップロード中…')).toBeInTheDocument()

    await act(async () => resolve({ url: '/uploads/photo.png' }))
    const d = new Date()
    const today = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
    const added = await within(card).findByText(`画像（${today}）`)
    // 相対の URL は、今のページを基準にした絶対の URL になる
    expect(added.closest('a')).toHaveAttribute('href', `${location.origin}/uploads/photo.png`)
    expect(within(card).queryByText('アップロード中…')).not.toBeInTheDocument()
    const saved = (await storage.loadAll()).links.filter((l) => l.categoryId === 'c1').sort((a, b) => a.order - b.order)
    expect(saved.map((l) => l.title)).toEqual(['前からあるリンク', `画像（${today}）`])
  })

  it('名前が返ってきたら、その名前にする', async () => {
    render(<LinkShelf storage={memoryStorage({ categories: [cat('c1', '行事', 0)] })} uploadImage={async () => ({ url: 'https://img.example.com/a.png', title: '夏祭りのポスター' })} jumpBar="never" />)
    const card = await screen.findByRole('region', { name: '行事' })
    fireEvent.change(card.querySelector('input[type="file"]')!, { target: { files: [png()] } })
    expect(await within(card).findByText('夏祭りのポスター')).toBeInTheDocument()
  })

  it('失敗したら短いエラーを出し、リンクは足さない', async () => {
    const storage = memoryStorage({ categories: [cat('c1', '行事', 0)] })
    render(<LinkShelf storage={storage} uploadImage={() => Promise.reject(new Error('5MB までです'))} jumpBar="never" />)
    const card = await screen.findByRole('region', { name: '行事' })
    fireEvent.change(card.querySelector('input[type="file"]')!, { target: { files: [png()] } })
    expect(await within(card).findByRole('alert')).toHaveTextContent('画像を追加できませんでした（5MB までです）')
    expect((await storage.loadAll()).links).toHaveLength(0)
  })

  it('危ない URL が返ってきたら、リンクにしない', async () => {
    const storage = memoryStorage({ categories: [cat('c1', '行事', 0)] })
    render(<LinkShelf storage={storage} uploadImage={async () => ({ url: 'javascript:alert(1)' })} jumpBar="never" />)
    const card = await screen.findByRole('region', { name: '行事' })
    fireEvent.change(card.querySelector('input[type="file"]')!, { target: { files: [png()] } })
    expect(await within(card).findByRole('alert')).toHaveTextContent('画像を追加できませんでした')
    expect((await storage.loadAll()).links).toHaveLength(0)
  })

  it('画像の貼り付けは受け付け、文字の貼り付けは横取りしない', async () => {
    const uploadImage = vi.fn(async () => ({ url: 'https://img.example.com/b.png' }))
    render(<LinkShelf storage={memoryStorage({ categories: [cat('c1', '行事', 0)] })} uploadImage={uploadImage} jumpBar="never" />)
    const card = await screen.findByRole('region', { name: '行事' })

    // 文字の貼り付け: 横取りしない（既定の動きを止めない）
    const textPaste = fireEvent.paste(card, {
      clipboardData: { items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }], files: [], types: ['text/plain'] },
    })
    expect(textPaste).toBe(true)
    expect(uploadImage).not.toHaveBeenCalled()

    // 画像の貼り付け: 横取りして、アップロードする
    const file = png()
    const imagePaste = fireEvent.paste(card, {
      clipboardData: { items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }], files: [file], types: ['Files'] },
    })
    expect(imagePaste).toBe(false)
    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith(file, { categoryId: 'c1' }))
  })

  it('カードへのドラッグ＆ドロップでも受け付ける。画像でないファイルは断る', async () => {
    const uploadImage = vi.fn(async () => ({ url: 'https://img.example.com/c.png' }))
    render(<LinkShelf storage={memoryStorage({ categories: [cat('c1', '行事', 0)] })} uploadImage={uploadImage} jumpBar="never" />)
    const card = await screen.findByRole('region', { name: '行事' })
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' })
    fireEvent.drop(card, { dataTransfer: { types: ['Files'], files: [pdf] } })
    expect(await within(card).findByRole('alert')).toHaveTextContent('画像（JPEG・PNG・WebP）を選んでください')
    expect(uploadImage).not.toHaveBeenCalled()
    const file = png()
    fireEvent.drop(card, { dataTransfer: { types: ['Files'], files: [file] } })
    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith(file, { categoryId: 'c1' }))
  })
})

describe('画像リンクのアイコン', () => {
  it('URL のパスが画像の拡張子で終わるかを見分ける', () => {
    for (const u of ['https://e.com/a.jpg', 'https://e.com/a.JPEG', 'https://e.com/x/y.png?v=1', 'https://e.com/a.webp#top', 'https://e.com/a.gif']) {
      expect(isImageUrl(u), u).toBe(true)
    }
    for (const u of ['https://e.com/', 'https://e.com/a.pdf', 'https://e.com/png', 'https://e.com/?file=a.png', 'not a url']) {
      expect(isImageUrl(u), u).toBe(false)
    }
  })

  it('画像の URL のリンクは、画像の印を出す', async () => {
    render(<LinkShelf storage={memoryStorage({ categories: [cat('c1', '行事', 0)], links: [link('l1', 'c1', 'ポスター', 'https://img.example.com/poster.jpg')] })} jumpBar="never" />)
    const row = await screen.findByText('ポスター')
    expect(within(row.closest('a')!).getByTestId('image-link-icon')).toBeInTheDocument()
  })

  it('linkIcon で差し替えられる。null なら既定の表示', async () => {
    const storage = memoryStorage({
      categories: [cat('c1', '行事', 0)],
      links: [link('l1', 'c1', 'ポスター', 'https://img.example.com/poster.jpg'), link('l2', 'c1', '特別', 'https://example.com/', { order: 1 })],
    })
    render(<LinkShelf storage={storage} linkIcon={(l) => (l.id === 'l2' ? <b data-testid="custom-icon">★</b> : null)} jumpBar="never" />)
    expect(within((await screen.findByText('特別')).closest('a')!).getByTestId('custom-icon')).toBeInTheDocument()
    expect(within(screen.getByText('ポスター').closest('a')!).getByTestId('image-link-icon')).toBeInTheDocument()
  })
})

describe('リンクの開き方（openLink / sameOriginInSameTab）', () => {
  const data = () =>
    memoryStorage({
      categories: [cat('c1', '行事', 0)],
      links: [
        link('l1', 'c1', 'サイトの中', `${location.origin}/events`),
        link('l2', 'c1', 'ほかのサイト', 'https://example.org/', { order: 1 }),
        link('l3', 'c1', '危ない', 'javascript:alert(1)', { order: 2 }),
      ],
    })

  it('同じオリジンかを見分ける', () => {
    expect(isSameOrigin('https://a.example.com/x', 'https://a.example.com')).toBe(true)
    expect(isSameOrigin('/x', 'https://a.example.com')).toBe(true)
    expect(isSameOrigin('https://b.example.com/x', 'https://a.example.com')).toBe(false)
    expect(isSameOrigin('http://a.example.com/x', 'https://a.example.com')).toBe(false)
  })

  it('既定では、どのリンクも新しいタブで開く', async () => {
    render(<LinkShelf storage={data()} jumpBar="never" />)
    expect((await screen.findByText('サイトの中')).closest('a')).toHaveAttribute('target', '_blank')
  })

  it('sameOriginInSameTab なら、同じサイトのリンクだけ同じタブで開く', async () => {
    render(<LinkShelf storage={data()} sameOriginInSameTab jumpBar="never" />)
    const inside = (await screen.findByText('サイトの中')).closest('a')!
    expect(inside).not.toHaveAttribute('target')
    expect(screen.getByText('ほかのサイト').closest('a')).toHaveAttribute('target', '_blank')
    // 危ない URL は、どちらでも開けない
    expect(screen.getByText('危ない').closest('a')).not.toHaveAttribute('href')
  })

  it('openLink を渡すと、開くときにそれを呼ぶ（危ない URL では呼ばない）', async () => {
    const openLink = vi.fn()
    render(<LinkShelf storage={data()} openLink={openLink} jumpBar="never" />)
    fireEvent.click(await screen.findByText('ほかのサイト'))
    expect(openLink).toHaveBeenCalledWith('https://example.org/', expect.objectContaining({ id: 'l2' }))
    fireEvent.click(screen.getByText('危ない'))
    expect(openLink).toHaveBeenCalledTimes(1)
  })
})
