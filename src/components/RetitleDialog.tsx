import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { SegmentedControl } from './ui/SegmentedControl'
import type { Link } from '../types'
import { cn } from '../utils/cn'
import { isPlaceholderTitle, mapWithLimit } from '../linkUtils'
import { useLinkShelf } from '../context'
import { SiteIcon } from './SiteIcon'

/** 一度に取りに行く数 */
const CONCURRENCY = 4

type Scope = 'placeholder' | 'all'

interface Result {
  link: Link
  title: string | null
}

interface RetitleDialogProps {
  isOpen: boolean
  onClose: () => void
  /** 指定したリンクだけを対象にする（整理画面で選んだもの）。省略時はすべてのリンクから選ぶ */
  linkIds?: string[]
}

/**
 * 既存リンクの名前を、ページのタイトルからまとめて取り直す。
 *
 * 自分で付けた名前を消さないよう、取得した結果を「今の名前 → 新しい名前」で見せ、
 * チェックしたものだけを反映する。サイト名のままのリンクは最初からチェックを入れ、
 * 自分で付けた名前は外しておく。
 */
export function RetitleDialog({ isOpen, onClose, linkIds }: RetitleDialogProps) {
  const { links, categories, renameLinks, lookupTitle } = useLinkShelf()
  const [scope, setScope] = useState<Scope>('placeholder')
  const [phase, setPhase] = useState<'choose' | 'fetching' | 'review' | 'done'>('choose')
  const [results, setResults] = useState<Result[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [applied, setApplied] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const categoryOrder = useMemo(
    () => new Map(categories.map((c) => [c.id, c.order])),
    [categories],
  )
  const sortLinks = (list: Link[]) =>
    [...list].sort(
      (a, b) =>
        (categoryOrder.get(a.categoryId) ?? 0) - (categoryOrder.get(b.categoryId) ?? 0) || a.order - b.order,
    )

  const placeholderLinks = useMemo(
    () => links.filter((l) => isPlaceholderTitle(l.title, l.url)),
    [links],
  )
  const fixedTargets = useMemo(
    () => (linkIds ? links.filter((l) => linkIds.includes(l.id)) : null),
    [links, linkIds],
  )

  const start = (targets: Link[]) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setResults([])
    setPhase('fetching')
    const collected: Result[] = []
    void mapWithLimit(
      sortLinks(targets),
      CONCURRENCY,
      (link) => lookupTitle(link.url),
      (link, title) => {
        collected.push({ link, title })
        setResults([...collected])
      },
      controller.signal,
    ).then(() => {
      if (controller.signal.aborted) return
      const order = new Map(sortLinks(targets).map((l, i) => [l.id, i]))
      collected.sort((a, b) => (order.get(a.link.id) ?? 0) - (order.get(b.link.id) ?? 0))
      setResults(collected)
      setChecked(
        new Set(
          collected
            .filter((r) => r.title && r.title !== r.link.title && isPlaceholderTitle(r.link.title, r.link.url))
            .map((r) => r.link.id),
        ),
      )
      setPhase('review')
    })
  }

  // 開いたときの初期化。対象が決まっているときはすぐ取りに行く
  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort()
      return
    }
    setScope('placeholder')
    setChecked(new Set())
    setApplied(0)
    setResults([])
    if (fixedTargets) start(fixedTargets)
    else setPhase('choose')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const changes = results.filter((r) => r.title && r.title !== r.link.title)
  const failed = results.filter((r) => !r.title).length
  const same = results.length - changes.length - failed

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const apply = async () => {
    const titles = new Map(
      changes.filter((r) => checked.has(r.link.id)).map((r) => [r.link.id, r.title!]),
    )
    await renameLinks(titles)
    setApplied(titles.size)
    setPhase('done')
  }

  const total = phase === 'fetching' && fixedTargets ? fixedTargets.length : scope === 'all' ? links.length : placeholderLinks.length
  const allChecked = changes.length > 0 && changes.every((r) => checked.has(r.link.id))

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="名前を取り直す" size="xl">
      {phase === 'choose' && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-300">
            各リンクのページを読み込んで、タイトルを名前の候補にします。反映する前に一覧で確認できます。
          </p>
          <SegmentedControl<Scope>
            label="取り直す対象"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'placeholder', label: `サイト名のままのリンク（${placeholderLinks.length}）` },
              { value: 'all', label: `すべてのリンク（${links.length}）` },
            ]}
          />
          <p className="text-xs text-neutral-500">
            {scope === 'placeholder'
              ? '「example.com」のようにサイト名のままになっているリンクだけを対象にします。'
              : 'すべてのリンクを対象にします。自分で付けた名前は、確認画面で最初はチェックを外してあります。'}
          </p>
          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-4">
            <Button size="sm" onClick={onClose}>
              キャンセル
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={total === 0}
              onClick={() => start(scope === 'all' ? links : placeholderLinks)}
            >
              取得する
            </Button>
          </div>
        </div>
      )}

      {phase === 'fetching' && (
        <div className="space-y-4 py-2">
          <p className="text-sm text-neutral-300" role="status">
            ページの名前を取得中… {results.length} / {total}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-neutral-500 transition-all"
              style={{ width: `${total ? (results.length / total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={onClose}>
              中止
            </Button>
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div className="space-y-4">
          <p className="text-xs text-neutral-500">
            {changes.length} 件に新しい名前の候補があります
            {same > 0 && `／${same} 件は今の名前と同じ`}
            {failed > 0 && `／${failed} 件は取得できませんでした`}
          </p>

          {changes.length > 0 && (
            <>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={() =>
                    setChecked(allChecked ? new Set() : new Set(changes.map((r) => r.link.id)))
                  }
                  className="h-4 w-4 accent-neutral-500"
                />
                すべて選択（{checked.size} 件を選択中）
              </label>
              <ul className="-mt-2 divide-y divide-neutral-800/60">
                {changes.map(({ link, title }) => {
                  const custom = !isPlaceholderTitle(link.title, link.url)
                  return (
                    <li key={link.id}>
                      <label className="flex cursor-pointer items-start gap-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked.has(link.id)}
                          onChange={() => toggle(link.id)}
                          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-neutral-500"
                        />
                        <SiteIcon url={link.url} title={link.title} className="mt-0.5" />
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="flex min-w-0 items-baseline gap-2 text-neutral-500">
                            <span className={cn('truncate', checked.has(link.id) && 'line-through')}>{link.title}</span>
                            {custom && <span className="flex-shrink-0 text-[11px]">自分で付けた名前</span>}
                          </p>
                          <p className="flex items-center gap-1.5 text-neutral-200">
                            <ArrowRight className="h-3 w-3 flex-shrink-0 text-neutral-500" />
                            <span className="truncate">{title}</span>
                          </p>
                        </div>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-4">
            <Button size="sm" onClick={onClose}>
              {changes.length > 0 ? 'キャンセル' : '閉じる'}
            </Button>
            {changes.length > 0 && (
              <Button size="sm" variant="primary" disabled={checked.size === 0} onClick={() => void apply()}>
                {checked.size} 件を反映
              </Button>
            )}
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-4 py-2">
          <p className="text-sm text-neutral-300" role="status">
            {applied} 件の名前を変えました。
          </p>
          <div className="flex justify-end">
            <Button size="sm" onClick={onClose}>
              閉じる
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
