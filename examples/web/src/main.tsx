import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Monitor, Moon, Sun } from 'lucide-react'
import { LinkShelf, type LinkShelfTheme } from 'linkshelf'
import 'linkshelf/style.css'
import './page.css'
import { fetchTitle } from './fetchTitle'

/** 押すたびに 自動 → ライト → ダーク → 自動 … と切り替える */
const THEMES: Record<LinkShelfTheme, { label: string; next: LinkShelfTheme; Icon: typeof Sun }> = {
  system: { label: '自動', next: 'light', Icon: Monitor },
  light: { label: 'ライト', next: 'dark', Icon: Sun },
  dark: { label: 'ダーク', next: 'system', Icon: Moon },
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
  const { label, next, Icon } = THEMES[theme]
  const hint = `表示: ${label}（押すと${THEMES[next].label}）`
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
