// linkshelf の入り口。外から使えるものは、ここから出す。

/** 部品のバージョン */
export const VERSION = '0.8.0'

import './style.css'

export type { Category, Link } from './types'

// 部品
export { LinkShelf, type LinkShelfProps } from './LinkShelf'
export type { LinkShelfTheme } from './theme'
export type { UploadImage, LoadImage } from './options'
export { shrinkImage } from './image'
export { MESSAGES, type LinkShelfLocale, type LinkShelfMessages } from './i18n'

// 保存先の窓口
export type { LinkShelfStorage } from './storage/types'
export { memoryStorage } from './storage/memory'
export { indexedDbStorage, type IndexedDbStorageOptions } from './storage/indexedDb'

// ストア（<LinkShelf> ごとのデータの入れ物）
export {
  createLinkShelfStore,
  groupLinksByCategory,
  type LinkShelfState,
  type LinkShelfStore,
  type LinkShelfStoreOptions,
  type FetchTitle,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type CreateLinkInput,
  type UpdateLinkInput,
  type LinkSortMode,
} from './store'
export { LinkShelfProvider, useLinkShelf, useLinkShelfStoreApi, type LinkShelfProviderProps } from './context'

// カードを段組みに並べ、ドラッグで動かす画面を作る道具（棚と同じ仕組み。自分の画面を作るとき用）
export { layoutCards, moveCard, flattenCards, fitsColumns, type CardLike, type CardDrop, type CardPlace } from './layout'
export { useColumnCount, useDragSensors, dropPosition, pointerPosition, type DragPointerEvent } from './board'

// 判定などの道具
export { isSafeUrl, safeExternalUrl, openExternal, isSameOrigin } from './utils/url'
export {
  normalizeLinkInput,
  titleFromUrl,
  isPlaceholderTitle,
  faviconUrl,
  oneLineTitle,
  isOneLineText,
  isImageUrl,
  isChecked,
  localDateKey,
  parseCheckInput,
} from './linkUtils'
export { TEXT_LIMIT_BYTES, TEXT_ACCEPT, readTextFile, textLimitError } from './textFile'
