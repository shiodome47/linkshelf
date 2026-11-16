import { type FormEvent, useEffect, useState } from 'react'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { FormField } from './ui/FormField'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'
import type { Link } from '../types'
import { normalizeLinkInput } from '../linkUtils'
import { formatBytes, TEXT_LIMIT_BYTES, textBytes, textLimitError } from '../textFile'
import { useLinkShelf } from '../context'

interface LinkCrudDialogProps {
  isOpen: boolean
  onClose: () => void
  link?: Link
  /** 「削除」ボタンを押されたら呼ぶ（確認は呼び出し側で行う） */
  onDelete?: (link: Link) => void
}

/**
 * リンクの編集ダイアログ。
 *
 * 追加はカードの「リンクを追加」、カテゴリの移動はドラッグか整理画面で行うため、
 * ここでは名前・URL・メモだけを編集する。
 * タグは画面に出さなくなったが、既存のデータは消さずに残す（検索には引き続き使う）。
 */
export function LinkCrudDialog({ isOpen, onClose, link, onDelete }: LinkCrudDialogProps) {
  const { updateLink, lookupTitle, deleteLink } = useLinkShelf()

  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<{ title?: string; url?: string; text?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lookup, setLookup] = useState<'idle' | 'loading' | 'failed'>('idle')

  useEffect(() => {
    if (isOpen) {
      setTitle(link?.title ?? '')
      setUrl(link?.url ?? '')
      setDescription(link?.description ?? '')
      setText(link?.text ?? '')
      setErrors({})
      setIsSubmitting(false)
      setLookup('idle')
    }
  }, [isOpen, link])

  if (!link) return null
  const isText = link.kind === 'text'
  /** 「テキストを書く」で作ったばかりで、まだ一度も保存していない空のテキスト */
  const isUnsavedNewText = isText && !link.text && link.createdAt === link.updatedAt
  /** 保存せずに閉じる（書きかけを作っただけなら消す） */
  const cancel = () => {
    if (isUnsavedNewText) void deleteLink(link.id)
    onClose()
  }

  const handleLookup = async () => {
    const normalized = normalizeLinkInput(url)
    if (!normalized) {
      setErrors((prev) => ({ ...prev, url: '有効な URL を入力してください（https://...）' }))
      return
    }
    setLookup('loading')
    const fetched = await lookupTitle(normalized)
    if (fetched) {
      setTitle(fetched)
      setErrors((prev) => ({ ...prev, title: undefined }))
      setLookup('idle')
    } else {
      setLookup('failed')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const newErrors: typeof errors = {}
    if (!title.trim()) newErrors.title = '名前を入力してください'
    if (isText) {
      const tooBig = textLimitError(text)
      if (tooBig) newErrors.text = tooBig
      setErrors(newErrors)
      if (Object.keys(newErrors).length > 0) return
      setIsSubmitting(true)
      try {
        await updateLink(link.id, { title: title.trim(), text, description: description.trim() })
        onClose()
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    const normalized = normalizeLinkInput(url)
    if (!url.trim()) newErrors.url = 'URL を入力してください'
    else if (!normalized) newErrors.url = '有効な URL を入力してください（https://...）'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0 || !normalized) return

    setIsSubmitting(true)
    try {
      await updateLink(link.id, {
        title: title.trim(),
        url: normalized,
        description: description.trim(),
      })
      onClose()
    } catch {
      console.error('[LinkCrudDialog] 保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={cancel}
      title={isUnsavedNewText ? 'テキストを書く' : isText ? 'テキストを編集' : 'リンクを編集'}
      size={isText ? 'lg' : 'md'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="名前" required error={errors.title}>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setErrors((prev) => ({ ...prev, title: undefined }))
            }}
            placeholder={isText ? '例: 買い物メモ' : '例: よく使う辞書'}
            autoFocus={!isUnsavedNewText}
          />
          {!isText && (
          <div className="mt-1.5 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void handleLookup()}
              disabled={lookup === 'loading' || !url.trim()}
            >
              {lookup === 'loading' ? '取得中…' : 'URL から名前を取得'}
            </Button>
            {lookup === 'failed' && (
              <span className="text-[11px] text-neutral-500">このページからは名前を取得できませんでした</span>
            )}
          </div>
          )}
        </FormField>

        {isText ? (
          <FormField
            label="テキスト"
            error={errors.text}
            hint={`${formatBytes(textBytes(text))} / ${formatBytes(TEXT_LIMIT_BYTES)}`}
          >
            <Textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setErrors((prev) => ({ ...prev, text: undefined }))
              }}
              rows={12}
              autoFocus={isUnsavedNewText}
              placeholder="ここに書きます"
              aria-label="テキスト"
            />
          </FormField>
        ) : (
        <FormField label="URL" required error={errors.url}>
          <Input
            value={url}
            inputMode="url"
            onChange={(e) => {
              setUrl(e.target.value)
              setErrors((prev) => ({ ...prev, url: undefined }))
            }}
            placeholder="https://..."
          />
        </FormField>
        )}

{!isText && (
        <FormField label="メモ" hint="リンクにマウスを乗せると表示されます。検索の対象にもなります">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="使い方や特徴など（任意）"
            rows={2}
          />
        </FormField>
        )}

        <div className="flex items-center gap-2 pt-1">
          {onDelete && !isUnsavedNewText && (
            <Button type="button" variant="danger" size="sm" onClick={() => onDelete(link)}>
              削除
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" size="sm" onClick={cancel}>
              キャンセル
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
