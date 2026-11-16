// @vitest-environment node
/**
 * /api/title（リンクの名前の自動取得）の検査とタイトル抽出の確認。
 * ネットワークには出ない（取り出し・検査の関数だけを確かめる）。
 */
import { describe, expect, it } from 'vitest'
import {
  GET,
  checkTargetUrl,
  decodeEntities,
  detectCharset,
  extractTitle,
  isBlockedAddress,
  youtubeOembedUrl,
} from '../title'

describe('読みに行ってよい URL', () => {
  it('ふつうの https / http は通す', () => {
    expect(checkTargetUrl('https://example.com/a?b=1')).not.toBeNull()
    expect(checkTargetUrl('http://example.com')).not.toBeNull()
  })
  it('内部ネットワークや特殊な URL は断る', () => {
    for (const url of [
      'http://127.0.0.1/', 'http://10.1.2.3/', 'http://192.168.0.1/', 'http://169.254.169.254/latest/meta-data',
      'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://[fd00::1]/', 'http://localhost/', 'http://foo.internal/',
      'https://example.com:8080/', 'https://user:pass@example.com/', 'ftp://example.com/', 'javascript:alert(1)', 'file:///etc/passwd',
    ]) {
      expect(checkTargetUrl(url), url).toBeNull()
    }
  })
  it('名前解決の結果の IP も判定できる', () => {
    expect(isBlockedAddress('93.184.216.34')).toBe(false)
    expect(isBlockedAddress('2606:2800:220:1::')).toBe(false)
    expect(isBlockedAddress('172.20.0.1')).toBe(true)
    expect(isBlockedAddress('100.64.0.1')).toBe(true)
    expect(isBlockedAddress('::ffff:10.0.0.1')).toBe(true)
    expect(isBlockedAddress('fe80::1')).toBe(true)
    // IPv4 互換アドレス・6to4（中に内部の IPv4 を入れられる）も通さない
    expect(isBlockedAddress('::7f00:1')).toBe(true)
    expect(isBlockedAddress('2002:7f00:1::')).toBe(true)
  })
})

describe('タイトルの取り出し', () => {
  it('<title> を使い、空白をまとめて文字参照を戻す', () => {
    expect(extractTitle('<html><head><title>\n  料理 &amp; 旅行 &#x2014; トップ\n</title></head>')).toBe('料理 & 旅行 — トップ')
  })
  it('<title> が無ければ og:title', () => {
    expect(extractTitle(`<meta content='動画ページ' property="og:title">`)).toBe('動画ページ')
  })
  it('どちらも無ければ null', () => {
    expect(extractTitle('<html><body>no title</body></html>')).toBeNull()
    expect(extractTitle('<title>   </title>')).toBeNull()
  })
  it('長すぎるタイトルは切る', () => {
    expect(extractTitle(`<title>${'あ'.repeat(500)}</title>`)!.length).toBe(200)
  })
  it('知らない文字参照はそのまま', () => {
    expect(decodeEntities('a &unknown; b &#0; c')).toBe('a &unknown; b &#0; c')
  })
})

describe('文字コード', () => {
  const bytes = (s: string) => new TextEncoder().encode(s)
  it('Content-Type の charset を優先', () => {
    expect(detectCharset('text/html; charset=Shift_JIS', bytes('<meta charset="utf-8">'))).toBe('Shift_JIS')
  })
  it('無ければ <meta charset>、それも無ければ UTF-8', () => {
    expect(detectCharset('text/html', bytes('<meta http-equiv="Content-Type" content="text/html; charset=EUC-JP">'))).toBe('EUC-JP')
    expect(detectCharset(null, bytes('<html>'))).toBe('utf-8')
  })
  it('Shift_JIS のページも読める', () => {
    const sjis = new Uint8Array([0x3c, 0x74, 0x69, 0x74, 0x6c, 0x65, 0x3e, 0x93, 0xfa, 0x96, 0x7b, 0x3c, 0x2f, 0x74, 0x69, 0x74, 0x6c, 0x65, 0x3e])
    expect(extractTitle(new TextDecoder(detectCharset('text/html; charset=shift_jis', sjis)).decode(sjis))).toBe('日本')
  })
})

describe('入口（GET）', () => {
  it('他のサイトからの呼び出しは断る', async () => {
    const res = await GET(new Request('https://app.example/api/title?url=https://example.com', { headers: { 'sec-fetch-site': 'cross-site' } }))
    expect(res.status).toBe(403)
  })
  it('キャッシュは呼び出し元ごとに分ける', async () => {
    const res = await GET(new Request('https://app.example/api/title?url=https://example.com', { headers: { 'sec-fetch-site': 'cross-site' } }))
    expect(res.headers.get('vary')).toBe('Sec-Fetch-Site')
  })
  it('内部ネットワークの URL は読みに行かずに断る', async () => {
    const res = await GET(new Request('https://app.example/api/title?url=' + encodeURIComponent('http://169.254.169.254/'), { headers: { 'sec-fetch-site': 'same-origin' } }))
    expect(res.status).toBe(400)
  })
})

describe('YouTube', () => {
  it('YouTube のリンクは oEmbed の窓口を使う', () => {
    expect(youtubeOembedUrl('https://www.youtube.com/watch?v=abc')).toBe(
      'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=abc'),
    )
    expect(youtubeOembedUrl('https://youtu.be/abc')).not.toBeNull()
    expect(youtubeOembedUrl('https://m.youtube.com/watch?v=abc')).not.toBeNull()
    expect(youtubeOembedUrl('https://example.com/youtube.com')).toBeNull()
  })
})
