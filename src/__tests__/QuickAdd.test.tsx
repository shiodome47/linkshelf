import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QuickAdd } from '../components/CategoryWidget'

const setup = () => {
  const onAdd = vi.fn(async () => {})
  const onAddText = vi.fn(async () => {})
  render(<QuickAdd onAdd={onAdd} onAddText={onAddText} onWriteText={async () => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /リンク・テキストを追加/ }))
  const input = screen.getByRole('textbox', { name: /URL か、1 行のテキスト/ })
  const enter = (v: string) => {
    fireEvent.change(input, { target: { value: v } })
    fireEvent.keyDown(input, { key: 'Enter' })
  }
  return { onAdd, onAddText, enter }
}

describe('カードの「URL か 1 行のテキストを入れて Enter」', () => {
  it('URL ならリンクとして足す', async () => {
    const { onAdd, onAddText, enter } = setup()
    enter('example.com/page')
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith('https://example.com/page'))
    expect(onAddText).not.toHaveBeenCalled()
  })

  it('URL でない 1 行の文は、テキストとして足す（名前も本文もその文）', async () => {
    const { onAdd, onAddText, enter } = setup()
    enter('  打ち合わせ 11/20  ')
    await waitFor(() => expect(onAddText).toHaveBeenCalledWith({ title: '打ち合わせ 11/20', text: '打ち合わせ 11/20' }))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('javascript: などの危ない URL は、リンクにしない', async () => {
    const { onAdd, onAddText, enter } = setup()
    enter('javascript:alert(1)')
    await waitFor(() => expect(onAddText).toHaveBeenCalled())
    expect(onAdd).not.toHaveBeenCalled()
  })
})
