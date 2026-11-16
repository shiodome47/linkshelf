import { type ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

type DialogSize = 'sm' | 'md' | 'lg' | 'xl'

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: DialogSize
}

const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

/**
 * ベースモーダルダイアログ。
 * - Escape キーで閉じる
 * - バックドロップクリックで閉じる
 * - 開いている間はボディのスクロールを無効化
 * - document.body に createPortal でマウント（z-index 問題を回避）
 *   部品の外に出るので、見た目を合わせるために class="linkshelf" の箱で包む
 */
export function Dialog({ isOpen, onClose, title, children, size = 'md' }: DialogProps) {
  // onClose を ref で保持して Escape ハンドラの依存配列を安定させる
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Escape キーで閉じる
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  // ボディスクロールのロック
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className="linkshelf">
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* バックドロップ */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ダイアログ本体 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl',
          sizeClasses[size],
        )}
      >
        {/* ヘッダー */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-800 px-5 py-4">
          <h2 id={titleId} className="text-sm font-semibold text-neutral-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="min-h-0 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
    </div>,
    document.body,
  )
}
