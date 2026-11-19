import type { Category, Link } from './types'

/**
 * 棚の中身を丸ごと書き出した形（JSON にしてファイルに保存できる）。
 * 読み込むときは parseShelfData で形を確かめてから使う。
 */
export interface ShelfData {
  app: 'linkshelf'
  version: 1
  /** 書き出した日時（ISO 8601） */
  exportedAt: string
  categories: Category[]
  links: Link[]
}

/** 今のカテゴリとリンクを、書き出す形にする */
export function toShelfData(categories: Category[], links: Link[], now = new Date()): ShelfData {
  return { app: 'linkshelf', version: 1, exportedAt: now.toISOString(), categories, links }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

/**
 * 読み込んだもの（JSON.parse した値）が、棚のデータか確かめる。違えば Error を投げる（手元のデータは変えない）。
 * 足りない欄（説明・タグなど）は空で補う
 */
export function parseShelfData(value: unknown): ShelfData {
  if (!isObj(value) || value.app !== 'linkshelf') throw new Error('linkshelf のデータではありません / Not linkshelf data')
  if (value.version !== 1) throw new Error('このデータの版には対応していません / Unsupported data version')
  const { categories, links } = value
  if (!Array.isArray(categories) || !Array.isArray(links)) throw new Error('データの形が正しくありません / Invalid data')
  const t = new Date().toISOString()
  const cats: Category[] = categories.map((c) => {
    if (!isObj(c) || !isStr(c.id) || !isStr(c.name)) throw new Error('カテゴリのデータが正しくありません / Invalid category')
    return { ...c, description: isStr(c.description) ? c.description : '', order: typeof c.order === 'number' ? c.order : 0, createdAt: isStr(c.createdAt) ? c.createdAt : t, updatedAt: isStr(c.updatedAt) ? c.updatedAt : t } as Category
  })
  const ids = new Set(cats.map((c) => c.id))
  const ls: Link[] = links.map((l) => {
    if (!isObj(l) || !isStr(l.id) || !isStr(l.categoryId) || !isStr(l.title) || !isStr(l.url)) throw new Error('項目のデータが正しくありません / Invalid link')
    if (!ids.has(l.categoryId)) throw new Error('どのカテゴリにも入っていない項目があります / A link has no category')
    return {
      ...l,
      description: isStr(l.description) ? l.description : '',
      tags: Array.isArray(l.tags) ? l.tags.filter(isStr) : [],
      isFavorited: l.isFavorited === true,
      isPinned: l.isPinned === true,
      order: typeof l.order === 'number' ? l.order : 0,
      createdAt: isStr(l.createdAt) ? l.createdAt : t,
      updatedAt: isStr(l.updatedAt) ? l.updatedAt : t,
    } as Link
  })
  return { app: 'linkshelf', version: 1, exportedAt: isStr(value.exportedAt) ? value.exportedAt : t, categories: cats, links: ls }
}

/**
 * 今の中身に、読み込んだ中身を足す（同じ id は読み込んだ方で上書き）。
 * 足したカテゴリは、今のカテゴリの後ろに並ぶ
 */
export function mergeShelfData(current: { categories: Category[]; links: Link[] }, incoming: ShelfData): { categories: Category[]; links: Link[] } {
  const known = new Set(current.categories.map((c) => c.id))
  const base = current.categories.length ? Math.max(...current.categories.map((c) => c.order)) + 1 : 0
  let n = 0
  const cats = incoming.categories.map((c) => (known.has(c.id) ? c : { ...c, order: base + n++, column: undefined }))
  const byId = new Map([...current.categories, ...cats].map((c) => [c.id, c]))
  const linkById = new Map([...current.links, ...incoming.links].map((l) => [l.id, l]))
  return { categories: [...byId.values()], links: [...linkById.values()] }
}
