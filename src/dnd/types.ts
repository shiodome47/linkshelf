// ============================================================
// リソース画面のドラッグ＆ドロップ — ID とデータの約束事
// ============================================================
//
// ドラッグできるもの:
//   link  … リンク 1 行（別のリンクの上か、カードのリンク一覧へ落とす）
//   card  … カテゴリのカード（別のカードの上へ落とす）
// 落とせる場所:
//   link  … リンク 1 行（その前後に入れる）
//   list  … カードのリンク一覧（末尾に入れる。空のカードにも入れられる）
//   card  … カード全体（カードの並び替え用。カードの上半分なら上、下半分なら下へ入れる）
//   column … 列の下の空いているところ（その列のいちばん下へ入れる）

export type DragKind = 'link' | 'card'
export type DropKind = 'link' | 'list' | 'card' | 'column'

export interface LinkDragData {
  kind: 'link'
  linkId: string
  categoryId: string
}

export interface CardDragData {
  kind: 'card'
  categoryId: string
}

export interface DropData {
  kind: DropKind
  /** column のときは空 */
  categoryId: string
  linkId?: string
  /** column のとき: 何列目か */
  column?: number
}

export const linkDragId = (id: string) => `link::${id}`
export const linkDropId = (id: string) => `link-drop::${id}`
export const listDropId = (categoryId: string) => `list::${categoryId}`
export const cardDragId = (categoryId: string) => `card::${categoryId}`
export const cardDropId = (categoryId: string) => `card-drop::${categoryId}`
export const columnDropId = (column: number) => `column-drop::${column}`

/** リンクを落とす位置の目印（どのリンクの前か後か、または一覧の末尾か） */
export type LinkDropIndicator =
  | { kind: 'link'; linkId: string; position: 'before' | 'after' }
  | { kind: 'list'; categoryId: string }
  | null

/** カードを落とす位置の目印（どのカードの上か下か、または列のいちばん下か） */
export type CardDropIndicator =
  | { kind: 'card'; categoryId: string; position: 'before' | 'after' }
  | { kind: 'end'; column: number }
  | null
