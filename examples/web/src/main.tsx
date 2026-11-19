import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Monitor, Moon, Sun } from 'lucide-react'
import { LinkShelf, type LinkShelfLocale, type LinkShelfTheme } from 'linkshelf'
import 'linkshelf/style.css'
import './page.css'
import { fetchTitle } from './fetchTitle'
import { loadLocalImage, saveLocalImage } from './localImages'

/** ブラウザの言葉が日本語なら日本語、それ以外は英語で表示する */
const LOCALE: LinkShelfLocale = navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en'

/** 押すたびに 自動 → ライト → ダーク → 自動 … と切り替える */
const THEMES: Record<LinkShelfTheme, { label: Record<LinkShelfLocale, string>; next: LinkShelfTheme; Icon: typeof Sun }> = {
  system: { label: { ja: '自動', en: 'Auto' }, next: 'light', Icon: Monitor },
  light: { label: { ja: 'ライト', en: 'Light' }, next: 'dark', Icon: Sun },
  dark: { label: { ja: 'ダーク', en: 'Dark' }, next: 'system', Icon: Moon },
}

const themeHint = (theme: LinkShelfTheme) => {
  const now = THEMES[theme].label[LOCALE]
  const next = THEMES[THEMES[theme].next].label[LOCALE]
  return LOCALE === 'ja' ? `表示: ${now}（押すと${next}）` : `Theme: ${now} (click for ${next})`
}

/** 選んだテーマを覚えておく（このブラウザの中だけ） */
function useSavedTheme(): [LinkShelfTheme, (t: LinkShelfTheme) => void] {
  const [theme, setTheme] = useState<LinkShelfTheme>(() => {
    try {
      const saved = localStorage.getItem('linkshelf-example-theme')
      return saved === 'light' || saved === 'dark' ? saved : 'system'
    } catch {
      return 'system'
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('linkshelf-example-theme', theme)
    } catch {
      /* 保存できなくても動く */
    }
    document.documentElement.dataset.theme = theme
  }, [theme])
  return [theme, setTheme]
}

function ThemeButton({ theme, onChange }: { theme: LinkShelfTheme; onChange: (t: LinkShelfTheme) => void }) {
  const { next, Icon } = THEMES[theme]
  const hint = themeHint(theme)
  return (
    <button type="button" className="theme-button" onClick={() => onChange(next)} aria-label={hint} title={hint}>
      <Icon aria-hidden="true" />
    </button>
  )
}

function App() {
  const [theme, setTheme] = useSavedTheme()
  return (
    <LinkShelf
      fetchTitle={fetchTitle}
      theme={theme}
      locale={LOCALE}
      collapsible
      checklist
      // 中身を JSON のファイルに書き出す・読み込む
      backup
      // 画像: このブラウザの中に置き、部品の中でメモを添えて見る
      uploadImage={saveLocalImage}
      imageMaxSide={2000}
      pasteImagesAnywhere
      viewImages
      loadImage={loadLocalImage}
      title="linkshelf"
      actions={<ThemeButton theme={theme} onChange={setTheme} />}
    />
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
