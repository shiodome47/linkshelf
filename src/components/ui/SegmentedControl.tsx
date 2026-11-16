import { cn } from '../../utils/cn'

interface Option<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  /** 読み上げ用のまとまりの名前 */
  label: string
  /**
   * tabs: 下の中身を切り替える（role="tablist"）
   * radio: 設定値を選ぶ（role="radiogroup"）
   */
  kind?: 'tabs' | 'radio'
  /** 横幅いっぱいに広げる */
  fullWidth?: boolean
  className?: string
}

/**
 * 選択の切り替え（テーマ、書き出す／読み込む など）。
 *
 * 色の使い分けのルール: 選択状態はアクセントカラーを使わず、灰色（枠と影つき）で示す。
 * アクセントカラーは「主な操作ボタン」だけに使い、押せるものと状態表示を見分けやすくする。
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  kind = 'radio',
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  const isTabs = kind === 'tabs'
  return (
    <div
      role={isTabs ? 'tablist' : 'radiogroup'}
      aria-label={label}
      className={cn(
        'rounded-lg border border-neutral-800 bg-neutral-800/50 p-0.5',
        fullWidth ? 'flex' : 'inline-flex',
        className,
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role={isTabs ? 'tab' : 'radio'}
            aria-selected={isTabs ? selected : undefined}
            aria-checked={isTabs ? undefined : selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500',
              fullWidth && 'flex-1',
              selected
                ? 'border-neutral-600 bg-neutral-700 text-neutral-100 shadow-sm'
                : 'border-transparent text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
