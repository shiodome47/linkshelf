// linkshelf の入り口。外から使えるものは、ここから出す。

/** 部品のバージョン */
export const VERSION = '0.0.0'

import './style.css'

export type { Category, Link } from './types'

// 部品
export { LinkShelf, type LinkShelfProps } from './LinkShelf'
export type { LinkShelfTheme } from './theme'

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

// 判定などの道具
export { isSafeUrl, safeExternalUrl, openExternal } from './utils/url'
export {
  normalizeLinkInput,
  titleFromUrl,
  isPlaceholderTitle,
  faviconUrl,
  oneLineTitle,
  isOneLineText,
} from './linkUtils'
export { TEXT_LIMIT_BYTES, TEXT_ACCEPT, readTextFile, textLimitError } from './textFile'
