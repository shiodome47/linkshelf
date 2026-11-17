import { createContext, useContext, type ReactNode } from 'react'
import type { Link } from './types'

/** 画像を受け取り、置いた先の URL（と名前）を返す。<LinkShelf uploadImage> に渡す */
export type UploadImage = (file: File, ctx: { categoryId: string }) => Promise<{ url: string; title?: string }>

/** <LinkShelf> に渡された、追加の機能（どれも任意） */
export interface LinkShelfOptions {
  uploadImage?: UploadImage
  /** リンクのアイコンを差し替える。null を返すと既定の表示 */
  linkIcon?: (link: Link) => ReactNode | null
  /** リンクを開く方法を差し替える（安全な URL のときだけ呼ばれる） */
  openLink?: (url: string, link: Link) => void
  /** 同じサイト（オリジン）の URL は、同じタブで開く */
  sameOriginInSameTab?: boolean
  /** チェック項目を足せるようにする（入力欄に「チェック項目にする」が出る） */
  checklist?: boolean
}

const OptionsContext = createContext<LinkShelfOptions>({})

export const OptionsProvider = OptionsContext.Provider

export const useOptions = () => useContext(OptionsContext)
