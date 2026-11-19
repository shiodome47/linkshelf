import { createContext, useContext, type ReactNode } from 'react'
import type { Category, Link } from './types'

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
  /** 置く前に、画像の長い辺をこの大きさ（px）に縮める（WebP、使えなければ JPEG） */
  imageMaxSide?: number
  /** 画像のリンクを、新しいタブではなく部品の中の画像ビューア（メモつき）で開く */
  viewImages?: boolean
  /** 画像ビューアで画像を読む方法（合言葉の要る画像など）。Blob か、表示に使う URL を返す */
  loadImage?: LoadImage
  /** リンク行の右（星の左）に、アプリが自分の表示を差し込む */
  renderLinkExtra?: (link: Link) => ReactNode
  /** カードの見出しの右（数の左）に、アプリが自分の表示を差し込む */
  renderCardExtra?: (category: Category, links: Link[]) => ReactNode
}

/** 画像ビューアで画像を読む。Blob（部品が表示用の URL にする）か、そのまま <img src> に使える URL を返す */
export type LoadImage = (url: string, link: Link) => Promise<Blob | string>

const OptionsContext = createContext<LinkShelfOptions>({})

export const OptionsProvider = OptionsContext.Provider

export const useOptions = () => useContext(OptionsContext)
