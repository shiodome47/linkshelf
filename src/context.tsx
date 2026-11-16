import { createContext, useContext, useState, type ReactNode } from 'react'
import { useStore } from 'zustand'
import { createLinkShelfStore, type LinkShelfState, type LinkShelfStore, type LinkShelfStoreOptions } from './store'
import type { LinkShelfStorage } from './storage/types'

/**
 * <LinkShelf> ごとのストアを、中の部品へ渡すための入れ物（React の Context）。
 * ストアをグローバルにしないので、1 つのページに <LinkShelf> を 2 つ置いても混ざらない。
 */
const StoreContext = createContext<LinkShelfStore | null>(null)

export interface LinkShelfProviderProps extends LinkShelfStoreOptions {
  storage: LinkShelfStorage
  children: ReactNode
}

/** ストアを 1 つ作って、中の部品へ渡す。storage と fetchTitle は、はじめに渡したものを使い続ける */
export function LinkShelfProvider({ storage, fetchTitle, children }: LinkShelfProviderProps) {
  const [store] = useState(() => createLinkShelfStore(storage, { fetchTitle }))
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

/** できあがったストアを、そのまま中の部品へ渡す（テストなどで使う） */
export function LinkShelfStoreProvider({ store, children }: { store: LinkShelfStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

/** いまの <LinkShelf> のストアそのもの */
export function useLinkShelfStoreApi(): LinkShelfStore {
  const store = useContext(StoreContext)
  if (!store) throw new Error('[linkshelf] useLinkShelf must be used inside <LinkShelf>（<LinkShelf> の中で使ってください）')
  return store
}

/** いまの <LinkShelf> のストアから、必要なところだけを読む（selector を省くと全部） */
export function useLinkShelf(): LinkShelfState
export function useLinkShelf<T>(selector: (state: LinkShelfState) => T): T
export function useLinkShelf<T>(selector?: (state: LinkShelfState) => T): T | LinkShelfState {
  const pick: (state: LinkShelfState) => T | LinkShelfState = selector ?? ((s) => s)
  return useStore(useLinkShelfStoreApi(), pick)
}
