import { describe, expect, it } from 'vitest'
import { flattenCards, layoutCards, moveCard, type CardLike } from '../layout'

const ids = (cols: CardLike[][]) => cols.map((col) => col.map((c) => c.id))
const card = (id: string, order: number, size = 1, column?: number): CardLike => ({ id, order, size, column })

// 例: 今の画面（4 列）。まだ並べ替えたことが無い
const fresh = [card('料理', 0, 6), card('旅行', 1, 2), card('音楽', 2, 3), card('読書', 3, 1), card('英語', 4, 1), card('仕事', 5, 4)]

describe('リンク集のカードの並べ方', () => {
  it('まだ並べ替えていなければ、いちばん短い列から詰める（今までどおり）', () => {
    expect(ids(layoutCards(fresh, 4))).toEqual([['料理'], ['旅行', '仕事'], ['音楽'], ['読書', '英語']])
  })

  it('「料理」の下へ「旅行」を落とすと、そのとおりに並び、ほかのカードは動かない', () => {
    const places = moveCard(fresh, 4, '旅行', { kind: 'card', id: '料理', position: 'after' })
    const next = fresh.map((c) => ({ ...c, ...places.find((p) => p.id === c.id)! }))
    expect(ids(layoutCards(next, 4))).toEqual([['料理', '旅行'], ['仕事'], ['音楽'], ['読書', '英語']])
  })

  it('列のいちばん下（空いているところ）にも落とせる', () => {
    const places = moveCard(fresh, 4, '料理', { kind: 'end', column: 2 })
    const next = fresh.map((c) => ({ ...c, ...places.find((p) => p.id === c.id)! }))
    expect(ids(layoutCards(next, 4))).toEqual([[], ['旅行', '仕事'], ['音楽', '料理'], ['読書', '英語']])
  })

  it('並べた列は、列が足りない画面（スマホ）では左上から読む順の 1 列になり、そこで動かしても PC の列は崩さない', () => {
    const arranged = [card('A', 0, 1, 0), card('B', 1, 1, 0), card('C', 0, 1, 1), card('D', 0, 1, 2)]
    expect(flattenCards(arranged).map((c) => c.id)).toEqual(['A', 'C', 'D', 'B'])
    expect(ids(layoutCards(arranged, 1))).toEqual([['A', 'C', 'D', 'B']])
    // スマホで D を A の下へ → D は A と同じ列（0 列目）の A のすぐ下へ。C の列はそのまま
    const places = moveCard(arranged, 1, 'D', { kind: 'card', id: 'A', position: 'after' })
    const next = arranged.map((c) => ({ ...c, ...places.find((p) => p.id === c.id)! }))
    expect(ids(layoutCards(next, 4))).toEqual([['A', 'D', 'B'], ['C'], [], []])
  })

  it('後から作ったカード（列をまだ覚えていない）は、いちばん短い列の下に出る', () => {
    const arranged = [card('A', 0, 5, 0), card('B', 0, 1, 1), card('new', 9, 1)]
    expect(ids(layoutCards(arranged, 2))).toEqual([['A'], ['B', 'new']])
  })
})

describe('壊れた列の番号', () => {
  it('大きすぎる列・負の列は、列を覚えていないものとして扱う（画面を作れる）', () => {
    const cards = [card('A', 0, 1, 1e9), card('B', 1, 1, -3), card('C', 2, 1)]
    expect(ids(layoutCards(cards, 2)).flat().sort()).toEqual(['A', 'B', 'C'])
  })
})
