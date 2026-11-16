/**
 * リンク集のカードの並べ方（何列目の何番目か）。画面の部品とは切り離した、純粋な関数だけ。
 *
 * - ドラッグで並べ替えると、カードごとに「列（column）」と「列の中の順番（order）」を覚える。
 *   画面の列の数が足りていれば、そのとおりに並べる（置いた場所から動かない）
 * - まだ並べ替えたことが無いときや、画面が狭くて列が足りないとき（スマホなど）は、
 *   左上から右へ読む順にして、いちばん短い列から詰めていく
 */

export interface CardLike {
  id: string
  order: number
  column?: number
  /** カードの高さの目安（リンクの数） */
  size: number
}

export type CardDrop =
  /** あるカードの上か下 */
  | { kind: 'card'; id: string; position: 'before' | 'after' }
  /** 列のいちばん下 */
  | { kind: 'end'; column: number }

export interface CardPlace {
  id: string
  order: number
  column?: number
}

/** これより右の列は無いものとみなす（壊れたデータで大きな数が入っていても、画面を作れるように） */
const MAX_COLUMNS = 20
const columnOf = (c: { column?: number }) =>
  Number.isInteger(c.column) && (c.column as number) >= 0 && (c.column as number) < MAX_COLUMNS ? c.column : undefined

/** 置いた列を覚えているか（1 枚でも） */
const arranged = (cards: CardLike[]) => cards.some((c) => columnOf(c) !== undefined)

/** 覚えている列の数 */
const usedColumns = (cards: CardLike[]) => Math.max(0, ...cards.map((c) => (columnOf(c) ?? -1) + 1))

/** 覚えている列のとおりに並べられるか */
export const fitsColumns = (cards: CardLike[], columnCount: number) =>
  arranged(cards) && columnCount >= 2 && usedColumns(cards) <= columnCount

/** カードの高さの目安（見出しと追加ボタンでおよそリンク 3 行分） */
const height = (c: CardLike) => 3 + Math.max(1, c.size)

/** 1 列に並べるときの順（左上から右へ、上の段から読む順） */
export function flattenCards<T extends CardLike>(cards: T[]): T[] {
  if (!arranged(cards)) return [...cards].sort((a, b) => a.order - b.order)
  const rank = new Map<string, number>()
  for (const col of storedColumns(cards)) col.forEach((c, i) => rank.set(c.id, i))
  return [...cards].sort(
    (a, b) =>
      (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) ||
      (columnOf(a) ?? Infinity) - (columnOf(b) ?? Infinity) ||
      a.order - b.order,
  )
}

/** 覚えている列ごとのカード（列を覚えていないカードは含めない） */
function storedColumns<T extends CardLike>(cards: T[]): T[][] {
  const cols: T[][] = Array.from({ length: usedColumns(cards) }, () => [])
  for (const c of cards) {
    const col = columnOf(c)
    if (col !== undefined) cols[col].push(c)
  }
  for (const col of cols) col.sort((a, b) => a.order - b.order)
  return cols
}

/** 画面の列にカードを並べる */
export function layoutCards<T extends CardLike>(cards: T[], columnCount: number): T[][] {
  const n = Math.max(1, columnCount)
  const cols: T[][] = Array.from({ length: n }, () => [])
  const heights = new Array<number>(n).fill(0)
  const pushShortest = (c: T) => {
    const i = heights.indexOf(Math.min(...heights))
    cols[i].push(c)
    heights[i] += height(c)
  }
  if (fitsColumns(cards, n)) {
    storedColumns(cards).forEach((col, i) => {
      cols[i] = [...col]
      heights[i] = col.reduce((h, c) => h + height(c), 0)
    })
    // 後から作ったカード（列をまだ覚えていない）は、いちばん短い列の下へ
    for (const c of [...cards].filter((x) => columnOf(x) === undefined).sort((a, b) => a.order - b.order)) pushShortest(c)
    return cols
  }
  for (const c of flattenCards(cards)) pushShortest(c)
  return cols
}

/**
 * カードを動かしたあとの、全カードの列と順番。
 * - 列のとおりに並べているとき（列が足りている）: 今の見た目の並びをそのまま覚えてから、動かす
 * - 列が足りないとき（スマホなど）: 覚えている列はそのままに、落とした先のカードと同じ列のすぐ上か下へ入れる
 *   （PC で並べた列を崩さない）。まだ列を覚えていなければ、全体の順番だけを変える
 */
export function moveCard(cards: CardLike[], columnCount: number, dragId: string, drop: CardDrop): CardPlace[] {
  const visual = layoutCards(cards, columnCount).map((col) => col.map((c) => c.id))
  const exact = columnCount >= 2 && (!arranged(cards) || usedColumns(cards) <= columnCount)

  if (exact) {
    const cols = visual.map((col) => col.filter((id) => id !== dragId))
    if (drop.kind === 'end') {
      cols[Math.min(drop.column, cols.length - 1)].push(dragId)
    } else {
      const ci = cols.findIndex((col) => col.includes(drop.id))
      if (ci === -1) return places(cols)
      const at = cols[ci].indexOf(drop.id) + (drop.position === 'after' ? 1 : 0)
      cols[ci].splice(at, 0, dragId)
    }
    return places(cols)
  }

  // 列が足りないとき: 「列のいちばん下」は、その列のいちばん下のカードの下とみなす
  let target = drop
  if (drop.kind === 'end') {
    const last = (visual[Math.min(drop.column, visual.length - 1)] ?? []).filter((id) => id !== dragId).pop()
    if (!last) return cards.map(({ id, order, column }) => ({ id, order, column }))
    target = { kind: 'card', id: last, position: 'after' }
  }
  if (target.kind !== 'card') return cards.map(({ id, order, column }) => ({ id, order, column }))

  if (!arranged(cards)) {
    const ids = flattenCards(cards).map((c) => c.id).filter((id) => id !== dragId)
    const at = ids.indexOf(target.id) + (target.position === 'after' ? 1 : 0)
    ids.splice(at, 0, dragId)
    return ids.map((id, order) => ({ id, order }))
  }

  const cols = storedColumns(cards).map((col) => col.map((c) => c.id).filter((id) => id !== dragId))
  const loose = flattenCards(cards.filter((c) => columnOf(c) === undefined)).map((c) => c.id).filter((id) => id !== dragId)
  const ci = cols.findIndex((col) => col.includes(target.id))
  if (ci === -1) {
    // 落とした先がまだ列を覚えていないカード: 全体の順番の中で入れる
    const at = loose.indexOf(target.id) + (target.position === 'after' ? 1 : 0)
    loose.splice(Math.max(0, at), 0, dragId)
  } else {
    cols[ci].splice(cols[ci].indexOf(target.id) + (target.position === 'after' ? 1 : 0), 0, dragId)
  }
  return [...places(cols), ...loose.map((id, i) => ({ id, order: 1000 + i }))]
}

const places = (cols: string[][]): CardPlace[] => cols.flatMap((col, column) => col.map((id, order) => ({ id, order, column })))
