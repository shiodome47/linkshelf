import { createStore, type StoreApi } from 'zustand/vanilla'
import type { Category, Link } from './types'
import { putMany, type LinkShelfStorage } from './storage/types'
import { isChecked, titleFromUrl } from './linkUtils'

// ============================================================
// 入力の形
// ============================================================

export interface CreateCategoryInput {
  name: string
  description?: string
  /** 色の名前（例: 'teal'）か、#から始まる色 */
  color?: string
}

export interface UpdateCategoryInput {
  name?: string
  description?: string
  color?: string
}

export interface CreateLinkInput {
  categoryId: string
  title: string
  url: string
  kind?: 'text' | 'check'
  text?: string
  /** kind === 'check' のときのくり返し（'daily' で毎日） */
  repeat?: 'daily'
  description?: string
  tags?: string[]
}

export interface UpdateLinkInput {
  categoryId?: string
  title?: string
  url?: string
  text?: string
  description?: string
  tags?: string[]
  isFavorited?: boolean
  isPinned?: boolean
  /** チェック項目のくり返し。null で「1 回だけ」に戻す */
  repeat?: 'daily' | null
}

/** カテゴリ内リンクの並べ替え方 */
export type LinkSortMode = 'title' | 'newest' | 'recent'

/** ページの名前を取る関数（取れなければ null）。組み込む側が渡す */
export type FetchTitle = (url: string) => Promise<string | null>

export interface LinkShelfStoreOptions {
  /** ページの名前を取る窓口。無ければ、名前は URL から作る */
  fetchTitle?: FetchTitle
}

// ============================================================
// ストアの形
// ============================================================

export interface LinkShelfState {
  // --- データ ---
  categories: Category[]
  links: Link[]
  /** 保存先から読み終わったか */
  loaded: boolean
  /** ページの名前を取りに行っている最中のリンク */
  fetchingTitleIds: string[]
  /** ページの名前を取る窓口があるか（無ければ「名前を取り直す」などを出さない） */
  canFetchTitle: boolean

  // --- 初期化 ---
  loadAll: () => Promise<void>
  /**
   * 保存先の「変わったら知らせる」窓口（subscribe）を使い始める。知らせが来たら読み直す。
   * 戻り値は、やめる関数。保存先に窓口が無ければ、何もしない
   */
  watch: () => () => void

  // --- カテゴリ ---
  addCategory: (data: CreateCategoryInput) => Promise<Category>
  updateCategory: (id: string, data: UpdateCategoryInput) => Promise<void>
  /** 中のリンクもまとめて消す */
  deleteCategory: (id: string) => Promise<void>

  // --- リンク ---
  addLink: (data: CreateLinkInput) => Promise<Link>
  /**
   * URL だけでリンクを足す。名前はいったんサイト名にしておき、
   * ページの名前が取れたら置き換える（その間に名前を変えていたら置き換えない）。
   */
  addLinkFromUrl: (categoryId: string, url: string) => Promise<Link>
  /** ページの名前を取り直す。取れた名前を返す（リンクは書き換えない）。窓口が無ければ null */
  lookupTitle: (url: string) => Promise<string | null>
  updateLink: (id: string, data: UpdateLinkInput) => Promise<void>
  deleteLink: (id: string) => Promise<void>
  /** 複数のリンクの名前をまとめて変える（id → 新しい名前） */
  renameLinks: (titles: Map<string, string>) => Promise<void>
  /** 最後に開いた日時を記録する（リンクを開いたときに呼ぶ） */
  recordAccess: (id: string) => Promise<void>
  /** チェック項目のチェックを付ける・外す（毎日くり返す項目は、今日の分） */
  toggleCheck: (id: string) => Promise<void>
  /** カテゴリの中の、チェック済みの「1 回だけ」の項目をまとめて消す */
  clearDoneChecks: (categoryId: string) => Promise<void>

