import { Pencil, Star } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { Input } from './ui/Input'
import type { Category, Link } from '../types'
import { cn } from '../utils/cn'
import { getDomain } from '../utils/url'
import { CATEGORY_COLORS } from '../categoryColors'
import { normalizeLinkInput } from '../linkUtils'
import { useLinkShelf } from '../context'
import { type LinkSortMode, groupLinksByCategory } from '../store'
import { LinkIcon } from './SiteIcon'

interface CategoryManageDialogProps {
  /** 開いているカテゴリ。null で閉じる */
  categoryId: string | null
  /** 別のダイアログ（リンク編集・削除の確認）を出している間は隠す */
  hidden?: boolean
  onClose: () => void
  onEditLink: (link: Link) => void
  onDeleteLinks: (links: Link[]) => void
  /** 選んだリンクの名前をページのタイトルから取り直す */
  onRetitleLinks: (links: Link[]) => void
  onDeleteCategory: (category: Category) => void
}

/** 一覧の上の小さな選択欄（ふつうの操作と同じ灰色） */
const smallSelect =
  'cursor-pointer rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:cursor-not-allowed disabled:opacity-40'

const SORT_OPTIONS: { value: LinkSortMode; label: string }[] = [
  { value: 'title', label: '名前順' },
  { value: 'newest', label: '追加が新しい順' },
  { value: 'recent', label: '最近開いた順' },
]

/**
 * カテゴリの整理画面。
 * 名前と色の変更、リンクの追加、まとめて選んでの移動・削除、並べ替えができる。
 */
