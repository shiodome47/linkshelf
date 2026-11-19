// ============================================================
// リンクのドラッグ＆ドロップ — ID とデータの約束事
// （カードのドラッグは <CardBoard> が受け持つ。ここはカードの中のリンクだけ）
// ============================================================
//
// ドラッグできるもの:
//   link  … リンク 1 行（別のリンクの上か、カードのリンク一覧へ落とす）
// 落とせる場所:
//   link  … リンク 1 行（その前後に入れる）
//   list  … カードのリンク一覧（末尾に入れる。空のカードにも入れられる）

export type DropKind = 'link' | 'list'

export interface LinkDragData {
  kind: 'link'
  linkId: string
  categoryId: string
}

export interface DropData {
  kind: DropKind
  categoryId: string
  linkId?: string
}

export const linkDragId = (id: string) => `link::${id}`
export const linkDropId = (id: string) => `link-drop::${id}`
export const listDropId = (categoryId: string) => `list::${categoryId}`

/** リンクを落とす位置の目印（どのリンクの前か後か、または一覧の末尾か） */
export type LinkDropIndicator =
  | { kind: 'link'; linkId: string; position: 'before' | 'after' }
  | { kind: 'list'; categoryId: string }
  | null
