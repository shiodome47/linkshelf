import { CheckCircle2, Copy, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import type { Link } from '../types'

/** リンク集に置いたテキストを読む（そのまま全文を表示し、コピー・編集できる） */
export function TextViewer({
  link,
  onClose,
  onEdit,
}: {
  link: Link | null
  onClose: () => void
  onEdit?: (link: Link) => void
}) {
  const [copied, setCopied] = useState(false)
  if (!link) return null
  const text = link.text ?? ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // コピーできないときは、本文を選んでもらう
    }
  }

  return (
    <Dialog isOpen onClose={onClose} title={link.title} size="xl">
      <div
        className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-sm leading-relaxed text-neutral-200"
        data-testid="text-viewer"
      >
        {text || <span className="text-neutral-500">（空のテキスト）</span>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void copy()}>
          {copied ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? 'コピーしました' : '全文をコピー'}
        </Button>
        {onEdit && (
          <Button
            size="sm"
            onClick={() => {
              onClose()
              onEdit(link)
            }}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            編集
          </Button>
        )}
        <Button size="sm" className="ml-auto" onClick={onClose}>
          閉じる
        </Button>
      </div>
    </Dialog>
  )
}
