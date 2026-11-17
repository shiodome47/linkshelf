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
import { FolderPlus, Link as LinkGlyph, RefreshCw, Search, Star, X } from 'lucide-react'
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
import { categoryColorClass } from './categoryColors'
import type { Category, Link } from './types'
import { LocaleProvider, MESSAGES, useMessages, type LinkShelfLocale } from './i18n'
import { OptionsProvider, type UploadImage } from './options'
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
  /** 見出し（既定は「リンク集」。英語では「Links」） */
  title?: string
  /** 画面の言葉。ja（日本語。既定）か en（英語） */
  locale?: LinkShelfLocale
  /** 明るさ。light / dark / system（端末の設定に合わせる。既定） */
  theme?: LinkShelfTheme
  /**
   * 閲覧専用。リンクを開く・検索・お気に入りだけ表示はできるが、
   * 追加・編集・削除・並べ替え・星を付けることはできない。
   * 画面で隠すだけなので、書き換えを本当に防ぐには、保存先（サーバー）の側でも書き込みを断ること
   */
  readOnly?: boolean
  /**
   * カテゴリの帯（カテゴリ名を横に並べ、押すとそのカードへ飛ぶ。下へスクロールしても上に残る）。
   * auto: 1 列で並ぶ狭い画面（スマホ）のときだけ出す（既定）／ always: いつも出す／ never: 出さない
   */
  jumpBar?: 'auto' | 'always' | 'never'
  /** カードをたためるようにする（見出しの右にボタンが出る）。既定は false */
  collapsible?: boolean
  /**
   * たたんだカードを覚えておく名前。見る人のブラウザ（localStorage）に保存する。
   * 1 つのサイトに <LinkShelf> を 2 つ置くときは、別の名前にする（既定は 'linkshelf'）
   */
  collapseKey?: string
  /**
   * 画像を受け取って置き、その URL を返す関数。渡すと、各カードに「画像を追加」が出る
   * （閲覧専用のときは出ない）。ドラッグ＆ドロップ・貼り付けでも受け付ける。
   * 大きさの上限などの確認は、この関数の中で行う
   */
  uploadImage?: UploadImage
  /** リンクのアイコンを差し替える。null を返すと既定の表示 */
  linkIcon?: (link: Link) => ReactNode | null
  /** リンクを開く方法を差し替える（危ない URL のときは呼ばれない） */
  openLink?: (url: string, link: Link) => void
  /** true のとき、同じサイト（オリジン）の URL は同じタブで開く */
  sameOriginInSameTab?: boolean
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
export function LinkShelf({
  storage,
  fetchTitle,
  title,
  locale = 'ja',
  theme = 'system',
  readOnly = false,
  jumpBar = 'auto',
  collapsible = false,
  collapseKey = 'linkshelf',
  uploadImage,
  linkIcon,
  openLink,
  sameOriginInSameTab = false,
  actions,
  className,
}: LinkShelfProps) {
  // 保存先は最初の 1 回だけ決める（描くたびに IndexedDB を開き直さないように）
  const [store] = useState(() => storage ?? indexedDbStorage())
  return (
    <LinkShelfProvider storage={store} fetchTitle={fetchTitle}>
      <LocaleProvider value={MESSAGES[locale] ?? MESSAGES.ja}>
        <ThemeProvider value={theme}>
          <OptionsProvider value={{ uploadImage, linkIcon, openLink, sameOriginInSameTab }}>
          <Shelf
            title={title}
            theme={theme}
            readOnly={readOnly}
            jumpBar={jumpBar}
            collapsible={collapsible}
            collapseKey={collapseKey}
            actions={actions}
            className={className}
          />
          </OptionsProvider>
        </ThemeProvider>
      </LocaleProvider>
    </LinkShelfProvider>
  )
}

