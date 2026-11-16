import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LinkShelfProvider, useLinkShelf, useLinkShelfStoreApi } from '../context'
import { memoryStorage } from '../storage/memory'

function Names() {
  const names = useLinkShelf((s) => s.categories.map((c) => c.name).join(','))
  return <p>{names || '(なし)'}</p>
}

function AddButton({ name }: { name: string }) {
  const store = useLinkShelfStoreApi()
  return <button onClick={() => void store.getState().addCategory({ name })}>add {name}</button>
}

describe('<LinkShelf> ごとのストア', () => {
  it('2 つ置いても、それぞれのデータは混ざらない', async () => {
    render(
      <>
        <section data-testid="one">
          <LinkShelfProvider storage={memoryStorage()}>
            <Names />
            <AddButton name="ひとつめ" />
          </LinkShelfProvider>
        </section>
        <section data-testid="two">
          <LinkShelfProvider storage={memoryStorage()}>
            <Names />
          </LinkShelfProvider>
        </section>
      </>,
    )
    await act(async () => screen.getByText('add ひとつめ').click())
    expect(screen.getByTestId('one').textContent).toContain('ひとつめ')
    expect(screen.getByTestId('two').textContent).toContain('(なし)')
  })

  it('<LinkShelf> の外で使うと、分かりやすいエラーになる', () => {
    // React がエラーを画面の外へ書き出すのを止める（テストの出力を読みやすくするため）
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const quiet = (e: ErrorEvent) => e.preventDefault()
    window.addEventListener('error', quiet)
    expect(() => render(<Names />)).toThrow(/<LinkShelf> の中で/)
    window.removeEventListener('error', quiet)
    spy.mockRestore()
  })
})
