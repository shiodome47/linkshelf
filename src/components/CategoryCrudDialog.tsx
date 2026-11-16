import { type FormEvent, useEffect, useState } from 'react'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { FormField } from './ui/FormField'
import { Input } from './ui/Input'
import type { Category } from '../types'
import { useLinkShelf } from '../context'
import { cn } from '../utils/cn'
import { CATEGORY_COLORS as COLOR_OPTIONS } from '../categoryColors'

interface CategoryCrudDialogProps {
  isOpen: boolean
  onClose: () => void
  category?: Category
}


/**
 * リソースカテゴリの作成・編集ダイアログ。
 */
export function CategoryCrudDialog({
  isOpen,
  onClose,
  category,
}: CategoryCrudDialogProps) {
  const isEdit = category !== undefined
  const { addCategory, updateCategory } = useLinkShelf()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('teal')
  const [nameError, setNameError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setName(category?.name ?? '')
      setDescription(category?.description ?? '')
      setColor(category?.color ?? 'teal')
      setNameError('')
      setIsSubmitting(false)
    }
  }, [isOpen, category])

  const validate = (): boolean => {
    if (!name.trim()) {
      setNameError('カテゴリ名は必須です')
      return false
    }
    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      if (isEdit) {
        await updateCategory(category.id, {
          name: name.trim(),
          description: description.trim(),
          color,
        })
      } else {
        await addCategory({ name: name.trim(), description: description.trim(), color })
      }
      onClose()
    } catch {
      console.error('[CategoryCrudDialog] 保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'カテゴリを編集' : 'カテゴリを追加'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="カテゴリ名" required error={nameError}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setNameError('')
            }}
            placeholder="例: 仕事"
            autoFocus
          />
        </FormField>

        <FormField label="説明">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="カテゴリの説明（任意）"
          />
        </FormField>

        {/* カラースウォッチ */}
        <FormField label="カラー">
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setColor(opt.value)}
                title={opt.label}
                className={cn(
                  'h-6 w-6 rounded-full transition-transform',
                  opt.bgClass,
                  color === opt.value
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110'
                    : 'opacity-60 hover:opacity-100',
                )}
                aria-label={opt.label}
                aria-pressed={color === opt.value}
              />
            ))}
          </div>
        </FormField>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : isEdit ? '保存' : '追加'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
