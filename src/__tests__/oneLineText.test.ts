import { describe, expect, it } from 'vitest'
import { isOneLineText, oneLineTitle } from '../linkUtils'

describe('1 行テキスト', () => {
  it('長い 1 行は 60 字で切って名前にする', () => {
    expect(oneLineTitle('  買い物リスト  ')).toBe('買い物リスト')
    expect(oneLineTitle('あ'.repeat(61))).toBe(`${'あ'.repeat(60)}…`)
  })

  it('本文が 1 行で、名前が本文そのものなら 1 行テキスト', () => {
    expect(isOneLineText({ kind: 'text', title: '牛乳を買う', text: '牛乳を買う' })).toBe(true)
    const long = 'い'.repeat(70)
    expect(isOneLineText({ kind: 'text', title: oneLineTitle(long), text: long })).toBe(true)
  })

  it('複数行・名前を変えたもの・リンクは 1 行テキストではない', () => {
    expect(isOneLineText({ kind: 'text', title: 'メモ', text: '1 行目\n2 行目' })).toBe(false)
    expect(isOneLineText({ kind: 'text', title: '別の名前', text: '牛乳を買う' })).toBe(false)
    expect(isOneLineText({ title: 'example.com' })).toBe(false)
    expect(isOneLineText({ kind: 'text', title: '', text: '  ' })).toBe(false)
  })
})
