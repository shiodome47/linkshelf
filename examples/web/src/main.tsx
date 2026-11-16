import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LinkShelf, type LinkShelfTheme } from 'linkshelf'
import 'linkshelf/style.css'
import './page.css'
import { fetchTitle } from './fetchTitle'

const THEMES: { value: LinkShelfTheme; label: string }[] = [
  { value: 'system', label: '自動' },
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
]

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

function App() {
  const [theme, setTheme] = useSavedTheme()
  return (
    <>
      <LinkShelf fetchTitle={fetchTitle} theme={theme} title="linkshelf" />
      <footer className="page-footer">
        <label>
          表示
          <select value={theme} onChange={(e) => setTheme(e.target.value as LinkShelfTheme)}>
            {THEMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <span>データはこのブラウザの中だけに保存されます</span>
        <a href="https://github.com/shiodome47/linkshelf" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </footer>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
