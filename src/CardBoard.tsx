import {
  closestCenter,
  DndContext,
  DragOverlay,
  pointerWithin,
  useDraggable,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
  type SensorDescriptor,
  type SensorOptions,
} from '@dnd-kit/core'
import { useId, useMemo, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { dropPosition, useColumnCount, useDragSensors } from './board'
import { layoutCards, moveCard, type CardDrop, type CardLike, type CardPlace } from './layout'

/**
 * カードを段組みに並べ、ドラッグで動かす部品（linkshelf の棚と同じ並べ方・動かし方）。
 * カードの中身は renderCard で自由に描く。動かしたら onMove に、全カードの列と順番が届くので、保存する。
 *
 * - 列の数は、幅から決める（minColumnWidth）。columnCount を渡せば、その数で並べる
 * - 置いた列と順番を覚えていれば、そのとおりに並べる。足りないとき（スマホ）は左上から読む順に詰める
 * - 落とす先は、指（マウス）の位置で決める。カードの上半分なら上、下半分なら下。列の下の空きなら、その列のいちばん下
 * - 見た目は style で付ける（Tailwind の範囲 .linkshelf の外でも、そのまま使える）
 */

/** カードを描くときに渡すもの */
export interface CardBoardCardState {
  /**
   * つかむところに付ける（ref も含む）。ボタンや見出しに {...dragHandle} と書く。
   * disabled のときは空（何もしない）
   */
  dragHandle: HTMLAttributes<HTMLElement> & { ref?: (element: HTMLElement | null) => void }
  /** このカードをドラッグしているところか */
  isDragging: boolean
  /** ドラッグ中に、このカードの上・下へ落とすところなら、その向き */
  dropEdge: 'before' | 'after' | null
  /** 何列目に並んでいるか（0 から） */
  column: number
}

/** カード以外のドラッグ（カードの中の行など）を、同じ DndContext で扱うとき */
export interface CardBoardDnd {
  /** カード以外をドラッグしているときの当たり判定（既定は pointerWithin）。カードの受け皿は含まない */
  collisionDetection?: CollisionDetection
  onDragStart?: (event: DragStartEvent) => void
  onDragMove?: (event: DragMoveEvent) => void
  onDragOver?: (event: DragOverEvent) => void
  onDragEnd?: (event: DragEndEvent) => void
  onDragCancel?: () => void
  /** カード以外をドラッグしているときに、指（マウス）について動かすもの */
  overlay?: ReactNode
}

export interface CardBoardProps<T extends CardLike> {
  /** 並べるカード（id・order・column・size。size は高さの目安になる行の数） */
  cards: T[]
  /** カード 1 枚を描く */
  renderCard: (card: T, state: CardBoardCardState) => ReactNode
  /**
   * カードを動かしたとき。places は全カードの列と順番（column が無いものは、列をまだ覚えていない）。
   * 変わったものだけを保存すればよい
   */
  onMove: (places: CardPlace[], move: { id: string; drop: CardDrop }) => void
  /** 列の幅の下限（px）。これと幅から列の数を決める。既定は 300 */
  minColumnWidth?: number
  /** カードとカード・列と列のあいだ（px）。既定は 16 */
  gap?: number
  /** 列の数の上限 */
  maxColumns?: number
  /** 列の数を外で決めるとき（渡すと、幅からは数えない） */
  columnCount?: number
  /** 並べ替えを止める（読むだけ・絞り込み中など） */
  disabled?: boolean
  /** ドラッグ中に指（マウス）について動かすもの。渡さなければ、カードそのものが動く */
  renderOverlay?: (card: T) => ReactNode
  /** いちばん短い列の下に置くもの（「カードを足す」ボタンなど） */
  addon?: ReactNode
  /** 落とす先の線の色。既定は linkshelf の色（--ls-accent-hover） */
  dropLineColor?: string
  /** 列の下の空き（落とすと、その列のいちばん下へ）の最小の高さ（px）。既定は 64 */
  columnEndHeight?: number
  /** ドラッグの始め方。既定は useDragSensors()（マウス 5px・長押し 0.25 秒）。キーボードを足すときなどに */
  sensors?: SensorDescriptor<SensorOptions>[]
  /** カード以外のドラッグを、同じ DndContext で扱うとき */
  dnd?: CardBoardDnd
  className?: string
  style?: CSSProperties
  columnClassName?: string
}

interface CardDragData {
  cardBoard: string
  id: string
}
interface CardDropData {
  cardBoard: string
  kind: 'card' | 'end'
  id?: string
  column?: number
}

/** カードの高さの目安（layout.ts と同じ: 見出しの分 3 ＋ 行） */
const height = (c: CardLike) => 3 + Math.max(1, c.size)

export function CardBoard<T extends CardLike>({
  cards,
  renderCard,
  onMove,
  minColumnWidth = 300,
  gap = 16,
  maxColumns,
  columnCount,
  disabled = false,
  renderOverlay,
  addon,
  dropLineColor = 'var(--ls-accent-hover, #14b8a6)',
  columnEndHeight = 64,
  sensors,
  dnd,
  className,
  style,
  columnClassName,
}: CardBoardProps<T>) {
  const board = useId()
  const [measureRef, measured] = useColumnCount({ minWidth: minColumnWidth, gap, max: maxColumns })
  const count = Math.max(1, columnCount ?? measured)
  const columns = useMemo(() => layoutCards(cards, count), [cards, count])
  const defaultSensors = useDragSensors()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [drop, setDrop] = useState<CardDrop | null>(null)

  const mine = (data: unknown): data is CardDragData => (data as CardDragData | undefined)?.cardBoard === board
  const mineDrop = (data: unknown): data is CardDropData => (data as CardDropData | undefined)?.cardBoard === board

  const collision: CollisionDetection = (args) => {
    if (!mine(args.active.data.current)) {
      const others = args.droppableContainers.filter((c) => !mineDrop(c.data.current))
      return (dnd?.collisionDetection ?? pointerWithin)({ ...args, droppableContainers: others })
    }
    const activeCard = (args.active.data.current as CardDragData).id
    const targets = args.droppableContainers.filter((c) => {
      const d = c.data.current
      return mineDrop(d) && !(d.kind === 'card' && d.id === activeCard)
    })
    // 指（マウス）の位置で決める
    if (args.pointerCoordinates) return pointerWithin({ ...args, droppableContainers: targets })
    // キーボードで動かすときは、動かした先（つかんだカードの左上の角）にあるもので。
    // いちばん近いもの（真ん中どうし）で選ぶと、背の高い「列の下の空き」ばかりが選ばれてしまう
    const r = args.collisionRect
    const corner = { x: r.left + 1, y: r.top + 1 }
    const hits = pointerWithin({ ...args, droppableContainers: targets, pointerCoordinates: corner })
    return hits.length ? hits : closestCenter({ ...args, droppableContainers: targets })
  }

  const targetOf = (e: DragMoveEvent | DragOverEvent | DragEndEvent): CardDrop | null => {
    const over = e.over
    const d = over?.data.current
    if (!over || !mineDrop(d)) return null
    if (d.kind === 'end') return { kind: 'end', column: d.column ?? 0 }
    if (!d.id || d.id === (e.active.data.current as CardDragData).id) return null
    return { kind: 'card', id: d.id, position: dropPosition(e, over.rect) }
  }

  const sameDrop = (a: CardDrop | null, b: CardDrop | null) => JSON.stringify(a) === JSON.stringify(b)
  const track = (e: DragMoveEvent | DragOverEvent) => {
    const next = targetOf(e)
    setDrop((cur) => (sameDrop(cur, next) ? cur : next))
  }

  const shortest = columns.reduce(
    (best, col, i, all) => (col.reduce((h, c) => h + height(c), 0) < all[best].reduce((h, c) => h + height(c), 0) ? i : best),
    0,
  )
  const activeCard = activeId ? cards.find((c) => c.id === activeId) : undefined

  return (
    <DndContext
      sensors={sensors ?? defaultSensors}
      collisionDetection={collision}
      onDragStart={(e) => {
        if (mine(e.active.data.current)) setActiveId(e.active.data.current.id)
        else dnd?.onDragStart?.(e)
      }}
      onDragMove={(e) => (mine(e.active.data.current) ? track(e) : dnd?.onDragMove?.(e))}
      onDragOver={(e) => (mine(e.active.data.current) ? track(e) : dnd?.onDragOver?.(e))}
      onDragCancel={(e) => {
        if (mine(e.active.data.current)) {
          setActiveId(null)
          setDrop(null)
        } else dnd?.onDragCancel?.()
      }}
      onDragEnd={(e) => {
        if (!mine(e.active.data.current)) {
          dnd?.onDragEnd?.(e)
          return
        }
        const target = targetOf(e)
        const id = e.active.data.current.id
        setActiveId(null)
        setDrop(null)
        if (target) onMove(moveCard(cards, count, id, target), { id, drop: target })
      }}
    >
      <div
        ref={columnCount === undefined ? measureRef : undefined}
        className={className}
        style={{ display: 'flex', alignItems: 'stretch', gap, ...style }}
        data-card-board=""
      >
        {columns.map((col, i) => (
          <div
            key={i}
            className={columnClassName}
            style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minWidth: 0, gap }}
            data-card-column={i}
          >
            {col.map((card) => (
              <Slot
                key={card.id}
                board={board}
                card={card}
                column={i}
                gap={gap}
                disabled={disabled}
                follow={!renderOverlay}
                dropEdge={drop?.kind === 'card' && drop.id === card.id ? drop.position : null}
                lineColor={dropLineColor}
                renderCard={renderCard}
              />
            ))}
            {i === shortest && addon}
            <ColumnEnd
              board={board}
              column={i}
              gap={gap}
              height={columnEndHeight}
              disabled={disabled}
              marked={drop?.kind === 'end' && drop.column === i}
              lineColor={dropLineColor}
            />
          </div>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>{activeCard && renderOverlay ? renderOverlay(activeCard) : activeId ? null : dnd?.overlay}</DragOverlay>
    </DndContext>
  )
}

function Slot<T extends CardLike>({
  board,
  card,
  column,
  gap,
  disabled,
  follow,
  dropEdge,
  lineColor,
  renderCard,
}: {
  board: string
  card: T
  column: number
  gap: number
  disabled: boolean
  follow: boolean
  dropEdge: 'before' | 'after' | null
  lineColor: string
  renderCard: (card: T, state: CardBoardCardState) => ReactNode
}) {
  const drag = useDraggable({ id: `${board}card:${card.id}`, data: { cardBoard: board, id: card.id } satisfies CardDragData, disabled })
  const dropZone = useDroppable({
    id: `${board}card:${card.id}`, // つかむものと同じ id（キーボードで動かす道具が、つかんだカードの受け皿を id で探すため）
    data: { cardBoard: board, kind: 'card', id: card.id } satisfies CardDropData,
    disabled,
  })
  const t = follow && drag.isDragging ? drag.transform : null
  const dragHandle: CardBoardCardState['dragHandle'] = disabled
    ? {}
    : { ...drag.attributes, ...drag.listeners, ref: drag.setActivatorNodeRef }
  return (
    <div
      ref={(node) => {
        drag.setNodeRef(node)
        dropZone.setNodeRef(node)
      }}
      style={{
        position: 'relative',
        ...(t ? { transform: `translate3d(${t.x}px, ${t.y}px, 0)`, zIndex: 5 } : {}),
      }}
      data-card-slot={card.id}
    >
      {renderCard(card, { dragHandle, isDragging: drag.isDragging, dropEdge, column })}
      {dropEdge && <DropLine edge={dropEdge} gap={gap} color={lineColor} />}
    </div>
  )
}

function ColumnEnd({
  board,
  column,
  gap,
  height,
  disabled,
  marked,
  lineColor,
}: {
  board: string
  column: number
  gap: number
  height: number
  disabled: boolean
  marked: boolean
  lineColor: string
}) {
  const zone = useDroppable({ id: `${board}end:${column}`, data: { cardBoard: board, kind: 'end', column } satisfies CardDropData, disabled })
  return (
    <div ref={zone.setNodeRef} style={{ position: 'relative', flex: `1 0 ${height}px` }} data-card-column-end={column} aria-hidden="true">
      {marked && <DropLine edge="before" gap={gap} color={lineColor} />}
    </div>
  )
}

/** 落とす先の線（カードとカードのあいだの真ん中） */
function DropLine({ edge, gap, color }: { edge: 'before' | 'after'; gap: number; color: string }) {
  const offset = -(gap / 2) - 2
  return (
    <div
      aria-hidden="true"
      data-card-drop-line={edge}
      style={{
        position: 'absolute',
        left: 4,
        right: 4,
        height: 4,
        borderRadius: 9999,
        background: color,
        pointerEvents: 'none',
        zIndex: 10,
        ...(edge === 'before' ? { top: offset } : { bottom: offset }),
      }}
    />
  )
}