function Shelf({
  title,
  theme,
  readOnly,
  jumpBar,
  collapsible,
  collapseKey,
  actions,
  className,
}: {
  title?: string
  theme: LinkShelfTheme
  readOnly: boolean
  jumpBar: 'auto' | 'always' | 'never'
  collapsible: boolean
  collapseKey: string
  actions?: ReactNode
  className?: string
}) {
  const { categories, links, loaded, loadAll, watch, canFetchTitle, deleteCategory, deleteLinks, arrangeCategories, moveLink } =
    useLinkShelf()
  const m = useMessages()
  const rootRef = useRef<HTMLDivElement>(null)
  const [collapsedIds, toggleCollapsed, expand] = useCollapsed(collapsible ? collapseKey : null)

  // 保存先から読む（読めなかったときは、見出しの下に知らせる）
  const [loadError, setLoadError] = useState(false)
  useEffect(() => {
    loadAll().catch(() => setLoadError(true))
  }, [loadAll])
  // 保存先が「変わったら知らせる」窓口を持っていれば、知らせのたびに読み直す（同期など）
  useEffect(() => watch(), [watch])

  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0
  /** お気に入り（星）のリンクだけを表示する */
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  /** 絞り込み中（検索・お気に入りだけ）は、並べ替えやその場での追加をさせない */
  const filtering = searching || favoritesOnly
  /** たたんでいるか（絞り込み中は、見つかったものが隠れないように、すべてひらく） */
  const isCollapsed = (id: string) => collapsible && !filtering && collapsedIds.has(id)

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
        const inCategory = linksByCategory.get(category.id) ?? []
        const all = favoritesOnly ? inCategory.filter((l) => l.isFavorited) : inCategory
        // お気に入りだけのときは、お気に入りが 1 つも無いカードを出さない
        if (!q) return favoritesOnly ? { category, links: all, show: all.length > 0 } : { category, links: all }
        const categoryHit = category.name.toLowerCase().includes(q)
        const hits = all.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            l.url.toLowerCase().includes(q) ||
            (l.text ?? '').toLowerCase().includes(q) ||
            l.description.toLowerCase().includes(q) ||
            l.tags.some((t) => t.toLowerCase().includes(q)),
        )
        const show = favoritesOnly ? hits.length > 0 || (categoryHit && all.length > 0) : categoryHit || hits.length > 0
        return { category, links: categoryHit && hits.length === 0 ? all : hits, show }
      })
      .filter((v) => !('show' in v) || v.show)
  }, [sortedCategories, linksByCategory, query, favoritesOnly])

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
        visible.map((item) => ({
          id: item.category.id,
          order: item.category.order,
          column: item.category.column,
          // たたんだカードは見出しだけの高さ
          size: isCollapsed(item.category.id) ? 0 : item.links.length,
          item,
        })),
        columnCount,
      ).map((col) => col.map((c) => c.item)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, columnCount, collapsedIds, filtering],
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
    <div ref={rootRef} className={cn('linkshelf', className)} data-theme={theme}>
    <div className="bg-neutral-950 text-neutral-100">
      {/* ヘッダー */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-neutral-800 px-4 py-3 sm:px-6">
        <h2 className="text-sm font-semibold text-neutral-200">{title ?? m.shelfTitle}</h2>
        {categories.length > 0 && (
          <div className="order-last flex w-full items-center gap-2 sm:order-none sm:ml-4 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
              placeholder={m.search}
              aria-label={m.search}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-8 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent-500 [&::-webkit-search-cancel-button]:hidden"
            />
            {searching && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={m.clearSearch}
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-neutral-500 hover:text-neutral-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFavoritesOnly((v) => !v)}
            aria-pressed={favoritesOnly}
            aria-label={m.favoritesOnly}
            title={favoritesOnly ? m.showAll : m.favoritesOnly}
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition-colors',
              favoritesOnly
                ? 'border-amber-400/60 bg-amber-400/10 text-amber-400'
                : 'border-neutral-800 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300',
            )}
          >
            <Star className={cn('h-3.5 w-3.5', favoritesOnly && 'fill-amber-400')} />
          </button>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {actions}
          {!readOnly && canFetchTitle && links.length > 0 && (
            <Button
              size="sm"
              onClick={() => setRetitling('all')}
              title={m.retitleHint}
              aria-label={m.retitle}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{m.retitle}</span>
            </Button>
          )}
          {!readOnly && (
            <Button variant="primary" size="sm" onClick={() => setAddCategoryOpen(true)}>
              <FolderPlus className="h-3.5 w-3.5" />
              {m.addCategory}
            </Button>
          )}
        </div>
      </div>

      {/* 本体 */}
      <div>
        {loadError ? (
          <p role="alert" className="py-16 text-center text-sm text-red-400">{m.loadFailed}</p>
        ) : !loaded ? null : categories.length === 0 ? (
          <EmptyState
            icon={<LinkGlyph />}
            title={readOnly ? m.emptyReadOnly : m.emptyTitle}
            description={readOnly ? undefined : m.emptyDescription}
            action={readOnly ? undefined : { label: m.addCategory, onClick: () => setAddCategoryOpen(true) }}
          />
        ) : filtering && visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-500">
            {searching ? m.noMatch(query.trim()) : m.noFavorites}
          </p>
        ) : (
          <>
          {(jumpBar === 'always' || (jumpBar === 'auto' && columnCount === 1)) && visible.length > 1 && (
            <JumpBar
              label={m.jumpTo}
              categories={visible.map((v) => v.category)}
              onJump={(id) => {
                // たたんでいたら、ひらいてから飛ぶ
                expand(id)
                requestAnimationFrame(() => {
                  const el = rootRef.current?.querySelector<HTMLElement>(`[data-ls-category="${CSS.escape(id)}"]`)
                  el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
                })
              }}
            />
          )}
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
                      readOnly={filtering || readOnly}
                      filtered={filtering}
                      viewOnly={readOnly}
                      collapsible={collapsible}
                      collapsed={isCollapsed(category.id)}
                      onToggleCollapse={() => toggleCollapsed(category.id)}
                      indicator={indicator}
                      cardDropEdge={cardTarget?.kind === 'card' && cardTarget.categoryId === category.id ? cardTarget.position : null}
                      wasDragging={wasDragging}
                      onManage={(c) => setManagingId(c.id)}
                      onEditLink={setEditingLink}
                    />
                  ))}
                  {/* 列の下の空いているところ: カードを落とすと、この列のいちばん下へ */}
                  <ColumnEnd column={i} disabled={filtering || readOnly} marked={cardTarget?.kind === 'end' && cardTarget.column === i} />
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
          </>
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
        title={m.deleteLinkTitle}
        description={
          deletingLinks && deletingLinks.length === 1
            ? m.deleteOneLink(deletingLinks[0].title)
            : m.deleteManyLinks(deletingLinks?.length ?? 0)
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
        title={m.deleteCategoryTitle}
        description={m.deleteCategoryConfirm(deletingCategory?.name ?? '')}
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

/** 上の「カテゴリの帯」。押すと、そのカードへ飛ぶ */
function JumpBar({
  label,
  categories,
  onJump,
}: {
  label: string
  categories: Category[]
  onJump: (id: string) => void
}) {
  return (
    <nav
      aria-label={label}
      className="sticky top-[var(--ls-sticky-top,0px)] z-20 border-b border-neutral-800 bg-neutral-950"
    >
      <ul className="flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <li key={c.id} className="flex-shrink-0">
            <button
              type="button"
              onClick={() => onJump(c.id)}
              className="flex max-w-[12rem] items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-200 transition-colors hover:bg-neutral-800"
            >
              <span aria-hidden="true" className={cn('h-2 w-2 flex-shrink-0 rounded-full', categoryColorClass(c.color))} />
              <span className="truncate">{c.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * たたんだカードの id を、見る人のブラウザ（localStorage）に覚えておく。
 * key が null のときは、たたむ機能を使わない。保存できない環境では、開いている間だけ覚える
 */
function useCollapsed(key: string | null): [Set<string>, (id: string) => void, (id: string) => void] {
  const storageKey = key ? `linkshelf:collapsed:${key}` : null
  const [ids, setIds] = useState<Set<string>>(() => {
    if (!storageKey) return new Set()
    try {
      const raw = localStorage.getItem(storageKey)
      const list = raw ? (JSON.parse(raw) as unknown) : []
      return new Set(Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string') : [])
    } catch {
      return new Set()
    }
  })
  const save = (next: Set<string>) => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]))
    } catch {
      // 保存できなくても、開いている間は覚えている
    }
  }
  const toggle = (id: string) =>
    setIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      save(next)
      return next
    })
  const expand = (id: string) =>
    setIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      save(next)
      return next
    })
  return [ids, toggle, expand]
}
