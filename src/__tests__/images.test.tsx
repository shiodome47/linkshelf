import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LinkShelf } from '../LinkShelf'
import { shrinkImage } from '../image'
import { memoryStorage } from '../storage/memory'
import type { Category, Link } from '../types'

const t = '2026-01-01T00:00:00.000Z'
const cat = (id: string, name: string, order: number): Category => ({ id, name, description: '', order, createdAt: t, updatedAt: t })
const link = (id: string, categoryId: string, title: string, url: string, extra: Partial<Link> = {}): Link => ({
  id, categoryId, title, url, description: '', tags: [], isFavorited: false, isPinned: false, order: 0, createdAt: t, updatedAt: t, ...extra,
})
const png = () => new File(['x'], 'photo.png', { type: 'image/png' })
const imageClipboard = (file: File) => ({
  clipboardData: { items: [{ kind: 'file', type: file.type, getAsFile: () => file }], files: [file], types: ['Files'] },
})

beforeEach(() => {
  localStorage.clear()
  let n = 0
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:test/${++n}`)
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('どこでも貼り付け（pasteImagesAnywhere）', () => {
  const twoCards = () => memoryStorage({ categories: [cat('c1', '行事', 0), cat('c2', '写真', 1)] })

  it('渡さなければ、カードの外での画像の貼り付けは受け取らない', async () => {
    const uploadImage = vi.fn(async () => ({ url: 'https://img.example.com/a.png' }))
    render(<LinkShelf storage={twoCards()} uploadImage={uploadImage} jumpBar="never" />)
    await screen.findByRole('region', { name: '行事' })
    expect(fireEvent.paste(document.body, imageClipboard(png()))).toBe(true)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('カードの外で貼り付けると、置くカードを選んで置く。選んだカードは次に覚えている', async () => {
    const storage = twoCards()
    const uploadImage = vi.fn(async () => ({ url: 'https://img.example.com/a.png', title: '貼った画像' }))
    const { unmount } = render(<LinkShelf storage={storage} uploadImage={uploadImage} pasteImagesAnywhere jumpBar="never" />)
    await screen.findByRole('region', { name: '行事' })

    const file = png()
    expect(fireEvent.paste(document.body, imageClipboard(file))).toBe(false)
    const dialog = await screen.findByRole('dialog', { name: '貼り付けた画像を置く' })
    expect(within(dialog).getByRole('radio', { name: '行事' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(dialog).getByRole('radio', { name: '写真' }))
    fireEvent.click(within(dialog).getByRole('button', { name: '置く' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(uploadImage).toHaveBeenCalledWith(file, { categoryId: 'c2' })
    const saved = (await storage.loadAll()).links
    expect(saved.map((l) => [l.categoryId, l.title])).toEqual([['c2', '貼った画像']])
    unmount()

    // 次に開いたときは、前に選んだカードが選ばれている
    render(<LinkShelf storage={storage} uploadImage={uploadImage} pasteImagesAnywhere jumpBar="never" />)
    await screen.findByRole('region', { name: '行事' })
    fireEvent.paste(document.body, imageClipboard(png()))
    const again = await screen.findByRole('dialog', { name: '貼り付けた画像を置く' })
    expect(within(again).getByRole('radio', { name: '写真' })).toHaveAttribute('aria-checked', 'true')
  })

  it('入力欄での貼り付け・文字の貼り付け・閲覧専用では受け取らない', async () => {
    const uploadImage = vi.fn(async () => ({ url: 'https://img.example.com/a.png' }))
    const { unmount } = render(
      <div>
        <input aria-label="ほかの入力欄" />
        <LinkShelf storage={twoCards()} uploadImage={uploadImage} pasteImagesAnywhere jumpBar="never" />
      </div>,
    )
    await screen.findByRole('region', { name: '行事' })
    expect(fireEvent.paste(screen.getByRole('textbox', { name: 'ほかの入力欄' }), imageClipboard(png()))).toBe(true)
    expect(
      fireEvent.paste(document.body, {
        clipboardData: { items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }], files: [], types: ['text/plain'] },
      }),
    ).toBe(true)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    unmount()

    render(<LinkShelf storage={twoCards()} uploadImage={uploadImage} pasteImagesAnywhere readOnly jumpBar="never" />)
    await screen.findByRole('region', { name: '行事' })
    expect(fireEvent.paste(document.body, imageClipboard(png()))).toBe(true)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('カードの上で貼り付けたときは、そのカードに置く（選ぶ画面は出ない）', async () => {
    const uploadImage = vi.fn(async () => ({ url: 'https://img.example.com/a.png' }))
    render(<LinkShelf storage={twoCards()} uploadImage={uploadImage} pasteImagesAnywhere jumpBar="never" />)
    const card = await screen.findByRole('region', { name: '写真' })
    const file = png()
    fireEvent.paste(card, imageClipboard(file))
    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith(file, { categoryId: 'c2' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('失敗したら、選ぶ画面にエラーを出したままにする', async () => {
    render(<LinkShelf storage={twoCards()} uploadImage={() => Promise.reject(new Error('大きすぎます'))} pasteImagesAnywhere jumpBar="never" />)
    await screen.findByRole('region', { name: '行事' })
    fireEvent.paste(document.body, imageClipboard(png()))
    const dialog = await screen.findByRole('dialog', { name: '貼り付けた画像を置く' })
    fireEvent.click(within(dialog).getByRole('button', { name: '置く' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('画像を追加できませんでした（大きすぎます）')
  })
})

describe('画像を部品の中で見る（viewImages）', () => {
  const withImage = (description = '') =>
    memoryStorage({
      categories: [cat('c1', '行事', 0)],
      links: [link('l1', 'c1', 'ポスター', 'https://img.example.com/poster.jpg', { description })],
    })

  it('渡さなければ、画像のリンクは今までどおり新しいタブで開く', async () => {
    render(<LinkShelf storage={withImage()} jumpBar="never" />)
    const a = (await screen.findByText('ポスター')).closest('a')!
    expect(a).toHaveAttribute('target', '_blank')
    expect(fireEvent.click(a)).toBe(true)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('画像の下にメモを添えて見せる', async () => {
    render(<LinkShelf storage={withImage('3丁目の掲示板\n11/30 まで')} viewImages jumpBar="never" />)
    fireEvent.click((await screen.findByText('ポスター')).closest('a')!)
    const dialog = await screen.findByRole('dialog', { name: 'ポスター' })
    expect(within(dialog).getByTestId('image-viewer-img')).toHaveAttribute('src', 'https://img.example.com/poster.jpg')
    expect(within(dialog).getByTestId('image-viewer-memo')).toHaveTextContent('3丁目の掲示板 11/30 まで')
    expect(within(dialog).getByRole('button', { name: '新しいタブで開く' })).toBeInTheDocument()
  })

  it('開いた画面でメモを書いて保存できる（リンクのメモと同じもの）', async () => {
    const storage = withImage()
    render(<LinkShelf storage={storage} viewImages jumpBar="never" />)
    fireEvent.click((await screen.findByText('ポスター')).closest('a')!)
    const dialog = await screen.findByRole('dialog', { name: 'ポスター' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'メモを書く' }))
    fireEvent.change(within(dialog).getByRole('textbox', { name: '画像のメモ' }), { target: { value: '  回覧板に入れる  ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '保存' }))
    expect(await within(dialog).findByTestId('image-viewer-memo')).toHaveTextContent('回覧板に入れる')
    expect((await storage.loadAll()).links[0].description).toBe('回覧板に入れる')
    expect(within(dialog).getByRole('button', { name: 'メモを直す' })).toBeInTheDocument()
  })

  it('閲覧専用では、メモは見せるが書けない', async () => {
    render(<LinkShelf storage={withImage('見るだけ')} viewImages readOnly jumpBar="never" />)
    fireEvent.click((await screen.findByText('ポスター')).closest('a')!)
    const dialog = await screen.findByRole('dialog', { name: 'ポスター' })
    expect(within(dialog).getByTestId('image-viewer-memo')).toHaveTextContent('見るだけ')
    expect(within(dialog).queryByRole('button', { name: /メモを/ })).not.toBeInTheDocument()
  })

  it('Ctrl・⌘ を押しながらなら、いつもどおり（部品の中では開かない）', async () => {
    render(<LinkShelf storage={withImage()} viewImages jumpBar="never" />)
    const a = (await screen.findByText('ポスター')).closest('a')!
    expect(fireEvent.click(a, { ctrlKey: true })).toBe(true)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('loadImage を渡すと、それで読む。Blob は表示用の URL にして、閉じたら片づける', async () => {
    const loadImage = vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' }))
    render(<LinkShelf storage={withImage()} viewImages loadImage={loadImage} jumpBar="never" />)
    fireEvent.click((await screen.findByText('ポスター')).closest('a')!)
    const dialog = await screen.findByRole('dialog', { name: 'ポスター' })
    expect(await within(dialog).findByTestId('image-viewer-img')).toHaveAttribute('src', 'blob:test/1')
    expect(loadImage).toHaveBeenCalledWith('https://img.example.com/poster.jpg', expect.objectContaining({ id: 'l1' }))
    // 合言葉の要る画像は、新しいタブでは開けないので出さない
    expect(within(dialog).queryByRole('button', { name: '新しいタブで開く' })).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '閉じる' }))
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test/1'))
  })

  it('読めなかったら、そう伝える', async () => {
    render(<LinkShelf storage={withImage()} viewImages loadImage={() => Promise.reject(new Error(''))} jumpBar="never" />)
    fireEvent.click((await screen.findByText('ポスター')).closest('a')!)
    const dialog = await screen.findByRole('dialog', { name: 'ポスター' })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('画像を読めませんでした')
  })

  it('画像でないリンクは、今までどおり', async () => {
    render(<LinkShelf storage={memoryStorage({ categories: [cat('c1', '行事', 0)], links: [link('l1', 'c1', 'サイト', 'https://example.com/')] })} viewImages jumpBar="never" />)
    expect(fireEvent.click((await screen.findByText('サイト')).closest('a')!)).toBe(true)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('shrinkImage / imageMaxSide', () => {
  it('縮められない環境（createImageBitmap が無い）では、そのまま返す', async () => {
    const f = png()
    expect(await shrinkImage(f, 100)).toBe(f)
  })

  it('imageMaxSide を渡しても、uploadImage には画像が届く', async () => {
    const uploadImage = vi.fn(async () => ({ url: 'https://img.example.com/a.png' }))
    render(<LinkShelf storage={memoryStorage({ categories: [cat('c1', '行事', 0)] })} uploadImage={uploadImage} imageMaxSide={2000} jumpBar="never" />)
    const card = await screen.findByRole('region', { name: '行事' })
    const file = png()
    await act(async () => {
      fireEvent.change(card.querySelector('input[type="file"]')!, { target: { files: [file] } })
    })
    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith(file, { categoryId: 'c1' }))
  })
})
