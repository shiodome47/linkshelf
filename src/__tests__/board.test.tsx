import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dropPosition, flattenCards, layoutCards, moveCard, pointerPosition, useColumnCount, type CardLike } from '../index'

const over = { top: 100, height: 40 } // 真ん中は 120

describe('ドラッグの道具', () => {
  it('落とす位置は、指（マウス）の位置で決める（つかんだものの大きさによらない）', () => {
    // 背の高いカード（800px）の上のほうをつかんで、相手の上半分へ
    const tall = { activatorEvent: new MouseEvent('mousedown', { clientX: 10, clientY: 50 }), delta: { x: 0, y: 60 }, active: { rect: { current: { translated: { top: 100, height: 800 } } } } }
    expect(pointerPosition(tall)).toEqual({ x: 10, y: 110 })
    expect(dropPosition(tall, over)).toBe('before')
    expect(dropPosition({ ...tall, delta: { x: 0, y: 80 } }, over)).toBe('after')
  })

  it('指でつかんだとき（タッチ）も同じ', () => {
    const touch = { touches: [{ clientX: 5, clientY: 30 }] } as unknown as Event
    expect(dropPosition({ activatorEvent: touch, delta: { x: 0, y: 100 }, active: { rect: { current: { translated: null } } } }, over)).toBe('after')
  })

  it('キーボードで動かすとき（位置が無い）は、つかんだものの上の辺で決める', () => {
    const key = new KeyboardEvent('keydown', { key: ' ' })
    expect(pointerPosition({ activatorEvent: key, delta: { x: 0, y: 0 }, active: { rect: { current: { translated: { top: 90, height: 300 } } } } })).toBeNull()
    expect(dropPosition({ activatorEvent: key, delta: { x: 0, y: 0 }, active: { rect: { current: { translated: { top: 90, height: 300 } } } } }, over)).toBe('before')
  })

  it('列の数は、要素の幅から決める', () => {
    let seen = 0
    function Probe() {
      const [ref, count] = useColumnCount({ minWidth: 300, gap: 10 })
      seen = count
      return <div ref={ref} />
    }
    const spy = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 930 })
    act(() => {
      render(<Probe />)
    })
    expect(seen).toBe(3) // (930 + 10) / (300 + 10) = 3.03
    if (spy) Object.defineProperty(HTMLElement.prototype, 'clientWidth', spy)
  })

  it('並べ方の関数を、外から使える', () => {
    const cards: CardLike[] = [
      { id: 'a', order: 0, size: 10 },
      { id: 'b', order: 1, size: 1 },
      { id: 'c', order: 2, size: 1 },
    ]
    expect(layoutCards(cards, 2).map((c) => c.map((x) => x.id))).toEqual([['a'], ['b', 'c']])
    const places = moveCard(cards, 2, 'c', { kind: 'card', id: 'a', position: 'before' })
    expect(places.find((p) => p.id === 'c')).toMatchObject({ column: 0, order: 0 })
    expect(flattenCards(cards).map((c) => c.id)).toEqual(['a', 'b', 'c'])
  })
})
