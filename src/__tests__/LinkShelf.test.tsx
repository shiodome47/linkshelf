import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LinkShelf } from '../LinkShelf'
import { memoryStorage } from '../storage/memory'
import type { Category, Link } from '../types'

const t = '2026-01-01T00:00:00.000Z'
const cat = (id: string, name: string, order: number): Category => ({ id, name, description: '', order, createdAt: t, updatedAt: t })
const link = (id: string, categoryId: string, title: string, url: string, extra: Partial<Link> = {}): Link => ({
  id, categoryId, title, url, description: '', tags: [], isFavorited: false, isPinned: false, order: 0, createdAt: t, updatedAt: t, ...extra,
})

const sample = () =>
  memoryStorage({
    categories: [cat('c1', '仕事', 0), cat('c2', '趣味', 1)],
    links: [
      link('l1', 'c1', 'Example', 'https://example.com/'),
      link('l2', 'c2', '料理のページ', 'https://example.org/recipe'),
      link('l3', 'c2', '危ないリンク', 'javascript:alert(1)', { order: 1 }),
    ],
  })

describe('<LinkShelf />', () => {
  it('保存先のカードとリンクを並べる', async () => {
    render(<LinkShelf storage={sample()} />)
    expect(await screen.findByRole('region', { name: '仕事' })).toBeInTheDocument()
    const hobby = screen.getByRole('region', { name: '趣味' })
    expect(within(hobby).getByText('料理のページ').closest('a')).toHaveAttribute('href', 'https://example.org/recipe')
  })

  it('javascript: の URL は、リンクとして開けない（href を付けない）', async () => {
    render(<LinkShelf storage={sample()} />)
    const row = await screen.findByText('危ないリンク')
    expect(row.closest('a')).not.toHaveAttribute('href')
  })

  it('検索すると、一致するリンクのカードだけが残る', async () => {
    render(<LinkShelf storage={sample()} />)
    await screen.findByText('Example')
    fireEvent.change(screen.getByRole('searchbox', { name: 'リンクを検索' }), { target: { value: '料理' } })
    expect(screen.queryByRole('region', { name: '仕事' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '趣味' })).toBeInTheDocument()
  })

  it('空のときは、カテゴリを作る案内を出す', async () => {
    render(<LinkShelf storage={memoryStorage()} />)
    expect(await screen.findByText('リンクを整理しましょう')).toBeInTheDocument()
  })

  it('カテゴリを足せる', async () => {
    const storage = memoryStorage()
    render(<LinkShelf storage={storage} />)
    fireEvent.click(await screen.findByRole('button', { name: /カテゴリを追加/ }))
    fireEvent.change(screen.getByPlaceholderText('例: 仕事'), { target: { value: '読みもの' } })
    fireEvent.click(screen.getByRole('button', { name: '追加' }))
    expect(await screen.findByRole('region', { name: '読みもの' })).toBeInTheDocument()
    expect((await storage.loadAll()).categories.map((c) => c.name)).toEqual(['読みもの'])
  })

  it('名前を取る窓口が無ければ「名前を取り直す」を出さず、あれば出す', async () => {
    const { unmount } = render(<LinkShelf storage={sample()} />)
    await screen.findByText('Example')
    expect(screen.queryByRole('button', { name: '名前を取り直す' })).not.toBeInTheDocument()
    unmount()
    render(<LinkShelf storage={sample()} fetchTitle={async () => null} />)
    await screen.findByText('Example')
    expect(screen.getByRole('button', { name: '名前を取り直す' })).toBeInTheDocument()
  })

  it('URL を入れて Enter でリンクを足し、窓口から取った名前に置き換える', async () => {
    const fetchTitle = vi.fn(async () => 'Example Domain')
    render(<LinkShelf storage={memoryStorage({ categories: [cat('c1', '仕事', 0)] })} fetchTitle={fetchTitle} />)
    const card = await screen.findByRole('region', { name: '仕事' })
    fireEvent.click(within(card).getByRole('button', { name: /リンク・テキストを追加/ }))
    const input = within(card).getByRole('textbox', { name: /URL か、1 行のテキスト/ })
    fireEvent.change(input, { target: { value: 'example.com' } })
    await act(async () => fireEvent.keyDown(input, { key: 'Enter' }))
    expect(fetchTitle).toHaveBeenCalledWith('https://example.com')
    // 追加した直後は名前の入力欄が出て、取れた名前が入る
    await waitFor(() => expect(within(card).getByRole('textbox', { name: 'リンクの名前' })).toHaveValue('Example Domain'))
  })

  it('読み込めなかったときは知らせる', async () => {
    const broken = { ...memoryStorage(), loadAll: () => Promise.reject(new Error('x')) }
    render(<LinkShelf storage={broken} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('読み込めませんでした')
  })

  it('外側に class="linkshelf" が付く（見た目はこの中だけに効く）', () => {
    const { container } = render(<LinkShelf storage={memoryStorage()} className="mine" />)
    expect(container.firstElementChild).toHaveClass('linkshelf', 'mine')
  })
})

describe('テーマ', () => {
  it('theme を付けないと system（端末の設定に合わせる）', () => {
    const { container } = render(<LinkShelf storage={memoryStorage()} />)
    expect(container.firstElementChild).toHaveAttribute('data-theme', 'system')
  })

  it('ダイアログにも同じテーマが付く（部品の外に出ても色がそろう）', async () => {
    render(<LinkShelf storage={memoryStorage()} theme="light" />)
    fireEvent.click(await screen.findByRole('button', { name: /カテゴリを追加/ }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.closest('.linkshelf')).toHaveAttribute('data-theme', 'light')
  })
})

describe('見出しに足すもの（actions）', () => {
  it('見出しの右に、渡したものを出す', async () => {
    render(<LinkShelf storage={memoryStorage()} actions={<button type="button">わたしのボタン</button>} />)
    expect(await screen.findByRole('button', { name: 'わたしのボタン' })).toBeInTheDocument()
  })
})

describe('ほかの端末の変更（保存先の subscribe）', () => {
  it('保存先から知らせが来たら、読み直して画面に出す', async () => {
    const base = memoryStorage({ categories: [cat('c1', '仕事', 0)] })
    let notify = () => {}
    const unsubscribe = vi.fn()
    const storage = {
      ...base,
      subscribe: (onChange: () => void) => {
        notify = onChange
        return unsubscribe
      },
    }
    const { unmount } = render(<LinkShelf storage={storage} />)
    await screen.findByRole('region', { name: '仕事' })
    // ほかの端末で足されたつもり
    await base.putCategory(cat('c2', '旅行', 1))
    await act(async () => notify())
    expect(await screen.findByRole('region', { name: '旅行' })).toBeInTheDocument()
    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})

describe('英語の表示（locale="en"）', () => {
  it('画面の言葉が英語になる', async () => {
    render(<LinkShelf storage={sample()} locale="en" />)
    expect(await screen.findByRole('heading', { name: 'Links' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search links' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add category/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Add link or text/ }).length).toBeGreaterThan(0)
  })

  it('ダイアログも英語になる', async () => {
    render(<LinkShelf storage={memoryStorage()} locale="en" />)
    fireEvent.click(await screen.findByRole('button', { name: /Add category/ }))
    const dialog = screen.getByRole('dialog', { name: 'Add category' })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(within(dialog).getByPlaceholderText('e.g. Work')).toBeInTheDocument()
  })

  it('locale を付けなければ日本語', async () => {
    render(<LinkShelf storage={memoryStorage()} />)
    expect(await screen.findByRole('heading', { name: 'リンク集' })).toBeInTheDocument()
  })
})

describe('名前を取る窓口が無いとき', () => {
  it('リンクの編集画面に「URL から名前を取得」を出さない', async () => {
    render(<LinkShelf storage={sample()} />)
    fireEvent.click(await screen.findByRole('button', { name: '「Example」を編集' }))
    expect(screen.queryByRole('button', { name: 'URL から名前を取得' })).not.toBeInTheDocument()
  })
})
