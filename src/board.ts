import { MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * カードを段組みに並べ、ドラッグで動かす画面を作るための道具（linkshelf の棚と同じ仕組み）。
 * 並べ方そのもの（何列目の何番目か）は layout.ts の layoutCards / moveCard を使う。
 */

/**
 * 要素の幅から、段組みの列の数を決める（幅が変わると数え直す）。
 * 返した ref を、カードを並べる外側の要素に付ける
 */
export function useColumnCount({ minWidth, gap = 0, max = Infinity }: { minWidth: number; gap?: number; max?: number }) {
  const [count, setCount] = useState(1)
  const observer = useRef<ResizeObserver | null>(null)
  const ref = useCallback(
    (el: HTMLElement | null) => {
      observer.current?.disconnect()
      observer.current = null
      if (!el) return
      const update = () => setCount(Math.max(1, Math.min(max, Math.floor((el.clientWidth + gap) / (minWidth + gap)))))
      update()
      // ResizeObserver の無い環境（古いブラウザやテスト）では、最初の幅だけで決める
      if (typeof ResizeObserver === 'undefined') return
      observer.current = new ResizeObserver(update)
      observer.current.observe(el)
    },
    [minWidth, gap, max],
  )
  useEffect(() => () => observer.current?.disconnect(), [])
  return [ref, count] as const
}

/**
 * ドラッグの始め方（@dnd-kit の sensors）。
 * マウスは 5px 動かすと（ただのクリックはそのまま押せる）、スマホは長押し 0.25 秒で（ふつうに指を動かせばスクロール）
 */
export function useDragSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )
}

/** @dnd-kit のドラッグ中・ドロップのイベントのうち、ここで使うところ */
export interface DragPointerEvent {
  activatorEvent: Event | null
  delta: { x: number; y: number }
  active: { rect: { current: { translated: { top: number; height: number } | null } } }
}

/**
 * 今の指（マウス）の位置。つかんだときの位置に、動いた分を足す。
 * 指やマウスの位置が分からない（キーボードで動かす）ときは null
 */
export function pointerPosition(e: DragPointerEvent): { x: number; y: number } | null {
  const start = e.activatorEvent
  if (!start) return null
  const touches = (start as TouchEvent).touches
  const point =
    touches && touches.length
      ? { x: touches[0].clientX, y: touches[0].clientY }
      : 'clientY' in start && typeof (start as MouseEvent).clientY === 'number'
        ? { x: (start as MouseEvent).clientX, y: (start as MouseEvent).clientY }
        : null
  return point ? { x: point.x + e.delta.x, y: point.y + e.delta.y } : null
}

/**
 * 相手（over）の上半分に落とすか、下半分に落とすか。
 * 指（マウス）の位置で決める（つかんだものの大きさによらない。背の高いカードでも、短いカードの上に置ける）。
 * キーボードで動かすときは、つかんだものの上の辺で決める
 */
export function dropPosition(e: DragPointerEvent, over: { top: number; height: number }): 'before' | 'after' {
  const p = pointerPosition(e)
  const y = p ? p.y : (e.active.rect.current.translated?.top ?? 0) + 1
  return y < over.top + over.height / 2 ? 'before' : 'after'
}
