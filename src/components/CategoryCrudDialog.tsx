import { type FormEvent, useEffect, useState } from 'react'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { FormField } from './ui/FormField'
import { Input } from './ui/Input'
import type { Category } from '../types'
import { useLinkShelf } from '../context'
import { cn } from '../utils/cn'
import { CATEGORY_COLORS as COLOR_OPTIONS } from '../categoryColors'
import { useMessages } from '../i18n'

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
  const m = useMessages()

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
      setNameError(m.categoryNameRequired)
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
      console.error('[linkshelf] could not save the category')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? m.editCategory : m.addCategory}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label={m.categoryName} required error={nameError}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setNameError('')
            }}
            placeholder={m.categoryNamePlaceholder}
            autoFocus
          />
        </FormField>

        <FormField label={m.description}>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={m.descriptionPlaceholder}
          />
        </FormField>

        {/* カラースウォッチ */}
        <FormField label={m.color}>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setColor(opt.value)}
                title={m.colors[opt.value] ?? opt.label}
                className={cn(
                  'h-6 w-6 rounded-full transition-transform',
                  opt.bgClass,
                  color === opt.value
                    ? 'ring-2 ring-neutral-400 ring-offset-2 ring-offset-neutral-900 scale-110'
                    : 'opacity-60 hover:opacity-100',
                )}
                aria-label={m.colors[opt.value] ?? opt.label}
                aria-pressed={color === opt.value}
              />
            ))}
          </div>
        </FormField>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {m.cancel}
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? m.saving : isEdit ? m.save : m.add}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
