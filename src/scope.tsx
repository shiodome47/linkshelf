import { useMemo, type ReactNode } from 'react'
import { LocaleProvider, MESSAGES, type LinkShelfLocale, type LinkShelfMessages } from './i18n'
import { ThemeProvider, type LinkShelfTheme } from './theme'
import { cn } from './utils/cn'

/**
 * linkshelf の見た目（色・文字）と言葉の範囲。<LinkShelf> を使わずに、
 * 公開している部品（Button・Dialog・LinkIcon など）で自分の画面を組み立てるときは、この中に置く。
 * 見た目は .linkshelf の中だけに効くので、アプリのほかの部分には影響しない
 */
export function LinkShelfScope({
  theme = 'system',
  locale = 'ja',
  messages,
  className,
  children,
}: {
  theme?: LinkShelfTheme
  locale?: LinkShelfLocale
  /** 言葉を一部だけ差し替える */
  messages?: Partial<LinkShelfMessages>
  className?: string
  children: ReactNode
}) {
  const words = useMemo(() => ({ ...(MESSAGES[locale] ?? MESSAGES.ja), ...messages }), [locale, messages])
  return (
    <LocaleProvider value={words}>
      <ThemeProvider value={theme}>
        <div className={cn('linkshelf', className)} data-theme={theme}>
          {children}
        </div>
      </ThemeProvider>
    </LocaleProvider>
  )
}
