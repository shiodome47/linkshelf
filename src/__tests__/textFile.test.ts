import { describe, expect, it } from 'vitest'
import { formatBytes, readTextFile, TEXT_LIMIT_BYTES, textLimitError } from '../textFile'

describe('カードに置くテキスト（txt）', () => {
  it('UTF-8 のテキストファイルを読み、名前は拡張子を除いたファイル名', async () => {
    const r = await readTextFile(new File(['﻿おはよう\r\nこんにちは'], '挨拶メモ.txt', { type: 'text/plain' }))
    expect(r).toEqual({ title: '挨拶メモ', text: 'おはよう\nこんにちは' })
  })

  it('UTF-8 で読めないときは Shift_JIS（Windows のメモ帳の古い形式）として読む', async () => {
    // 「日本」の Shift_JIS
    const sjis = new Uint8Array([0x93, 0xfa, 0x96, 0x7b])
    const r = await readTextFile(new File([sjis], 'a.txt'))
    expect(r.text).toBe('日本')
  })

  it('名前が拡張子だけのときは「テキスト」', async () => {
    const r = await readTextFile(new File(['x'], '.txt'))
    expect(r.title).toBe('テキスト')
  })

  it('上限（100KB）を超えるファイル・本文は置けない', async () => {
    const big = 'あ'.repeat(TEXT_LIMIT_BYTES)
    await expect(readTextFile(new File([big], 'big.txt'))).rejects.toThrow(/大きすぎます/)
    expect(textLimitError(big)).toMatch(/大きすぎます/)
    expect(textLimitError('短いメモ')).toBeNull()
  })

  it('大きさを B / KB で表す', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
  })
})
