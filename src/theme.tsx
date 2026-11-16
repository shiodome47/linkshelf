import { createContext, useContext } from 'react'

/** 見た目の明るさ。system は端末の設定に合わせる */
export type LinkShelfTheme = 'light' | 'dark' | 'system'

const ThemeContext = createContext<LinkShelfTheme>('system')

export const ThemeProvider = ThemeContext.Provider

/** いまのテーマ（ダイアログなど、部品の外に出すものに付けるため） */
export const useTheme = () => useContext(ThemeContext)
