/**
 * linkshelf のデータの形。
 * 1 つのカテゴリ（Category）が 1 枚のカードになり、その中にリンクやテキスト（Link）が並ぶ。
 * 日時は ISO 8601 の文字列（例: '2026-01-01T00:00:00.000Z'）。
 */

/** カテゴリ（カード 1 枚） */
export interface Category {
  id: string
  name: string
  description: string
  /** カードの色の名前（例: 'teal'）か、#から始まる色（例: '#14b8a6'） */
  color?: string
  /**
   * 並び順。column があるときは、その列の中での順番（上から 0, 1, 2 …）。
   * column が無い（並べ替えたことが無い）ときは、全体での順番。
   */
  order: number
  /** 画面で置く列（左から 0, 1, 2 …）。ドラッグで並べ替えると決まる */
  column?: number
  createdAt: string
  updatedAt: string
}

/** カードの中の 1 行（リンク、または テキスト） */
export interface Link {
  id: string
  /** 入っているカテゴリの id */
  categoryId: string
  title: string
  /** リンク先。テキスト（kind === 'text'）では空 */
  url: string
  /**
   * 'text': 部品の中に保存したテキスト（1 行のメモや .txt の覚書など）。本文は text に入る。
   * 省略時はふつうのリンク。
   */
  kind?: 'text'
  /** kind === 'text' の本文（上限は TEXT_LIMIT_BYTES） */
  text?: string
  description: string
  tags: string[]
  /** お気に入り（星） */
  isFavorited: boolean
  /** 固定表示の印（組み込む側で使うためのもの。部品の画面では使わない） */
  isPinned: boolean
  /** カードの中での順番（上から 0, 1, 2 …） */
  order: number
  /** 最後に開いた日時 */
  lastAccessedAt?: string
  createdAt: string
  updatedAt: string
}
