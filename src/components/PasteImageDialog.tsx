import { useEffect, useState } from 'react'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import type { Category } from '../types'
import { useMessages } from '../i18n'
import { categoryColorClass } from '../categoryColors'
import { cn } from '../utils/cn'

/**
 * どこでも貼り付けた画像を、どのカードに置くかを選ぶ（<LinkShelf pasteImagesAnywhere>）。
 * 前に選んだカードを、はじめから選んでおく（そのまま Enter・「置く」で置ける）。
 */
export function PasteImageDialog({
  file,
  categories,
  initialCategoryId,
  busy,
  error,
  onPlace,
  onClose,
}: {
  file: File
  categories: Category[]
  initialCategoryId: string | null
  busy: boolean
  error: string
  onPlace: (categoryId: string) => void
  onClose: () => void
}) {
  const m = useMessages()
  const [preview, setPreview] = useState('')
  const [selected, setSelected] = useState(() =>
    categories.some((c) => c.id === initialCategoryId) ? initialCategoryId! : (categories[0]?.id ?? ''),
  )
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <Dialog isOpen onClose={busy ? () => {} : onClose} title={m.pasteImageTitle} size="lg">
      {preview && (
        <img src={preview} alt="" className="mx-auto mb-3 block max-h-[40vh] max-w-full rounded border border-neutral-800 object-contain" />
      )}
      {categories.length === 0 ? (
        <p className="text-sm text-neutral-400">{m.pasteNoCards}</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (selected && !busy) onPlace(selected)
          }}
        >
          <p className="mb-2 text-xs text-neutral-400">{m.pasteToCard}</p>
          <div className="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label={m.pasteToCard}>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={selected === c.id}
                onClick={() => setSelected(c.id)}
                onDoubleClick={() => !busy && onPlace(c.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
                  selected === c.id
                    ? 'border-accent-500 bg-accent-500/15 font-semibold text-neutral-100'
                    : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800',
                )}
              >
                <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', categoryColorClass(c.color))} />
                {c.name}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="mb-2 text-xs text-red-400">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" type="button" onClick={onClose} disabled={busy}>
              {m.cancel}
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={busy || !selected} autoFocus>
              {busy ? m.placing : m.place}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
