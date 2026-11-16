import { describe, expect, it } from 'vitest'
import { isSafeUrl, safeExternalUrl } from '../utils/url'

describe('危ない URL をはじく', () => {
  it('http と https だけを安全とみなす', () => {
    expect(isSafeUrl('https://example.com/')).toBe(true)
    expect(isSafeUrl('http://example.com/')).toBe(true)
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeUrl('JavaScript:alert(1)')).toBe(false)
    expect(isSafeUrl('data:text/html,<p>x</p>')).toBe(false)
    expect(isSafeUrl('not a url')).toBe(false)
  })

  it('開く直前の検査では、安全な URL だけを返す', () => {
    expect(safeExternalUrl('https://example.com/a')).toBe('https://example.com/a')
    expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeExternalUrl(undefined)).toBeUndefined()
    expect(safeExternalUrl(null)).toBeUndefined()
  })
})
