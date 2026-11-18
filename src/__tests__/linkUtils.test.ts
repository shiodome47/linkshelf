import { describe, expect, it } from 'vitest'
import { faviconUrl, isPlaceholderTitle, mapWithLimit, normalizeLinkInput, titleFromUrl } from '../linkUtils'

describe('normalizeLinkInput', () => {
  it('https の URL はそのまま', () => {
    expect(normalizeLinkInput(' https://example.com/a ')).toBe('https://example.com/a')
  })
  it('スキームが無ければ https:// を補う', () => {
    expect(normalizeLinkInput('example.com/page')).toBe('https://example.com/page')
  })
  it('開けない URL や URL でないものは null', () => {
    expect(normalizeLinkInput('javascript:alert(1)')).toBeNull()
    expect(normalizeLinkInput('hello')).toBeNull()
    expect(normalizeLinkInput('two words.com')).toBeNull()
    expect(normalizeLinkInput('')).toBeNull()
  })
})

describe('titleFromUrl / faviconUrl', () => {
  it('www. を除いたホスト名を仮のタイトルにする', () => {
    expect(titleFromUrl('https://www.example.com/a?b=c')).toBe('example.com')
  })
  it('アイコンは https のサイトだけ、そのサイト自身から取る', () => {
    expect(faviconUrl('https://example.com/a/b')).toBe('https://example.com/favicon.ico')
    expect(faviconUrl('http://example.com/')).toBeNull()
  })
})

describe('isPlaceholderTitle', () => {
  it('サイト名や URL のままなら仮の名前', () => {
    expect(isPlaceholderTitle('example.com', 'https://www.example.com/a')).toBe(true)
    expect(isPlaceholderTitle('www.example.com', 'https://www.example.com/')).toBe(true)
    expect(isPlaceholderTitle('https://example.com/a', 'https://example.com/a/')).toBe(true)
    expect(isPlaceholderTitle('example.com/a', 'https://example.com/a')).toBe(true)
    expect(isPlaceholderTitle('  ', 'https://example.com/')).toBe(true)
  })
  it('自分で付けた名前は仮の名前ではない', () => {
    expect(isPlaceholderTitle('わたしのお気に入り', 'https://example.org/')).toBe(false)
  })
})

describe('mapWithLimit', () => {
  it('同時に動くのは上限まで、結果はすべて届く', async () => {
    let running = 0
    let peak = 0
    const seen: number[] = []
    await mapWithLimit(
      [1, 2, 3, 4, 5, 6, 7],
      3,
      async (n) => {
        running++
        peak = Math.max(peak, running)
        await new Promise((r) => setTimeout(r, 5))
        running--
        return n * 2
      },
      (_n, r) => seen.push(r),
    )
    expect(peak).toBe(3)
    expect(seen.sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10, 12, 14])
  })
  it('中止すると新しい処理を始めない', async () => {
    const controller = new AbortController()
    const done: number[] = []
    await mapWithLimit([1, 2, 3, 4], 1, async (n) => {
      if (n === 2) controller.abort()
      return n
    }, (n) => done.push(n), controller.signal)
    expect(done).toEqual([1])
  })
})

describe('normalizeLinkInput: 日本語の文は URL にしない', () => {
  it('句点「。」や全角の文字を含む 1 行は、テキストのまま', () => {
    for (const t of ['今日は晴れ。明日も晴れ', 'メモ。あとで見る', '豚しゃぶ。', 'ＡＢＣ．ｃｏｍ', '麻婆豆腐', 'v1.2.3', '3.14']) {
      expect(normalizeLinkInput(t), t).toBeNull()
    }
  })

  it('半角のドメインや、https:// から書いた URL は、今までどおり URL', () => {
    expect(normalizeLinkInput('example.com')).toBe('https://example.com')
    expect(normalizeLinkInput('docs.google.com/x?y=1')).toBe('https://docs.google.com/x?y=1')
    expect(normalizeLinkInput('www.nhk.or.jp')).toBe('https://www.nhk.or.jp')
    expect(normalizeLinkInput('localhost/page')).toBe('https://localhost/page')
    expect(normalizeLinkInput('https://日本語.jp/')).toBe('https://日本語.jp/')
  })
})
