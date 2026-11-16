import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { FolderPlus, Link as LinkGlyph, RefreshCw, Search, X } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from './components/ui/Button'
import { ConfirmDialog } from './components/ui/ConfirmDialog'
import { EmptyState } from './components/ui/EmptyState'
import { CategoryCrudDialog } from './components/CategoryCrudDialog'
import { CategoryManageDialog } from './components/CategoryManageDialog'
import { CategoryWidget } from './components/CategoryWidget'
import { LinkCrudDialog } from './components/LinkCrudDialog'
import { RetitleDialog } from './components/RetitleDialog'
import { LinkIcon as ResourceIcon } from './components/SiteIcon'
import { LinkShelfProvider, useLinkShelf } from './context'
import {
  columnDropId,
  type CardDragData,
  type CardDropIndicator,
  type DropData,
  type LinkDragData,
  type LinkDropIndicator,
} from './dnd/types'
import { layoutCards, moveCard, type CardLike } from './layout'
import { indexedDbStorage } from './storage/indexedDb'
import type { LinkShelfStorage } from './storage/types'
import { groupLinksByCategory, type FetchTitle } from './store'
import type { Category, Link } from './types'
import { ThemeProvider, type LinkShelfTheme } from './theme'
import { cn } from './utils/cn'

/** カード 1 列の最小幅（px）。これをもとに列数を決める */
const MIN_COLUMN_WIDTH = 300
const COLUMN_GAP = 16

export interface LinkShelfProps {
  /** 保存先。渡さなければブラウザの IndexedDB（名前は 'linkshelf'）。はじめに渡したものを使い続ける */
  storage?: LinkShelfStorage
  /** ページの名前を取る窓口。渡さなければ、名前は URL から作る（「名前を取り直す」も出さない） */
  fetchTitle?: FetchTitle
  /** 見出し（既定は「リンク集」） */
  title?: string
  /** 明るさ。light / dark / system（端末の設定に合わせる。既定） */
  theme?: LinkShelfTheme
  /** 見出しの右に足すもの（テーマの切り替えボタンなど） */
  actions?: ReactNode
  /** いちばん外側の要素に足す class */
  className?: string
}

/**
 * リンク集の部品。リンク・1 行テキスト・長めのテキストを、カードに分けて棚に並べる。
 *
 * - カテゴリごとのカードを段組みで並べ、リンクは「アイコン＋名前」の 1 行で見せる
 * - カード下の「リンク・テキストを追加」で URL を貼り付けるだけで追加できる
 * - リンクはドラッグで並び替え・別のカテゴリへ移動、カードもドラッグで並び替えられる
 * - カードの「整理する」から、名前の変更・まとめて移動／削除・並べ替えができる
 */
export function LinkShelf({ storage, fetchTitle, title, theme = 'system', actions, className }: LinkShelfProps) {
  // 保存先は最初の 1 回だけ決める（描くたびに IndexedDB を開き直さないように）
  const [store] = useState(() => storage ?? indexedDbStorage())
  return (
    <LinkShelfProvider storage={store} fetchTitle={fetchTitle}>
      <ThemeProvider value={theme}>
        <Shelf title={title} theme={theme} actions={actions} className={className} />
      </ThemeProvider>
    </LinkShelfProvider>
  )
}