export function CategoryManageDialog({
  categoryId,
  hidden = false,
  onClose,
  onEditLink,
  onDeleteLinks,
  onRetitleLinks,
  onDeleteCategory,
}: CategoryManageDialogProps) {
  const { categories, links: allLinks, addLinkFromUrl, updateCategory, updateLink, moveLinks, sortLinks } =
    useLinkShelf()
  const category = categories.find((c) => c.id === categoryId) ?? null
  const links = useMemo(
    () => (categoryId ? groupLinksByCategory(allLinks).get(categoryId) ?? [] : []),
    [allLinks, categoryId],
  )
  const otherCategories = useMemo(
    () => [...categories].filter((c) => c.id !== categoryId).sort((a, b) => a.order - b.order),
    [categories, categoryId],
  )

  const [name, setName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [moveTo, setMoveTo] = useState('')

  // 開き直したら状態を戻す
  useEffect(() => {
    setName(category?.name ?? '')
    setEditingName(false)
    setUrlInput('')
    setUrlError('')
    setSelected(new Set())
    setMoveTo('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  // 消えたリンクを選択から外す
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(links.map((l) => l.id))
      const next = new Set([...prev].filter((id) => ids.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [links])

  if (!category) return null

  const saveName = async () => {
    const next = name.trim()
    setEditingName(false)
    if (!next) {
      setName(category.name)
      return
    }
    if (next !== category.name) await updateCategory(category.id, { name: next })
  }

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    const url = normalizeLinkInput(urlInput)
    if (!url) {
      setUrlError('URL を確認してください（例: https://example.com）')
      return
    }
    await addLinkFromUrl(category.id, url)
    setUrlInput('')
    setUrlError('')
  }

  const allSelected = links.length > 0 && selected.size === links.length
  const selectedLinks = links.filter((l) => selected.has(l.id))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Dialog isOpen={!hidden} onClose={onClose} title="カテゴリを整理" size="xl">
      <div className="space-y-5">
        {/* 名前と色 */}
        <div>
          {editingName ? (
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void saveName()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveName()
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  setName(category.name)
                  setEditingName(false)
                }
              }}
              aria-label="カテゴリ名"
              className="text-lg font-semibold"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="group flex max-w-full items-center gap-2 rounded-md text-left"
              title="名前を変更"
            >
              <span className="truncate text-lg font-semibold text-neutral-100">{category.name}</span>
              <Pencil className="h-3.5 w-3.5 flex-shrink-0 text-neutral-500 group-hover:text-neutral-300" />
            </button>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-xs text-neutral-500">{links.length} 件のリンク</p>
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="カテゴリの色">
              {CATEGORY_COLORS.map((opt) => {
                const active = (category.color ?? 'teal') === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={opt.label}
                    title={opt.label}
                    onClick={() => void updateCategory(category.id, { color: opt.value })}
                    className={cn(
                      'h-3.5 w-3.5 rounded-full transition-transform',
                      opt.bgClass,
                      active
                        ? 'ring-2 ring-neutral-400 ring-offset-2 ring-offset-neutral-900'
                        : 'opacity-50 hover:opacity-100',
                    )}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* 追加 */}
        <form onSubmit={handleAdd}>
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value)
                setUrlError('')
              }}
              inputMode="url"
              placeholder="リンクを貼り付けて追加（https://...）"
              aria-label="追加するリンクの URL"
              aria-invalid={urlError ? true : undefined}
            />
            <Button type="submit" variant="primary" disabled={!urlInput.trim()} className="flex-shrink-0">
              追加
            </Button>
          </div>
          {urlError && <p className="mt-1 text-xs text-red-400">{urlError}</p>}
        </form>

        {/* 一覧の操作 */}
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
            <input
              type="checkbox"
              checked={allSelected}
              disabled={links.length === 0}
              onChange={() => setSelected(allSelected ? new Set() : new Set(links.map((l) => l.id)))}
              className="h-4 w-4 accent-neutral-500"
            />
            {selected.size > 0 ? `${selected.size} 件を選択中` : 'すべて選択'}
          </label>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {selected.size > 0 ? (
              <>
                {otherCategories.length > 0 && (
                  <>
                    <select
                      value={moveTo}
                      onChange={(e) => setMoveTo(e.target.value)}
                      aria-label="移動先のカテゴリ"
                      className={cn(smallSelect, 'max-w-[10rem]')}
                    >
                      <option value="">移動先を選ぶ</option>
                      {otherCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      disabled={!moveTo}
                      onClick={async () => {
                        await moveLinks([...selected], moveTo)
                        setSelected(new Set())
                        setMoveTo('')
                      }}
                    >
                      移動
                    </Button>
                  </>
                )}
                <Button size="sm" onClick={() => onRetitleLinks(selectedLinks)}>
                  名前を取り直す
                </Button>
                <Button size="sm" variant="danger" onClick={() => onDeleteLinks(selectedLinks)}>
                  削除
                </Button>
              </>
            ) : (
              <select
                value=""
                onChange={(e) => {
                  const mode = e.target.value as LinkSortMode
                  if (mode) void sortLinks(category.id, mode)
                }}
                disabled={links.length < 2}
                aria-label="並べ替え"
                className={cn(smallSelect, 'max-w-[10rem]')}
              >
                <option value="">並べ替え…</option>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* リンク一覧 */}
        {links.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">リンクはまだありません</p>
        ) : (
          <ul className="-mt-2 divide-y divide-neutral-800/60">
            {links.map((link) => (
              <li key={link.id} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.has(link.id)}
                  onChange={() => toggle(link.id)}
                  aria-label={`「${link.title}」を選択`}
                  className="h-4 w-4 flex-shrink-0 accent-neutral-500"
                />
                <LinkIcon link={link} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-neutral-200">{link.title}</p>
                  <p className="truncate text-[11px] text-neutral-500">{link.kind === 'text' ? 'テキスト' : getDomain(link.url)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void updateLink(link.id, { isFavorited: !link.isFavorited })}
                  aria-label={link.isFavorited ? `「${link.title}」のお気に入りを解除` : `「${link.title}」をお気に入りに追加`}
                  aria-pressed={link.isFavorited}
                  title={link.isFavorited ? 'お気に入りを解除' : 'お気に入り'}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md hover:bg-neutral-800',
                    link.isFavorited ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300',
                  )}
                >
                  <Star className={cn('h-3.5 w-3.5', link.isFavorited && 'fill-amber-400')} />
                </button>
                <button
                  type="button"
                  onClick={() => onEditLink(link)}
                  aria-label={`「${link.title}」を編集`}
                  title="編集"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* フッター */}
        <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
          <Button size="sm" variant="danger" onClick={() => onDeleteCategory(category)}>
            カテゴリを削除
          </Button>
          <Button size="sm" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