  // --- 並べ替え ---
  reorderCategories: (orderedIds: string[]) => Promise<void>
  /** カードの列と順番をまとめて変える（ドラッグしたとき） */
  arrangeCategories: (places: { id: string; order: number; column?: number }[]) => Promise<void>
  reorderLinks: (orderedIds: string[]) => Promise<void>
  /**
   * リンクを別のカテゴリ（同じカテゴリでもよい）の指定位置へ移す。
   * toIndex は移動先カテゴリの並び（移すリンク自身を除いたもの）での位置。省略時は末尾。
   */
  moveLink: (id: string, toCategoryId: string, toIndex?: number) => Promise<void>
  /** 複数のリンクを別のカテゴリの末尾へまとめて移す（今の並び順を保つ） */
  moveLinks: (ids: string[], toCategoryId: string) => Promise<void>
  /** 複数のリンクをまとめて消す */
  deleteLinks: (ids: string[]) => Promise<void>
  /** カテゴリ内のリンクを並べ替えて、その順番を保存する */
  sortLinks: (categoryId: string, mode: LinkSortMode) => Promise<void>
}

export type LinkShelfStore = StoreApi<LinkShelfState>

// ============================================================
// ストアを作る（<LinkShelf> ごとに 1 つ）
// ============================================================

export function createLinkShelfStore(storage: LinkShelfStorage, options: LinkShelfStoreOptions = {}): LinkShelfStore {
  const { fetchTitle } = options
  const now = () => new Date().toISOString()

  return createStore<LinkShelfState>()((set, get) => {
    /**
     * 並べ直したリストごとに order を 0 から振り直して保存する。
     * 変わったリンクだけを書き込む。
     */
    const saveRenumbered = async (lists: Link[][]) => {
      const t = now()
      const current = new Map(get().links.map((l) => [l.id, l]))
      const changed: Link[] = []
      for (const list of lists) {
        list.forEach((link, index) => {
          const before = current.get(link.id)
          if (before && before.order === index && before.categoryId === link.categoryId) return
          changed.push({ ...link, order: index, updatedAt: t })
        })
      }
      if (changed.length === 0) return
      const byId = new Map(changed.map((l) => [l.id, l]))
      set((s) => ({ links: s.links.map((l) => byId.get(l.id) ?? l) }))
      await putMany(storage, { links: changed })
    }

    return {
      categories: [],
      links: [],
      loaded: false,
      fetchingTitleIds: [],
      canFetchTitle: !!fetchTitle,

      // ─── 初期化 ───────────────────────────────────────────

      loadAll: async () => {
        const { categories, links } = await storage.loadAll()
        set({ categories, links, loaded: true })
      },

      watch: () => {
        if (!storage.subscribe) return () => {}
        return storage.subscribe(() => {
          // 読み直しに失敗しても、今の表示はそのまま残す
          get().loadAll().catch(() => {})
        })
      },

      // ─── カテゴリ ─────────────────────────────────────────

      addCategory: async (data) => {
        const t = now()
        const category: Category = {
          id: crypto.randomUUID(),
          name: data.name,
          description: data.description ?? '',
          ...(data.color !== undefined ? { color: data.color } : {}),
          order: get().categories.length,
          createdAt: t,
          updatedAt: t,
        }
        await storage.putCategory(category)
        set((s) => ({ categories: [...s.categories, category] }))
        return category
      },

      updateCategory: async (id, data) => {
        const existing = get().categories.find((c) => c.id === id)
        if (!existing) return
        const updated: Category = { ...existing, ...data, updatedAt: now() }
        await storage.putCategory(updated)
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? updated : c)) }))
      },

      deleteCategory: async (id) => {
        const linkIds = get().links.filter((l) => l.categoryId === id).map((l) => l.id)
        // 先にリンクを消す（途中で止まっても、カテゴリの無いリンクが残らないように）
        if (linkIds.length > 0) await storage.deleteLinks(linkIds)
        await storage.deleteCategory(id)
        const gone = new Set(linkIds)
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          links: s.links.filter((l) => !gone.has(l.id)),
        }))
      },

      // ─── リンク ───────────────────────────────────────────

      addLink: async (data) => {
        const t = now()
        const order = get().links.filter((l) => l.categoryId === data.categoryId).length
        const link: Link = {
          id: crypto.randomUUID(),
          categoryId: data.categoryId,
          title: data.title,
          url: data.url,
          ...(data.kind === 'text' ? { kind: 'text' as const, text: data.text ?? '' } : {}),
          ...(data.kind === 'check' ? { kind: 'check' as const, ...(data.repeat ? { repeat: data.repeat } : {}) } : {}),
          description: data.description ?? '',
          tags: data.tags ?? [],
          isFavorited: false,
          isPinned: false,
          order,
          createdAt: t,
          updatedAt: t,
        }
        await storage.putLink(link)
        set((s) => ({ links: [...s.links, link] }))
        return link
      },

      addLinkFromUrl: async (categoryId, url) => {
        const placeholder = titleFromUrl(url)
        const link = await get().addLink({ categoryId, title: placeholder, url })
        if (!fetchTitle) return link
        set((s) => ({ fetchingTitleIds: [...s.fetchingTitleIds, link.id] }))
        void get()
          .lookupTitle(url)
          .then(async (title) => {
            const current = get().links.find((l) => l.id === link.id)
            if (title && current && current.title === placeholder && current.url === url) {
              await get().updateLink(link.id, { title })
            }
          })
          .catch(() => {})
          .finally(() => {
            set((s) => ({ fetchingTitleIds: s.fetchingTitleIds.filter((id) => id !== link.id) }))
          })
        return link
      },

      lookupTitle: async (url) => {
        if (!fetchTitle) return null
        try {
          const title = (await fetchTitle(url))?.trim()
          return title ? title.slice(0, 200) : null
        } catch {
          return null
        }
      },

      updateLink: async (id, data) => {
        const existing = get().links.find((l) => l.id === id)
        if (!existing) return
        const { repeat, ...rest } = data
        const updated: Link = { ...existing, ...rest, updatedAt: now() }
        if (repeat === 'daily') updated.repeat = 'daily'
        else if (repeat === null) delete updated.repeat
        await storage.putLink(updated)
        set((s) => ({ links: s.links.map((l) => (l.id === id ? updated : l)) }))
      },

      renameLinks: async (titles) => {
        const t = now()
        const changed = get()
          .links.filter((l) => titles.has(l.id) && titles.get(l.id) !== l.title)
          .map((l) => ({ ...l, title: titles.get(l.id)!, updatedAt: t }))
        if (changed.length === 0) return
        const byId = new Map(changed.map((l) => [l.id, l]))
        set((s) => ({ links: s.links.map((l) => byId.get(l.id) ?? l) }))
        await putMany(storage, { links: changed })
      },

      deleteLink: async (id) => {
        await storage.deleteLinks([id])
        set((s) => ({ links: s.links.filter((l) => l.id !== id) }))
      },

      recordAccess: async (id) => {
        const existing = get().links.find((l) => l.id === id)
        if (!existing) return
        const updated: Link = { ...existing, lastAccessedAt: now() }
        await storage.putLink(updated)
        set((s) => ({ links: s.links.map((l) => (l.id === id ? updated : l)) }))
      },

      toggleCheck: async (id) => {
        const existing = get().links.find((l) => l.id === id)
        if (!existing || existing.kind !== 'check') return
        const t = now()
        const { checkedAt: _old, ...rest } = existing
        const updated: Link = isChecked(existing) ? { ...rest, updatedAt: t } : { ...rest, checkedAt: t, updatedAt: t }
        await storage.putLink(updated)
        set((s) => ({ links: s.links.map((l) => (l.id === id ? updated : l)) }))
      },

      clearDoneChecks: async (categoryId) => {
        const ids = get()
          .links.filter((l) => l.categoryId === categoryId && l.kind === 'check' && l.repeat !== 'daily' && isChecked(l))
          .map((l) => l.id)
        await get().deleteLinks(ids)
      },

      // ─── 並べ替え ─────────────────────────────────────────

      reorderCategories: async (orderedIds) => {
        const t = now()
        const updated = orderedIds
          .map((id) => get().categories.find((c) => c.id === id))
          .filter((c): c is Category => !!c)
          .map((c, index) => ({ ...c, order: index, updatedAt: t }))
        const byId = new Map(updated.map((c) => [c.id, c]))
        set((s) => ({ categories: s.categories.map((c) => byId.get(c.id) ?? c) }))
        await putMany(storage, { categories: updated })
      },

      arrangeCategories: async (places) => {
        const t = now()
        const updated: Category[] = []
        for (const p of places) {
          const cur = get().categories.find((c) => c.id === p.id)
          if (!cur || (cur.order === p.order && cur.column === p.column)) continue
          const { column: _old, ...rest } = cur
          updated.push({ ...rest, ...(p.column !== undefined ? { column: p.column } : {}), order: p.order, updatedAt: t })
        }
        if (updated.length === 0) return
        const byId = new Map(updated.map((c) => [c.id, c]))
        set((s) => ({ categories: s.categories.map((c) => byId.get(c.id) ?? c) }))
        await putMany(storage, { categories: updated })
      },

      reorderLinks: async (orderedIds) => {
        const t = now()
        const updated = orderedIds
          .map((id) => get().links.find((l) => l.id === id))
          .filter((l): l is Link => !!l)
          .map((l, index) => ({ ...l, order: index, updatedAt: t }))
        const byId = new Map(updated.map((l) => [l.id, l]))
        set((s) => ({ links: s.links.map((l) => byId.get(l.id) ?? l) }))
        await putMany(storage, { links: updated })
      },

      moveLink: async (id, toCategoryId, toIndex) => {
        const link = get().links.find((l) => l.id === id)
        if (!link) return
        const target = linksInCategory(get().links, toCategoryId).filter((l) => l.id !== id)
        const index = toIndex === undefined ? target.length : Math.max(0, Math.min(toIndex, target.length))
        target.splice(index, 0, { ...link, categoryId: toCategoryId })
        const lists = [target]
        if (link.categoryId !== toCategoryId) {
          lists.push(linksInCategory(get().links, link.categoryId).filter((l) => l.id !== id))
        }
        await saveRenumbered(lists)
      },

      moveLinks: async (ids, toCategoryId) => {
        const all = get().links
        const moving = ids
          .map((id) => all.find((l) => l.id === id))
          .filter((l): l is Link => !!l)
          .sort((a, b) => (a.categoryId === b.categoryId ? a.order - b.order : 0))
        if (moving.length === 0) return
        const movingIds = new Set(moving.map((l) => l.id))
        const target = [
          ...linksInCategory(all, toCategoryId).filter((l) => !movingIds.has(l.id)),
          ...moving.map((l) => ({ ...l, categoryId: toCategoryId })),
        ]
        const sources = [...new Set(moving.map((l) => l.categoryId))]
          .filter((cid) => cid !== toCategoryId)
          .map((cid) => linksInCategory(all, cid).filter((l) => !movingIds.has(l.id)))
        await saveRenumbered([target, ...sources])
      },

      deleteLinks: async (ids) => {
        if (ids.length === 0) return
        const idSet = new Set(ids)
        await storage.deleteLinks(ids)
        set((s) => ({ links: s.links.filter((l) => !idSet.has(l.id)) }))
      },

      sortLinks: async (categoryId, mode) => {
        const list = linksInCategory(get().links, categoryId)
        const time = (v?: string) => (v ? new Date(v).getTime() : 0)
        const sorted = [...list].sort((a, b) => {
          if (mode === 'title') return a.title.localeCompare(b.title, 'ja')
          if (mode === 'newest') return time(b.createdAt) - time(a.createdAt)
          return time(b.lastAccessedAt) - time(a.lastAccessedAt)
        })
        await saveRenumbered([sorted])
      },
    }
  })
}

// ============================================================
// 計算の助け
// ============================================================

/** カテゴリ内のリンクを order の順で返す */
function linksInCategory(links: Link[], categoryId: string): Link[] {
  return links.filter((l) => l.categoryId === categoryId).sort((a, b) => a.order - b.order)
}

/** カテゴリ ID ごとに order の順で並べたリンク */
export function groupLinksByCategory(links: Link[]): Map<string, Link[]> {
  const map = new Map<string, Link[]>()
  for (const link of links) {
    const arr = map.get(link.categoryId) ?? []
    arr.push(link)
    map.set(link.categoryId, arr)
  }
  for (const arr of map.values()) arr.sort((a, b) => a.order - b.order)
  return map
}
