import { useDraggable, useDroppable } from '@dnd-kit/core'
import { FilePlus, FileText, GripVertical, Info, Pencil, Plus, Settings2, Star } from 'lucide-react'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import type { Category, Link } from '../types'
import { cn } from '../utils/cn'
import { safeExternalUrl } from '../utils/url'
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
import { isOneLineText, normalizeLinkInput, oneLineTitle } from '../linkUtils'
import { useLinkShelf } from '../context'
import { LinkIcon, SiteIcon } from './SiteIcon'
import { TextViewer } from './TextViewer'
import { readTextFile, TEXT_ACCEPT } from '../textFile'

interface CategoryWidgetProps {
  category: Category
  links: Link[]
  /** 検索中など、並び替えやその場での追加をさせないとき */
  readOnly?: boolean
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
  indicator,
  cardDropEdge = null,
  wasDragging,
  onManage,
  onEditLink,
}: CategoryWidgetProps) {
  const { addLinkFromUrl, addLink, updateLink } = useLinkShelf()
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
      className={cn(
        'group/card relative rounded-xl border bg-neutral-900 transition-colors',
        'border-neutral-800',
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
      <header className="flex items-center gap-2 px-4 pb-2 pt-3.5">
        {!readOnly && (
          <button
            ref={cardDrag.setActivatorNodeRef}
            type="button"
            aria-label={`「${category.name}」を並び替える`}
            title="ドラッグでカードを並び替え"
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
        <span className="flex-shrink-0 text-[11px] text-neutral-500">{links.length}</span>
        <button
          type="button"
          onClick={() => onManage(category)}
          aria-label={`「${category.name}」を整理する`}
          title="整理する（名前・並び替え・移動・削除）"
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-200 md:opacity-0 md:group-hover/card:opacity-100 md:focus-visible:opacity-100"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* リンク一覧 */}
      <div ref={listDrop.setNodeRef} className="px-2 pb-1">
        {links.length === 0 && (
          <p
            className={cn(
              'mx-2 mb-1 rounded-md border border-dashed px-2 py-3 text-center text-xs text-neutral-500',
              listIndicator ? 'border-neutral-500' : 'border-neutral-800',
            )}
          >
            {readOnly ? '一致するリンクはありません' : 'リンクはまだありません'}
          </p>
        )}
        <ul>
          {links.map((link) => (
            <LinkRow
              key={link.id}
              link={link}
              readOnly={readOnly}
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

      {/* その場で追加 */}
      {!readOnly && (
        <QuickAdd
          onAdd={async (url) => {
            const link = await addLinkFromUrl(category.id, url)
            setRenamingId(link.id)
          }}
          onAddText={async ({ title, text }) => {
            await addLink({ categoryId: category.id, title, url: '', kind: 'text', text })
          }}
          onWriteText={async () => {
            // 空のテキストを作って、そのまま書く画面を開く（何も書かずに閉じれば消える）
            const link = await addLink({ categoryId: category.id, title: '新しいテキスト', url: '', kind: 'text', text: '' })
            onEditLink(link)
          }}
        />
      )}
    </section>
  )
}

// ─── リンク 1 行 ───────────────────────────────────────────────

interface LinkRowProps {
  link: Link
  readOnly: boolean
  renaming: boolean
  indicator: 'before' | 'after' | null
  wasDragging: () => boolean
  onEdit: (link: Link) => void
  onRenameDone: (title: string) => void
}

function LinkRow({ link, readOnly, renaming, indicator, wasDragging, onEdit, onRenameDone }: LinkRowProps) {
  const { updateLink, recordAccess } = useLinkShelf()
  const isText = link.kind === 'text'
  const href = isText ? undefined : safeExternalUrl(link.url)
  const [viewing, setViewing] = useState(false)
  /** 1 行のテキストを、その場で書き換えている */
  const [inlineEditing, setInlineEditing] = useState(false)
  const oneLine = isText && isOneLineText(link)
  /** 1 行のテキストは、ダブルクリックで書き換えるので、1 回押したときの表示は少し待ってから開く */
  const openTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(openTimer.current), [])

  const drag = useDraggable({
    id: linkDragId(link.id),
    data: { kind: 'link', linkId: link.id, categoryId: link.categoryId } satisfies LinkDragData,
    disabled: readOnly || renaming || inlineEditing,
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
      ) : (
        <div className="flex items-center rounded-md transition-colors hover:bg-neutral-800">
          {isText ? (
            <button
              type="button"
              title={`${link.title}\n（テキスト）${oneLine && !readOnly ? '\nダブルクリックで書き換え' : ''}${link.description ? `\n\n${link.description}` : ''}`}
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
            target="_blank"
            rel="noopener noreferrer"
            draggable={false}
            title={`${link.title}\n${link.url}${link.description ? `\n\n${link.description}` : ''}`}
            onClick={(e) => {
              if (wasDragging() || !href) {
                e.preventDefault()
                return
              }
              void recordAccess(link.id)
            }}
            className="flex min-w-0 flex-1 touch-manipulation select-none items-center [-webkit-touch-callout:none] gap-2.5 px-2 py-1.5 text-sm text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 rounded-md"
            {...(readOnly ? {} : { ...drag.attributes, ...drag.listeners, role: undefined, tabIndex: undefined })}
          >
            <SiteIcon url={link.url} title={link.title} />
            <span className="truncate">{link.title}</span>
          </a>
          )}
          <div className="flex flex-shrink-0 items-center pr-1">
            <button
              type="button"
              onClick={() => void updateLink(link.id, { isFavorited: !link.isFavorited })}
              aria-label={link.isFavorited ? `「${link.title}」のお気に入りを解除` : `「${link.title}」をお気に入りに追加`}
              aria-pressed={link.isFavorited}
              title={link.isFavorited ? 'お気に入りを解除' : 'お気に入り'}
              className={cn(
                'h-6 w-6 items-center justify-center rounded transition-opacity',
                link.isFavorited
                  ? 'flex text-amber-400'
                  : 'hidden text-neutral-500 hover:text-neutral-300 md:flex md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100',
              )}
            >
              <Star className={cn('h-3 w-3', link.isFavorited && 'fill-amber-400')} />
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onEdit(link)}
                aria-label={`「${link.title}」を編集`}
                title="編集"
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
function OneLineTextInput({ link, onDone }: { link: Link; onDone: (text: string) => void }) {
  const [value, setValue] = useState(link.text ?? '')
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
          if (e.key === 'Escape') finish(link.text ?? '')
        }}
        onBlur={() => finish(value)}
        aria-label="1 行のテキスト"
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
        aria-label="リンクの名前"
        aria-busy={fetching && !edited}
        placeholder="名前"
        className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-accent-500"
      />
      {fetching && !edited && (
        <span
          role="status"
          aria-label="ページの名前を取得中"
          title="ページの名前を取得中"
          className="h-3.5 w-3.5 flex-shrink-0 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-400"
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
}: {
  onAdd: (url: string) => Promise<void>
  onAddText: (t: { title: string; text: string }) => Promise<void>
  onWriteText: () => Promise<void>
}) {
  const [showTip, setShowTip] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const submit = async () => {
    const input = value.trim()
    if (!input) return
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
      await onAddText(await readTextFile(file))
      setValue('')
      setError('')
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ファイルを読み込めませんでした')
    }
  }

  if (!open) {
    return (
      <div className="px-2 pb-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
        >
          <Plus className="h-4 w-4" />
          リンク・テキストを追加
        </button>
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
        aria-label="追加するリンクの URL か、1 行のテキスト"
        aria-invalid={error ? true : undefined}
        placeholder="URL か 1 行のテキストを入れて Enter"
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
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            void onWriteText()
          }}
          className="flex items-center gap-1.5 rounded-md px-1 py-1 text-xs text-neutral-400 transition-colors hover:text-neutral-200"
        >
          <FilePlus className="h-3.5 w-3.5" aria-hidden="true" />
          テキストを書く
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md px-1 py-1 text-xs text-neutral-400 transition-colors hover:text-neutral-200"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          .txt を置く
        </button>
        {/* PDF・画像の置き方（マウスを乗せて少しすると出る。スマホは押すと出る） */}
        <span className="group/tip relative ml-auto">
          <button
            type="button"
            onClick={() => setShowTip((v) => !v)}
            aria-expanded={showTip}
            aria-label="PDF・画像などを置くには"
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
            <span className="mb-1 block font-semibold text-neutral-200">PDF・画像などは？</span>
            クラウドのフォルダにまとめて置き、その共有リンクを上に貼ると、どの端末からでも開けます。
          </span>
        </span>
      </div>
    </div>
  )
}
