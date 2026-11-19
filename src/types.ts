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
  /**
   * 組み込むアプリが自由に使う欄（期日・担当・自分のアプリの id など）。
   * linkshelf はこの中を見ず、変えず、作成・更新・移動・並べ替えでも消さずに残す。保存先にもそのまま入る
   */
  meta?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/** カードの中の 1 行（リンク、または テキスト） */
export interface Link {
  id: string
  /** 入っているカテゴリの id */
  categoryId: string
  title: string
  /** リンク先。テキスト・チェック項目（kind が 'text' か 'check'）では空 */
  url: string
  /**
   * 'text': 部品の中に保存したテキスト（1 行のメモや .txt の覚書など）。本文は text に入る。
   * 'check': チェック項目（やること・習慣）。名前が項目の文で、チェックした日時は checkedAt に入る。
   * 省略時はふつうのリンク。
   */
  kind?: 'text' | 'check'
  /** kind === 'text' の本文（上限は TEXT_LIMIT_BYTES） */
  text?: string
  /** kind === 'check': チェックした日時。チェックしていなければ無い */
  checkedAt?: string
  /**
   * kind === 'check': くり返し。'daily' は毎日の習慣で、日付が変わるとチェックが外れた扱いになる。
   * 省略時は 1 回だけのやること（チェックしたら完了のまま）。
   */
  repeat?: 'daily'
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
  /**
   * 組み込むアプリが自由に使う欄（期日・担当・自分のアプリの id など）。
   * linkshelf はこの中を見ず、変えず、作成・更新・移動・並べ替えでも消さずに残す。保存先にもそのまま入る
   */
  meta?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
