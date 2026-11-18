import { useEffect, useState } from 'react'
import type { Category } from '../types'
import { imageFileOf, useImagePlacer } from '../image'
import { PasteImageDialog } from './PasteImageDialog'

/** 入力欄・テキストを書けるところでの貼り付けは、そのまま（画像として受け取らない） */
function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return !!target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')
}

/**
 * ページのどこで画像を貼り付けても受け取り、置くカードを選んでもらう（<LinkShelf pasteImagesAnywhere>）。
 * カードの上での貼り付けは、そのカードが先に受け取る（ここには来ない）。
 */
export function PasteAnywhere({ categories, rememberKey }: { categories: Category[]; rememberKey: string }) {
  const place = useImagePlacer()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const enabled = !!place
  useEffect(() => {
    if (!enabled) return
    const onPaste = (e: ClipboardEvent) => {
      if (e.defaultPrevented || isTextTarget(e.target)) return
      const f = imageFileOf(e.clipboardData)
      if (!f) return
      e.preventDefault()
      setError('')
      setFile(f)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [enabled])

  if (!place || !file) return null
  const key = `${rememberKey}:pasteCategory`
  let initial: string | null = null
  try {
    initial = localStorage.getItem(key)
  } catch {
    // 保存できない環境では、毎回はじめのカード
  }
  return (
    <PasteImageDialog
      file={file}
      categories={categories}
      initialCategoryId={initial}
      busy={busy}
      error={error}
      onClose={() => setFile(null)}
      onPlace={async (categoryId) => {
        setBusy(true)
        setError('')
        try {
          await place(file, categoryId)
          try {
            localStorage.setItem(key, categoryId)
          } catch {
            // 覚えられなくても置くのは済んでいる
          }
          setFile(null)
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e))
        } finally {
          setBusy(false)
        }
      }}
    />
  )
}