function Shelf({
  title = 'リンク集',
  theme,
  actions,
  className,
}: {
  title?: string
  theme: LinkShelfTheme
  actions?: ReactNode
  className?: string
}) {
  const { categories, links, loaded, loadAll, watch, canFetchTitle, deleteCategory, deleteLinks, arrangeCategories, moveLink } =
    useLinkShelf()

  // 保存先から読む（読めなかったときは、見出しの下に知らせる）
  const [loadError, setLoadError] = useState(false)
  useEffect(() => {
    loadAll().catch(() => setLoadError(true))
  }, [loadAll])
  // 保存先が「変わったら知らせる」窓口を持っていれば、知らせのたびに読み直す（同期など）
  useEffect(() => watch(), [watch])

  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0

  // ─── ダイアログ状態 ───────────────────────────────────────
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [managingId, setManagingId] = useState<string | null>(null)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [deletingLinks, setDeletingLinks] = useState<Link[] | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  /** 名前を取り直す対象。'all' はすべてのリンクから選ぶ */
  const [retitling, setRetitling] = useState<'all' | string[] | null>(null)

  // ─── 表示するカードとリンク ───────────────────────────────
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    [categories],
  )
  const linksByCategory = useMemo(() => groupLinksByCategory(links), [links])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sortedCategories
      .map((category) => {
        const all = linksByCategory.get(category.id) ?? []
        if (!q) return { category, links: all }
        const categoryHit = category.name.toLowerCase().includes(q)
        const hits = all.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            l.url.toLowerCase().includes(q) ||
            (l.text ?? '').toLowerCase().includes(q) ||
            l.description.toLowerCase().includes(q) ||
            l.tags.some((t) => t.toLowerCase().includes(q)),
        )
        return { category, links: categoryHit && hits.length === 0 ? all : hits, show: categoryHit || hits.length > 0 }
      })
      .filter((v) => !('show' in v) || v.show)
  }, [sortedCategories, linksByCategory, query])

  // ─── 段組み（列数は画面幅から決め、カードを低い列から順に詰める） ───
  const [columnCount, setColumnCount] = useState(1)
  const observerRef = useRef<ResizeObserver | null>(null)
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!el) return
    const update = () => {
      const width = el.clientWidth
      setColumnCount(Math.max(1, Math.floor((width + COLUMN_GAP) / (MIN_COLUMN_WIDTH + COLUMN_GAP))))
    }
    update()
    // ResizeObserver の無い環境（古いブラウザやテスト）では、最初の幅だけで決める
    if (typeof ResizeObserver === 'undefined') return
    observerRef.current = new ResizeObserver(update)
    observerRef.current.observe(el)
  }, [])
  useEffect(() => () => observerRef.current?.disconnect(), [])

  // ドラッグで並べた列（何列目の何番目か）を覚えていれば、そのとおりに並べる（layout.ts）
  const columns = useMemo(
    () =>
      layoutCards(
        visible.map((item) => ({ id: item.category.id, order: item.category.order, column: item.category.column, size: item.links.length, item })),
        columnCount,
      ).map((col) => col.map((c) => c.item)),
    [visible, columnCount],
  )
  const cardLikes = useCallback(
    (): CardLike[] =>
      categories.map((c) => ({ id: c.id, order: c.order, column: c.column, size: linksByCategory.get(c.id)?.length ?? 0 })),
    [categories, linksByCategory],
  )

  // ─── ドラッグ＆ドロップ ────────────────────────────────────
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )
  const [active, setActive] = useState<LinkDragData | CardDragData | null>(null)
  const [indicator, setIndicator] = useState<LinkDropIndicator>(null)
  const [cardTarget, setCardTarget] = useState<CardDropIndicator>(null)
  const draggedAt = useRef(0)
  const wasDragging = useCallback(() => Date.now() - draggedAt.current < 300, [])

  /** ドラッグしているものに合う落とし先だけを当たり判定に使う */
  const collision: CollisionDetection = useCallback((args) => {
    const kind = (args.active.data.current as LinkDragData | CardDragData | undefined)?.kind
    const containers = args.droppableContainers.filter((c) => {
      const drop = c.data.current as DropData | undefined
      return kind === 'card' ? drop?.kind === 'card' || drop?.kind === 'column' : drop?.kind === 'link' || drop?.kind === 'list'
    })
    const hits = pointerWithin({ ...args, droppableContainers: containers })
    if (kind === 'link') {
      // リンク行に重なっていれば、それを優先（一覧の枠より細かい位置が分かる）
      const row = hits.find((h) => (containers.find((c) => c.id === h.id)?.data.current as DropData)?.kind === 'link')
      if (row) return [row]
    }
    return hits
  }, [])

  const computeTarget = (event: DragMoveEvent) => {
    const { active: a, over } = event
    const data = a.data.current as LinkDragData | CardDragData | undefined
    const drop = over?.data.current as DropData | undefined
    if (!data || !drop || !over) {
      setIndicator(null)
      setCardTarget(null)
      return
    }
    if (data.kind === 'card') {
      if (drop.kind === 'column' && drop.column !== undefined) {
        setCardTarget({ kind: 'end', column: drop.column })
        return
      }
      if (drop.kind !== 'card' || drop.categoryId === data.categoryId) {
        setCardTarget(null)
        return
      }
      // 持っているカードの真ん中が、相手のカードの上半分なら上、下半分なら下へ
      const rect = a.rect.current.translated
      const center = rect ? rect.top + rect.height / 2 : 0
      const position = center < over.rect.top + over.rect.height / 2 ? 'before' : 'after'
      setCardTarget({ kind: 'card', categoryId: drop.categoryId, position })
      return
    }
    if (drop.kind === 'link' && drop.linkId) {
      if (drop.linkId === data.linkId) {
        setIndicator(null)
        return
      }
      const rect = a.rect.current.translated
      const center = rect ? rect.top + rect.height / 2 : 0
      const position = center < over.rect.top + over.rect.height / 2 ? 'before' : 'after'
      setIndicator({ kind: 'link', linkId: drop.linkId, position })
    } else {
      setIndicator({ kind: 'list', categoryId: drop.categoryId })
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActive((event.active.data.current as LinkDragData | CardDragData) ?? null)
  }

  const resetDrag = () => {
    draggedAt.current = Date.now()
    setActive(null)
    setIndicator(null)
    setCardTarget(null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const data = event.active.data.current as LinkDragData | CardDragData | undefined
    const currentIndicator = indicator
    const currentCardTarget = cardTarget
    resetDrag()
    if (!data) return

    if (data.kind === 'card') {
      if (!currentCardTarget) return
      const drop =
        currentCardTarget.kind === 'end'
          ? currentCardTarget
          : { kind: 'card' as const, id: currentCardTarget.categoryId, position: currentCardTarget.position }
      await arrangeCategories(moveCard(cardLikes(), columnCount, data.categoryId, drop))
      return
    }

    if (!currentIndicator) return
    if (currentIndicator.kind === 'list') {
      await moveLink(data.linkId, currentIndicator.categoryId)
      return
    }
    const target = links.find((l) => l.id === currentIndicator.linkId)
    if (!target) return
    const siblings = (linksByCategory.get(target.categoryId) ?? []).filter((l) => l.id !== data.linkId)
    const index = siblings.findIndex((l) => l.id === target.id)
    await moveLink(data.linkId, target.categoryId, currentIndicator.position === 'before' ? index : index + 1)
  }

  const activeLink = active?.kind === 'link' ? links.find((l) => l.id === active.linkId) : undefined
  const activeCategory = active?.kind === 'card' ? categories.find((c) => c.id === active.categoryId) : undefined

  const dialogOnTop =
    editingLink !== null || deletingLinks !== null || deletingCategory !== null || retitling !== null

  return (
    <div className={cn('linkshelf', className)} data-theme={theme}>
    <div className="bg-neutral-950 text-neutral-100">
      {/* ヘッダー */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-neutral-800 px-4 py-3 sm:px-6">
        <h2 className="text-sm font-semibold text-neutral-200">{title}</h2>
        {categories.length > 0 && (
          <div className="relative order-last w-full sm:order-none sm:ml-4 sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
              placeholder="リンクを検索"
              aria-label="リンクを検索"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-8 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent-500 [&::-webkit-search-cancel-button]:hidden"
            />
            {searching && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="検索をクリア"
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-neutral-500 hover:text-neutral-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {actions}
          {canFetchTitle && links.length > 0 && (
            <Button
              size="sm"
              onClick={() => setRetitling('all')}
              title="ページのタイトルから名前をまとめて取り直す"
              aria-label="名前を取り直す"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">名前を取り直す</span>
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setAddCategoryOpen(true)}>
            <FolderPlus className="h-3.5 w-3.5" />
            カテゴリを追加
          </Button>
        </div>
      </div>

      {/* 本体 */}
      <div>
        {loadError ? (
          <p role="alert" className="py-16 text-center text-sm text-red-400">データを読み込めませんでした</p>
        ) : !loaded ? null : categories.length === 0 ? (
          <EmptyState
            icon={<LinkGlyph />}
            title="リンクを整理しましょう"
            description="カテゴリ（例: 仕事、趣味、読みもの）を作って、よく使うサイトのリンクを貼り付けていきます"
            action={{ label: 'カテゴリを追加', onClick: () => setAddCategoryOpen(true) }}
          />
        ) : searching && visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-500">「{query.trim()}」に一致するリンクはありません</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collision}
            onDragStart={handleDragStart}
            onDragMove={computeTarget}
            onDragOver={computeTarget}
            onDragEnd={(e) => void handleDragEnd(e)}
            onDragCancel={resetDrag}
          >
            <div ref={containerRef} className="flex items-stretch p-4" style={{ gap: COLUMN_GAP }}>
              {columns.map((col, i) => (
                <div key={i} className="flex min-w-0 flex-1 flex-col" style={{ gap: COLUMN_GAP }} data-testid="card-column">
                  {col.map(({ category, links: catLinks }) => (
                    <CategoryWidget
                      key={category.id}
                      category={category}
                      links={catLinks}
                      readOnly={searching}
                      indicator={indicator}
                      cardDropEdge={cardTarget?.kind === 'card' && cardTarget.categoryId === category.id ? cardTarget.position : null}
                      wasDragging={wasDragging}
                      onManage={(c) => setManagingId(c.id)}
                      onEditLink={setEditingLink}
                    />
                  ))}
                  {/* 列の下の空いているところ: カードを落とすと、この列のいちばん下へ */}
                  <ColumnEnd column={i} disabled={searching} marked={cardTarget?.kind === 'end' && cardTarget.column === i} />
                </div>
              ))}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeLink && (
                <div className="flex w-64 items-center gap-2.5 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-200 shadow-lg shadow-black/40">
                  <ResourceIcon link={activeLink} />
                  <span className="truncate">{activeLink.title}</span>
                </div>
              )}
              {activeCategory && (
                <div className="w-64 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-semibold text-neutral-100 shadow-lg shadow-black/40">
                  {activeCategory.name}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* ─── ダイアログ群 ───────────────────────────────────── */}

      <CategoryCrudDialog isOpen={addCategoryOpen} onClose={() => setAddCategoryOpen(false)} />

      <CategoryManageDialog
        categoryId={managingId}
        hidden={managingId === null || dialogOnTop}
        onClose={() => setManagingId(null)}
        onEditLink={setEditingLink}
        onDeleteLinks={setDeletingLinks}
        onRetitleLinks={(selected) => setRetitling(selected.map((l) => l.id))}
        onDeleteCategory={setDeletingCategory}
      />

      <RetitleDialog
        isOpen={canFetchTitle && retitling !== null}
        onClose={() => setRetitling(null)}
        linkIds={Array.isArray(retitling) ? retitling : undefined}
      />

      <LinkCrudDialog
        isOpen={editingLink !== null}
        onClose={() => setEditingLink(null)}
        link={editingLink ?? undefined}
        onDelete={(link) => {
          setEditingLink(null)
          setDeletingLinks([link])
        }}
      />

      <ConfirmDialog
        isOpen={deletingLinks !== null}
        onClose={() => setDeletingLinks(null)}
        onConfirm={async () => {
          if (deletingLinks) {
            await deleteLinks(deletingLinks.map((l) => l.id))
            setDeletingLinks(null)
          }
        }}
        title="リンクを削除"
        description={
          deletingLinks && deletingLinks.length === 1
            ? `「${deletingLinks[0].title}」を削除しますか？この操作は取り消せません。`
            : `選んだ ${deletingLinks?.length ?? 0} 件のリンクを削除しますか？この操作は取り消せません。`
        }
      />

      <ConfirmDialog
        isOpen={deletingCategory !== null}
        onClose={() => setDeletingCategory(null)}
        onConfirm={async () => {
          if (deletingCategory) {
            await deleteCategory(deletingCategory.id)
            setDeletingCategory(null)
            setManagingId(null)
          }
        }}
        title="カテゴリを削除"
        description={`「${deletingCategory?.name}」を削除しますか？\nこのカテゴリのリンクもすべて削除されます。この操作は取り消せません。`}
      />
    </div>
    </div>
  )
}

/** 列の下の空いているところ（カードを落とすと、その列のいちばん下へ入る） */
function ColumnEnd({ column, disabled, marked }: { column: number; disabled: boolean; marked: boolean }) {
  const drop = useDroppable({
    id: columnDropId(column),
    data: { kind: 'column', categoryId: '', column } satisfies DropData,
    disabled,
  })
  return (
    <div ref={drop.setNodeRef} className="relative min-h-16 flex-1" data-testid="column-end">
      {marked && <div aria-hidden="true" data-testid="card-drop-line" className="pointer-events-none absolute inset-x-1 -top-2.5 h-1 rounded-full bg-accent-500" />}
    </div>
  )
}
