import { useDraggable, useDroppable } from '@dnd-kit/core'
import { ChevronDown, FilePlus, FileText, GripVertical, ImagePlus, Info, ListChecks, Pencil, Plus, Repeat, Settings2, Square, SquareCheck, Star } from 'lucide-react'
import { type ClipboardEvent, type DragEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import type { Category, Link } from '../types'
import { cn } from '../utils/cn'
import { isSafeUrl, isSameOrigin, safeExternalUrl } from '../utils/url'
import { useOptions } from '../options'
import { categoryColorClass } from '../categoryColors'
import {
  cardDragId,
  cardDropId,
  linkDragId,
  linkDropId,
  listDropId,
  type CardDragData,
  type DropData,
  type LinkDragData,
  type LinkDropIndicator,
} from '../dnd/types'
import { isChecked, isOneLineText, localDateKey, normalizeLinkInput, oneLineTitle, parseCheckInput } from '../linkUtils'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { useLinkShelf } from '../context'
import { LinkIcon, SiteIcon } from './SiteIcon'
import { TextViewer } from './TextViewer'
import { useMessages } from '../i18n'
import { readTextFile, TEXT_ACCEPT } from '../textFile'

interface CategoryWidgetProps {
  category: Category
  links: Link[]
  /** 検索中など、並び替えやその場での追加をさせないとき */
  readOnly?: boolean
  /** 検索やお気に入りで絞り込んでいる（リンクが無いときの文を変える） */
  filtered?: boolean
  /** 閲覧専用（星を付ける・整理するも出さない） */
  viewOnly?: boolean
  /** たたむボタンを出す */
  collapsible?: boolean
  /** たたんでいる（見出しだけを出す） */
  collapsed?: boolean
  onToggleCollapse?: () => void
  /** リンクを落とす位置の目印 */
  indicator: LinkDropIndicator
  /** カードを落とす先として選ばれている */
  /** カードをここ（上か下）に落とすときの目印 */
  cardDropEdge?: 'before' | 'after' | null
  /** 直前までドラッグしていたか（ドラッグ直後のクリックでリンクを開かないため） */
  wasDragging: () => boolean
  onManage: (category: Category) => void
  onEditLink: (link: Link) => void
}

/**
 * カテゴリ 1 つ分のカード。
 * リンクは「アイコン＋タイトル」の 1 行で並べ、下の「リンクを追加」から URL を貼り付けて追加する。
 */
export function CategoryWidget({
  category,
  links,
  readOnly = false,
  filtered = false,
  viewOnly = false,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
  indicator,
  cardDropEdge = null,
  wasDragging,
  onManage,
  onEditLink,
}: CategoryWidgetProps) {
  const { addLinkFromUrl, addLink, updateLink, clearDoneChecks } = useLinkShelf()
  const m = useMessages()
  const { uploadImage, checklist } = useOptions()
  /** 今日の日付（日付が変わったら描き直して、毎日の項目のチェックを外す） */
  const today = useToday()
  const checks = links.filter((l) => l.kind === 'check')
  const checkedCount = checks.filter((l) => isChecked(l)).length
  /** チェック済みの「1 回だけ」の項目（まとめて消せる） */
  const doneOnceCount = checks.filter((l) => l.repeat !== 'daily' && isChecked(l)).length
  const [confirmClear, setConfirmClear] = useState(false)
  /** 最後の項目がチェック項目なら、追加欄もはじめからチェック項目にする */
  const lastLink = links[links.length - 1]
  const defaultCheck = lastLink?.kind === 'check' ? { repeat: lastLink.repeat } : null
  /** 画像を受け付けるか（uploadImage があって、並べ替えなどを止めていないとき） */
  const canUpload = !!uploadImage && !readOnly && !collapsed
  const imageInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const upload = async (file: File | undefined) => {
    if (!file || !uploadImage) return
    if (!IMAGE_TYPES.includes(file.type)) {
      setUploadError(m.imageOnly)
      return
    }
    setUploading(true)
    setUploadError('')
    try {
      const result = await uploadImage(file, { categoryId: category.id })
      // 相対の URL（/images/a.jpg など）は、今のページを基準にして絶対の URL にする
      const url = typeof location !== 'undefined' ? new URL(result.url, location.href).toString() : result.url
      if (!isSafeUrl(url)) throw new Error()
      await addLink({ categoryId: category.id, title: result.title?.trim() || m.imageTitle(todayString()), url })
    } catch (e) {
      const detail = e instanceof Error && e.message && e.message.length <= 80 ? e.message : ''
      setUploadError(m.uploadFailed(detail))
    } finally {
      setUploading(false)
    }
  }

  /** 画像の貼り付けだけを横取りする（文字や URL の貼り付けは、今までどおり） */
  const onPaste = (e: ClipboardEvent<HTMLElement>) => {
    if (!canUpload) return
    const file = imageFileOf(e.clipboardData)
    if (!file) return
    e.preventDefault()
    void upload(file)
  }
  const hasFiles = (e: DragEvent<HTMLElement>) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
  const onDragOver = (e: DragEvent<HTMLElement>) => {
    if (!canUpload || !hasFiles(e)) return
    e.preventDefault()
    setDragOver(true)
  }
  const onDrop = (e: DragEvent<HTMLElement>) => {
    if (!canUpload || !hasFiles(e)) return
    e.preventDefault()
    setDragOver(false)
    void upload(e.dataTransfer.files?.[0])
  }
  const [renamingId, setRenamingId] = useState<string | null>(null)

  const cardDrag = useDraggable({
    id: cardDragId(category.id),
    data: { kind: 'card', categoryId: category.id } satisfies CardDragData,
    disabled: readOnly,
  })
  const cardDrop = useDroppable({
    id: cardDropId(category.id),
    data: { kind: 'card', categoryId: category.id } satisfies DropData,
    disabled: readOnly,
  })
  const listDrop = useDroppable({
    id: listDropId(category.id),
    data: { kind: 'list', categoryId: category.id } satisfies DropData,
    disabled: readOnly,
  })

  const listIndicator = indicator?.kind === 'list' && indicator.categoryId === category.id

  return (
    <section
      ref={(node) => {
        cardDrag.setNodeRef(node)
        cardDrop.setNodeRef(node)
      }}
      aria-label={category.name}
      data-ls-category={category.id}
      // 画像を受け付けるときは、カードにフォーカスを当てて貼り付けられるようにする
      tabIndex={canUpload ? 0 : undefined}
      onPaste={onPaste}
      onDragOver={onDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={cn(
        // 上の「カテゴリの帯」から飛んだとき、帯の下にカードの頭が来るように
        'group/card relative scroll-mt-[calc(var(--ls-sticky-top,0px)+3.5rem)] rounded-xl border bg-neutral-900 transition-colors',
        dragOver ? 'border-accent-500' : 'border-neutral-800',
        canUpload && 'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
        cardDrag.isDragging && 'opacity-40',
      )}
    >
      {/* カードを落とす位置の線（カードとカードのあいだ） */}
      {cardDropEdge && (
        <div
          aria-hidden="true"
          data-testid="card-drop-line"
          className={cn(
            'pointer-events-none absolute inset-x-1 z-10 h-1 rounded-full bg-accent-500',
            cardDropEdge === 'before' ? '-top-2.5' : '-bottom-2.5',
          )}
        />
      )}
      {/* 見出し */}
      <header className={cn('flex items-center gap-2 px-4 pt-3.5', collapsed ? 'pb-3.5' : 'pb-2')}>
        {!readOnly && (
          <button
            ref={cardDrag.setActivatorNodeRef}
            type="button"
            aria-label={m.reorderCard(category.name)}
            title={m.reorderCardHint}
            className="absolute left-0.5 top-3.5 flex h-6 w-4 cursor-grab touch-none items-center justify-center text-neutral-600 transition-opacity hover:text-neutral-300 md:opacity-0 md:group-hover/card:opacity-100"
            {...cardDrag.attributes}
            {...cardDrag.listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <span
          aria-hidden="true"
          className={cn('h-2 w-2 flex-shrink-0 rounded-full', categoryColorClass(category.color))}
        />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-100">
          {category.name}
        </h2>
        {checks.length > 0 ? (
          <span
            title={m.checkProgress(checkedCount, checks.length)}
            aria-label={m.checkProgress(checkedCount, checks.length)}
            data-testid="check-progress"
            className={cn(
              'flex-shrink-0 text-[11px] tabular-nums',
              checkedCount === checks.length ? 'text-accent-400' : 'text-neutral-500',
            )}
          >
            {checkedCount}/{checks.length}
          </span>
        ) : (
          <span className="flex-shrink-0 text-[11px] text-neutral-500">{links.length}</span>
        )}
        {!viewOnly && (
          <button
            type="button"
            onClick={() => onManage(category)}
            aria-label={m.manageCard(category.name)}
            title={m.manageCardHint}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-200 md:opacity-0 md:group-hover/card:opacity-100 md:focus-visible:opacity-100"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        )}
        {collapsible && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            aria-label={collapsed ? m.expandCard(category.name) : m.collapseCard(category.name)}
            title={collapsed ? m.expandHint : m.collapseHint}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', collapsed && '-rotate-90')} />
          </button>
        )}
      </header>

      {!collapsed && (
      <>
      {/* リンク一覧 */}
      <div ref={listDrop.setNodeRef} className="px-2 pb-1">
        {links.length === 0 && (
          <p
            className={cn(
              'mx-2 mb-1 rounded-md border border-dashed px-2 py-3 text-center text-xs text-neutral-500',
              listIndicator ? 'border-neutral-500' : 'border-neutral-800',
            )}
          >
            {filtered ? m.noLinksMatch : m.noLinksYet}
          </p>
        )}
        <ul>
          {links.map((link) => (
            <LinkRow
              key={link.id}
              link={link}
              readOnly={readOnly}
              viewOnly={viewOnly}
              today={today}
              renaming={renamingId === link.id}
              indicator={
                indicator?.kind === 'link' && indicator.linkId === link.id ? indicator.position : null
              }
              wasDragging={wasDragging}
              onEdit={onEditLink}
              onRenameDone={async (title) => {
                setRenamingId(null)
                const next = title.trim()
                if (next && next !== link.title) await updateLink(link.id, { title: next })
              }}
            />
          ))}
        </ul>
        {listIndicator && links.length > 0 && (
          <div aria-hidden="true" className="mx-2 h-0.5 rounded-full bg-neutral-500" />
        )}
      </div>

      {/* 画像のアップロード中・失敗 */}
      {(uploading || uploadError) && (
        <p
          role={uploadError ? 'alert' : 'status'}
          className={cn('mx-4 mb-2 text-[11px]', uploadError ? 'text-red-400' : 'text-neutral-500')}
        >
          {uploading ? m.uploading : uploadError}
        </p>
      )}
      {canUpload && (
        <input
          ref={imageInput}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            void upload(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      )}

      {/* 済んだ「1 回だけ」の項目をまとめて消す */}
      {!viewOnly && doneOnceCount > 0 && (
        <div className="flex justify-end px-3 pb-1">
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="rounded-md px-1.5 py-0.5 text-[11px] text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
          >
            {m.clearDone(doneOnceCount)}
          </button>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={async () => {
          await clearDoneChecks(category.id)
          setConfirmClear(false)
        }}
        title={m.clearDoneTitle}
        description={m.clearDoneConfirm(doneOnceCount)}
      />

      {/* その場で追加 */}
      {!readOnly && (
        <QuickAdd
          defaultCheck={defaultCheck}
          onAddCheck={
            checklist
              ? async ({ title, repeat }) => {
                  await addLink({ categoryId: category.id, title, url: '', kind: 'check', repeat })
                }
              : undefined
          }
          onPickImage={canUpload && !uploading ? () => imageInput.current?.click() : undefined}
          onAdd={async (url) => {
            const link = await addLinkFromUrl(category.id, url)
            setRenamingId(link.id)
          }}
          onAddText={async ({ title, text }) => {
            await addLink({ categoryId: category.id, title, url: '', kind: 'text', text })
          }}
          onWriteText={async () => {
            // 空のテキストを作って、そのまま書く画面を開く（何も書かずに閉じれば消える）
            const link = await addLink({ categoryId: category.id, title: m.newText, url: '', kind: 'text', text: '' })
            onEditLink(link)
          }}
        />
      )}
      </>
      )}
    </section>
  )
}

// ─── リンク 1 行 ───────────────────────────────────────────────

interface LinkRowProps {
  link: Link
  readOnly: boolean
  viewOnly: boolean
  /** 今日の日付（日付が変わったら描き直すため） */
  today: string
  renaming: boolean
  indicator: 'before' | 'after' | null
  wasDragging: () => boolean
  onEdit: (link: Link) => void
  onRenameDone: (title: string) => void
}

function LinkRow({ link, readOnly, viewOnly, today: _today, renaming, indicator, wasDragging, onEdit, onRenameDone }: LinkRowProps) {
  const { updateLink, recordAccess, toggleCheck } = useLinkShelf()
  const m = useMessages()
  const isText = link.kind === 'text'
  const isCheck = link.kind === 'check'
  const checked = isCheck && isChecked(link)
  const daily = isCheck && link.repeat === 'daily'
  const href = isText || isCheck ? undefined : safeExternalUrl(link.url)
  const { openLink, sameOriginInSameTab } = useOptions()
  /** 同じタブで開くか（sameOriginInSameTab のとき、同じサイトの URL だけ） */
  const sameTab = !!href && !!sameOriginInSameTab && isSameOrigin(href)
  const [viewing, setViewing] = useState(false)
  /** 1 行のテキストを、その場で書き換えている */
  const [inlineEditing, setInlineEditing] = useState(false)
  const oneLine = isText && isOneLineText(link)
  /** チェック項目の名前を、その場で書き換えている */
  const [checkEditing, setCheckEditing] = useState(false)
  /** 1 行のテキストは、ダブルクリックで書き換えるので、1 回押したときの表示は少し待ってから開く */
  const openTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(openTimer.current), [])

  const drag = useDraggable({
    id: linkDragId(link.id),
    data: { kind: 'link', linkId: link.id, categoryId: link.categoryId } satisfies LinkDragData,
    disabled: readOnly || renaming || inlineEditing || checkEditing,
  })
  const drop = useDroppable({
    id: linkDropId(link.id),
    data: { kind: 'link', categoryId: link.categoryId, linkId: link.id } satisfies DropData,
    disabled: readOnly,
  })

  return (
    <li
      ref={(node) => {
        drag.setNodeRef(node)
        drop.setNodeRef(node)
      }}
      className={cn('group/row relative', drag.isDragging && 'opacity-40')}
    >
      {indicator && (
        <div
          aria-hidden="true"
          className={cn(
            'absolute inset-x-2 z-10 h-0.5 rounded-full bg-neutral-500',
            indicator === 'before' ? '-top-px' : '-bottom-px',
          )}
        />
      )}
      {renaming ? (
        <RenameInput link={link} onDone={onRenameDone} />
      ) : inlineEditing ? (
        <OneLineTextInput
          link={link}
          onDone={(text) => {
            setInlineEditing(false)
            const t = text.trim()
            if (t && t !== (link.text ?? '').trim()) void updateLink(link.id, { text: t, title: oneLineTitle(t) })
          }}
        />
      ) : checkEditing ? (
        <OneLineTextInput
          link={link}
          initial={link.title}
          label={m.checkItem}
          onDone={(title) => {
            setCheckEditing(false)
            const t = title.trim()
            if (t && t !== link.title) void updateLink(link.id, { title: t })
          }}
        />
      ) : (
        <div className="flex items-center rounded-md transition-colors hover:bg-neutral-800">
          {isCheck ? (
            <>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-label={checked ? m.checkOff(link.title) : m.checkOn(link.title)}
                disabled={viewOnly}
                onClick={() => {
                  if (wasDragging()) return
                  void toggleCheck(link.id)
                }}
                className={cn(
                  'ml-1 flex h-7 w-7 flex-shrink-0 touch-manipulation items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500',
                  checked ? 'text-accent-400' : 'text-neutral-500 hover:text-neutral-300',
                )}
              >
                {checked ? <SquareCheck className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              </button>
              <button
                type="button"
                title={m.checkTooltip(link.title, daily, !readOnly, link.description)}
                onClick={() => {
                  if (wasDragging() || viewOnly) return
                  // 名前を押してもチェックできる。ダブルクリックは書き換えなので、少し待ってから切り替える
                  clearTimeout(openTimer.current)
                  if (readOnly) return void toggleCheck(link.id)
                  openTimer.current = setTimeout(() => void toggleCheck(link.id), 280)
                }}
                onDoubleClick={() => {
                  if (readOnly) return
                  clearTimeout(openTimer.current)
                  window.getSelection?.()?.removeAllRanges()
                  setCheckEditing(true)
                }}
                className="flex min-w-0 flex-1 touch-manipulation select-none items-center [-webkit-touch-callout:none] gap-2 py-1.5 pl-1 pr-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 rounded-md"
                {...(readOnly ? {} : { ...drag.attributes, ...drag.listeners, role: undefined, tabIndex: undefined })}
              >
                <span className={cn('truncate', checked ? 'text-neutral-500 line-through' : 'text-neutral-200')}>
                  {link.title}
                </span>
                {daily && (
                  <Repeat aria-label={m.dailyBadge} className="h-3 w-3 flex-shrink-0 text-neutral-500" />
                )}
              </button>
            </>
          ) : isText ? (
            <button
              type="button"
              title={m.textTooltip(link.title, oneLine && !readOnly, link.description)}
              onClick={() => {
                if (wasDragging()) return
                const open = () => {
                  setViewing(true)
                  void recordAccess(link.id)
                }
                if (!oneLine || readOnly) return open()
                clearTimeout(openTimer.current)
                openTimer.current = setTimeout(open, 280)
              }}
              onDoubleClick={() => {
                if (!oneLine || readOnly) return
                clearTimeout(openTimer.current)
                window.getSelection?.()?.removeAllRanges()
                setInlineEditing(true)
              }}
              className="flex min-w-0 flex-1 touch-manipulation select-none items-center [-webkit-touch-callout:none] gap-2.5 px-2 py-1.5 text-left text-sm text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 rounded-md"
              {...(readOnly ? {} : { ...drag.attributes, ...drag.listeners, role: undefined, tabIndex: undefined })}
            >
              <LinkIcon link={link} />
              <span className="truncate">{link.title}</span>
            </button>
          ) : (
          <a
            href={href}
            target={sameTab ? undefined : '_blank'}
            rel={sameTab ? undefined : 'noopener noreferrer'}
            draggable={false}
            title={`${link.title}\n${link.url}${link.description ? `\n\n${link.description}` : ''}`}
            onClick={(e) => {
              if (wasDragging() || !href) {
                e.preventDefault()
                return
              }
              void recordAccess(link.id)
              // 開き方を組み込む側が決めるとき（href は isSafeUrl を通したものだけ）
              if (openLink) {
                e.preventDefault()
                openLink(href, link)
              }
            }}
            className="flex min-w-0 flex-1 touch-manipulation select-none items-center [-webkit-touch-callout:none] gap-2.5 px-2 py-1.5 text-sm text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 rounded-md"
            {...(readOnly ? {} : { ...drag.attributes, ...drag.listeners, role: undefined, tabIndex: undefined })}
          >
            <LinkIcon link={link} />
            <span className="truncate">{link.title}</span>
          </a>
          )}
          <div className="flex flex-shrink-0 items-center pr-1">
            {viewOnly ? (
              // 閲覧専用: 星は印として見せるだけ（押せない）
              link.isFavorited && (
                <span role="img" aria-label={m.favoriteHint} title={m.favoriteHint} className="flex h-6 w-6 items-center justify-center text-amber-400">
                  <Star className="h-3 w-3 fill-amber-400" />
                </span>
              )
            ) : (
            <button
              type="button"
              onClick={() => void updateLink(link.id, { isFavorited: !link.isFavorited })}
              aria-label={link.isFavorited ? m.unfavorite(link.title) : m.favorite(link.title)}
              aria-pressed={link.isFavorited}
              title={link.isFavorited ? m.unfavoriteHint : m.favoriteHint}
              className={cn(
                'h-6 w-6 items-center justify-center rounded transition-opacity',
                link.isFavorited
                  ? 'flex text-amber-400'
                  : 'hidden text-neutral-500 hover:text-neutral-300 md:flex md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100',
              )}
            >
              <Star className={cn('h-3 w-3', link.isFavorited && 'fill-amber-400')} />
            </button>
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={() => onEdit(link)}
                aria-label={m.editItem(link.title)}
                title={m.edit}
                className="hidden h-6 w-6 items-center justify-center rounded text-neutral-500 hover:text-neutral-300 md:flex md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}
      {viewing && <TextViewer link={link} onClose={() => setViewing(false)} onEdit={readOnly ? undefined : onEdit} />}
    </li>
  )
}

/** 1 行のテキストを、その場で書き換える入力欄（Enter・外を押すと保存、Esc でやめる） */
function OneLineTextInput({
  link,
  initial,
  label,
  onDone,
}: {
  link: Link
  /** はじめに入れておく文（省略時はテキストの本文） */
  initial?: string
  /** 読み上げ用の名前（省略時は「1 行のテキスト」） */
  label?: string
  onDone: (text: string) => void
}) {
  const m = useMessages()
  const start = initial ?? link.text ?? ''
  const [value, setValue] = useState(start)
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  const finish = (text: string) => {
    if (done.current) return
    done.current = true
    onDone(text)
  }
  return (
    <div className="flex items-center gap-2.5 px-2 py-1">
      <LinkIcon link={link} />
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            finish(value)
          }
          if (e.key === 'Escape') finish(start)
        }}
        onBlur={() => finish(value)}
        aria-label={label ?? m.oneLineText}
        className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-accent-500"
      />
    </div>
  )
}

/** 追加した直後に、その場でタイトルを付ける入力欄 */
function RenameInput({ link, onDone }: { link: Link; onDone: (title: string) => void }) {
  const [value, setValue] = useState(link.title)
  const [edited, setEdited] = useState(false)
  const fetching = useLinkShelf((s) => s.fetchingTitleIds.includes(link.id))
  const m = useMessages()
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  // ページのタイトルが届いたら、まだ手を付けていなければ差し替える
  useEffect(() => {
    if (edited) return
    setValue(link.title)
    requestAnimationFrame(() => ref.current?.select())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link.title])

  const finish = (title: string) => {
    if (done.current) return
    done.current = true
    onDone(title)
  }

  return (
    <div className="flex items-center gap-2.5 px-2 py-1">
      <SiteIcon url={link.url} title={value} />
      <input
        ref={ref}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setEdited(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finish(value)
          if (e.key === 'Escape') finish(link.title)
        }}
        onBlur={() => finish(value)}
        aria-label={m.linkName}
        aria-busy={fetching && !edited}
        placeholder={m.name}
        className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-accent-500"
      />
      {fetching && !edited && (
        <span
          role="status"
          aria-label={m.fetchingTitle}
          title={m.fetchingTitle}
          className="h-3.5 w-3.5 flex-shrink-0 animate-ls-spin rounded-full border-2 border-neutral-700 border-t-neutral-400"
        />
      )}
    </div>
  )
}

// ─── その場で追加 ───────────────────────────────────────────────

export function QuickAdd({
  onAdd,
  onAddText,
  onWriteText,
  onAddCheck,
  defaultCheck = null,
  onPickImage,
}: {
  onAdd: (url: string) => Promise<void>
  onAddText: (t: { title: string; text: string }) => Promise<void>
  onWriteText: () => Promise<void>
  /** チェック項目を足す（無ければ、チェック項目にする切り替えを出さない） */
  onAddCheck?: (t: { title: string; repeat?: 'daily' }) => Promise<void>
  /** はじめからチェック項目として足す（カードの最後の項目がチェック項目のときなど） */
  defaultCheck?: { repeat?: 'daily' } | null
  /** 「画像を追加」を押したとき（無ければボタンを出さない） */
  onPickImage?: () => void
}) {
  const m = useMessages()
  const [showTip, setShowTip] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  /** チェック項目として足すか（開くたびに、カードに合わせて決め直す） */
  const [checkMode, setCheckMode] = useState(false)
  const [dailyMode, setDailyMode] = useState(false)
  const canCheck = !!onAddCheck
  const openAdd = () => {
    setCheckMode(canCheck && !!defaultCheck)
    setDailyMode(defaultCheck?.repeat === 'daily')
    setOpen(true)
  }

  const submit = async () => {
    const input = value.trim()
    if (!input) return
    // 「[] 〜」「[毎日] 〜」の書き方なら、切り替えに関係なくチェック項目にする
    const parsed = onAddCheck ? parseCheckInput(input) : null
    if (onAddCheck && (parsed || checkMode)) {
      // 続けて打てるように、欄は開いたままにする
      setValue('')
      setError('')
      await onAddCheck(parsed ?? { title: input, ...(dailyMode ? { repeat: 'daily' as const } : {}) })
      return
    }
    const url = normalizeLinkInput(input)
    setValue('')
    setError('')
    setOpen(false)
    if (url) {
      await onAdd(url)
      return
    }
    // URL でなければ、1 行のテキストとして置く（名前も本文も、打った文）
    await onAddText({ title: oneLineTitle(input), text: input })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void submit()
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setValue('')
      setError('')
    }
  }

  const pickText = async (file: File | undefined) => {
    if (!file) return
    try {
      await onAddText(await readTextFile(file, m))
      setValue('')
      setError('')
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : m.fileReadFailed)
    }
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2 px-2 pb-2">
        <button
          type="button"
          onClick={openAdd}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{canCheck && defaultCheck ? m.addCheck : m.addLinkOrText}</span>
        </button>
        {onPickImage && <ImageButton label={m.addImage} onClick={onPickImage} />}
      </div>
    )
  }

  return (
    <div className="px-3 pb-3 pt-1">
      <input
        autoFocus
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setError('')
        }}
        onKeyDown={onKeyDown}
        onBlur={(e) => {
          // 下の「テキストファイルを置く」を押すときは閉じない
          if (e.relatedTarget && e.currentTarget.parentElement?.contains(e.relatedTarget)) return
          if (!value.trim() && !error) setOpen(false)
        }}
        aria-label={m.quickAddLabel}
        aria-invalid={error ? true : undefined}
        placeholder={
          checkMode ? (dailyMode ? m.quickAddDailyPlaceholder : m.quickAddCheckPlaceholder) : m.quickAddPlaceholder
        }
        className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent-500"
      />
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept={TEXT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void pickText(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {canCheck && (
          <ToggleChip pressed={checkMode} onClick={() => setCheckMode((v) => !v)} icon={<ListChecks className="h-3.5 w-3.5" aria-hidden="true" />}>
            {m.checkMode}
          </ToggleChip>
        )}
        {canCheck && checkMode && (
          <ToggleChip pressed={dailyMode} onClick={() => setDailyMode((v) => !v)} icon={<Repeat className="h-3.5 w-3.5" aria-hidden="true" />}>
            {m.dailyMode}
          </ToggleChip>
        )}
        {!checkMode && (
        <>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            void onWriteText()
          }}
          className="flex items-center gap-1.5 rounded-md px-1 py-1 text-xs text-neutral-400 transition-colors hover:text-neutral-200"
        >
          <FilePlus className="h-3.5 w-3.5" aria-hidden="true" />
          {m.writeText}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md px-1 py-1 text-xs text-neutral-400 transition-colors hover:text-neutral-200"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          {m.dropTxt}
        </button>
        </>
        )}
        {onPickImage && !checkMode && (
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onPickImage()
            }}
            className="flex items-center gap-1.5 rounded-md px-1 py-1 text-xs text-neutral-400 transition-colors hover:text-neutral-200"
          >
            <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
            {m.addImage}
          </button>
        )}
        {/* PDF・画像の置き方（マウスを乗せて少しすると出る。スマホは押すと出る） */}
        {!checkMode && (
        <span className="group/tip relative ml-auto">
          <button
            type="button"
            onClick={() => setShowTip((v) => !v)}
            aria-expanded={showTip}
            aria-label={m.filesTipLabel}
            className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-500 transition-colors hover:text-neutral-300"
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <span
            role="tooltip"
            className={cn(
              'absolute bottom-full right-0 z-20 mb-1 w-60 rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-[11px] leading-relaxed text-neutral-400 shadow-lg shadow-black/30 transition-opacity',
              showTip
                ? 'visible opacity-100'
                : 'invisible opacity-0 md:group-hover/tip:visible md:group-hover/tip:opacity-100 md:group-hover/tip:delay-500',
            )}
          >
            <span className="mb-1 block font-semibold text-neutral-200">{m.filesTipTitle}</span>
            {m.filesTipBody}
          </span>
        </span>
        )}
      </div>
    </div>
  )
}

// ─── 画像 ───────────────────────────────────────────────────

/** 受け付ける画像の種類 */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** 貼り付けたものの中から、受け付ける画像を 1 つ取り出す（無ければ null） */
function imageFileOf(data: DataTransfer | null): File | null {
  if (!data) return null
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === 'file' && IMAGE_TYPES.includes(item.type)) {
      const file = item.getAsFile()
      if (file) return file
    }
  }
  for (const file of Array.from(data.files ?? [])) {
    if (IMAGE_TYPES.includes(file.type)) return file
  }
  return null
}

/** 今日の日付（YYYY/MM/DD） */
function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

/** 「画像を追加」のボタン（枠線つき） */
function ImageButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
    >
      <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  )
}

/** 押すたびに入・切が変わる小さなボタン（入のときは枠つき） */
function ToggleChip({
  pressed,
  onClick,
  icon,
  children,
}: {
  pressed: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs transition-colors',
        pressed
          ? 'border-neutral-600 bg-neutral-800 text-neutral-100'
          : 'border-transparent text-neutral-400 hover:text-neutral-200',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

/**
 * 今日の日付（YYYY-MM-DD）。日付が変わったら新しい値になる。
 * 1 分ごとと、画面に戻ってきたときに確かめる。
 */
function useToday(): string {
  const [today, setToday] = useState(() => localDateKey(new Date()))
  useEffect(() => {
    const check = () => setToday(localDateKey(new Date()))
    const timer = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])
  return today
}
