import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../i18n'
import { readTextFile, TEXT_LIMIT_BYTES, textLimitError } from '../textFile'

describe('画面の言葉', () => {
  it('日本語と英語で、同じ項目がそろっている', () => {
    expect(Object.keys(MESSAGES.en).sort()).toEqual(Object.keys(MESSAGES.ja).sort())
    expect(Object.keys(MESSAGES.en.colors).sort()).toEqual(Object.keys(MESSAGES.ja.colors).sort())
  })

  it('テキストの大きさのエラーも、選んだ言葉で出る', async () => {
    const big = 'a'.repeat(TEXT_LIMIT_BYTES + 1)
    expect(textLimitError(big, MESSAGES.en)).toMatch(/too large/)
    expect(textLimitError(big)).toMatch(/大きすぎます/)
    await expect(readTextFile(new File([big], 'big.txt'), MESSAGES.en)).rejects.toThrow(/too large/)
  })
})
