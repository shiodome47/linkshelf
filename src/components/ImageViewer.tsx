import { ExternalLink, Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { Textarea } from './ui/Textarea'
import type { Link } from '../types'
import { useLinkShelf } from '../context'
import { useMessages } from '../i18n'
import { useOptions } from '../options'

/**
 * 画像のリンクを、部品の中で見る（<LinkShelf viewImages>）。
 * 下に、リンクのメモ（description）を添えて見せ、その場で書いたり直したりできる。
 * loadImage を渡すと、それで画像を読む（合言葉の要る画像など）。無ければ URL をそのまま使う。
 */
export function ImageViewer({ link, readOnly, onClose }: { link: Link; readOnly: boolean; onClose: () => void }) {
  const m = useMessages()
  const { loadImage } = useOptions()
  const { updateLink } = useLinkShelf()
  const [src, setSrc] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [memo, setMemo] = useState(link.description)
  const [saving, setSaving] = useState(false)

  // loadImage は、アプリが描き直されるたびに新しい関数になることが多い（props に直接書いたときなど）。
  // それで読み直すと、そのたびに画像が消えて「読み込み中」になり、チラついて見える。
  // いちばん新しい関数を覚えておき、読み直すのは開いた画像（url）が変わったときだけにする
  const loadRef = useRef(loadImage)
  useEffect(() => {
    loadRef.current = loadImage
  })
  const hasLoader = !!loadImage

  useEffect(() => {
    const load = loadRef.current
    let alive = true
    let made = ''
    setSrc('')
    setError('')
    if (!load) {
      setSrc(link.url)
      return
    }
    load(link.url, link)
      .then((r) => {
        const u = typeof r === 'string' ? r : URL.createObjectURL(r)
        if (typeof r !== 'string') made = u
        if (alive) setSrc(u)
        else if (made) URL.revokeObjectURL(made)
      })
      .catch((e) => alive && setError(e instanceof Error && e.message ? e.message : m.imageLoadFailed))
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
    // 開いた画像（url）が変わったとき（と、loadImage を渡す・渡さないが変わったとき）だけ読み直す
  }, [link.url, hasLoader])

  const save = async () => {
    setSaving(true)
    try {
      await updateLink(link.id, { description: memo.trim() })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog isOpen onClose={onClose} title={link.title} size="xl">
      <div className="flex min-h-[8rem] items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 p-2">
        {error ? (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        ) : src ? (
          <img
            src={src}
            alt={link.title}
            data-testid="image-viewer-img"
            className="max-h-[60vh] max-w-full rounded object-contain"
            onError={() => setError(m.imageLoadFailed)}
          />
        ) : (
          <p role="status" className="text-sm text-neutral-500">
            {m.loading}
          </p>
        )}
      </div>

      {/* メモ（リンクのメモと同じもの） */}
      <div className="mt-3">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
          >
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              autoFocus
              aria-label={m.imageMemo}
              placeholder={m.imageMemoPlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  void save()
                }
              }}
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  setMemo(link.description)
                  setEditing(false)
                }}
              >
                {m.cancel}
              </Button>
              <Button size="sm" variant="primary" type="submit" disabled={saving}>
                {saving ? m.saving : m.save}
              </Button>
            </div>
          </form>
        ) : link.description ? (
          <div
            data-testid="image-viewer-memo"
            className="whitespace-pre-wrap break-words rounded-lg bg-neutral-800/50 px-3 py-2 text-sm leading-relaxed text-neutral-200"
          >
            {link.description}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!readOnly && !editing && (
          <Button size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {link.description ? m.editImageMemo : m.addImageMemo}
          </Button>
        )}
        {/* 合言葉の要らない画像は、新しいタブでも開ける */}
        {!loadImage && (
          <Button size="sm" onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            {m.openInNewTab}
          </Button>
        )}
      </div>
    </Dialog>
  )
}
