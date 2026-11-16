import { VERSION } from '../index'

describe('linkshelf', () => {
  it('バージョンを持っている', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
