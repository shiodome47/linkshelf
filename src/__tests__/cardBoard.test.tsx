import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CardBoard, type CardBoardCardState, type CardLike } from '../index'

afterEach(cleanup)

interface Duty extends CardLike {
  title: string
}
const duties: Duty[] = [
  { id: 'a', order: 0, size: 6, title: '総会' },
  { id: 'b', order: 1, size: 1, title: '防災訓練' },
  { id: 'c', order: 2, size: 1, title: '夏祭り' },
]

const columnsOf = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-card-column]')].map((col) =>
    [...col.querySelectorAll('[data-card-slot]')].map((s) => s.getAttribute('data-card-slot')),
  )

describe('<CardBoard>', () => {
  it('カードを列に並べ、中身は renderCard で描く', () => {
    const { container } = render(
      <CardBoard cards={duties} columnCount={2} onMove={() => {}} renderCard={(d) => <h3>{d.title}</h3>} />,
    )
    // 総会（大きい）が左の列、残りは短い列から順に
    expect(columnsOf(container)).toEqual([['a'], ['b', 'c']])
    expect(screen.getByRole('heading', { name: '総会' })).toBeTruthy()
  })

  it('覚えている列と順番のとおりに並べる', () => {
    const placed: Duty[] = [
      { ...duties[0], column: 1, order: 0 },
      { ...duties[1], column: 0, order: 1 },
      { ...duties[2], column: 0, order: 0 },
    ]
    const { container } = render(<CardBoard cards={placed} columnCount={2} onMove={() => {}} renderCard={(d) => d.title} />)
    expect(columnsOf(container)).toEqual([['c', 'b'], ['a']])
  })

  it('つかむところ（dragHandle）と列の番号を渡す。止めているときは空', () => {
    const seen: Record<string, CardBoardCardState> = {}
    const renderCard = (d: Duty, s: CardBoardCardState) => {
      seen[d.id] = s
      return (
        <button type="button" {...s.dragHandle}>
          {d.title}
        </button>
      )
    }
    const { rerender } = render(<CardBoard cards={duties} columnCount={2} onMove={() => {}} renderCard={renderCard} />)
    expect(seen.c.column).toBe(1)
    expect(seen.a.isDragging).toBe(false)
    expect(seen.a.dropEdge).toBeNull()
    expect(seen.a.dragHandle['aria-roledescription']).toBeTruthy()
    expect(typeof seen.a.dragHandle.ref).toBe('function')

    rerender(<CardBoard cards={duties} columnCount={2} disabled onMove={() => {}} renderCard={renderCard} />)
    expect(seen.a.dragHandle).toEqual({})
  })

  it('addon は、いちばん短い列の下（列の下の空きの前）に置く', () => {
    const { container } = render(
      <CardBoard
        cards={duties.slice(0, 2)}
        columnCount={2}
        onMove={() => {}}
        renderCard={(d) => d.title}
        addon={<button type="button">役目を足す</button>}
      />,
    )
    const cols = container.querySelectorAll('[data-card-column]')
    expect(cols[1].textContent).toContain('役目を足す')
    expect(cols[1].lastElementChild?.hasAttribute('data-card-column-end')).toBe(true)
  })

  it('見た目は style で付ける（.linkshelf の外でも段組みになる）', () => {
    const { container } = render(<CardBoard cards={duties} columnCount={3} gap={10} onMove={() => {}} renderCard={(d) => d.title} />)
    const board = container.querySelector('[data-card-board]') as HTMLElement
    expect(board.style.display).toBe('flex')
    expect(board.style.gap).toBe('10px')
    expect(container.querySelectorAll('[data-card-column]')).toHaveLength(3)
  })
})
