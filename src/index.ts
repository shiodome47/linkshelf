// linkshelf の入り口。外から使えるものは、ここから出す。

/** 部品のバージョン */
export const VERSION = '0.0.0'

export type { Category, Link } from './types'
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
