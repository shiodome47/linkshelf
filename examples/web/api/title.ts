/**
 * GET /api/title?url=https://example.com
 * → { "title": "ページのタイトル" }（取れなければ { "title": null }）
 *
 * linkshelf の見本のページで、リンクを追加したときに名前を自動で付けるために使う（Vercel の関数）。
 * <LinkShelf fetchTitle={…} /> の窓口から呼ぶ（examples/web/src/fetchTitle.ts）。
 * ブラウザからは CORS のため他のサイトのページを直接読めないので、ここで代わりに読む。
 * 外部の取得サービスは使わない（登録した URL を第三者に渡さないため）。
 *
 * サーバーが任意の URL を読みに行くので、内部ネットワークを覗かれないようにしている:
 * - http / https の 80 / 443 番だけ。リダイレクトは 1 回ずつ同じ検査をして最大 5 回まで
 * - 接続先の IP は「名前解決した結果」で検査する（DNS で内部の IP を返す手口を防ぐ）
 * - 読む量（256KB）と時間（5 秒）に上限。HTML 以外は読まない
 * - 返すのはタイトルの文字列だけ。他のサイトから呼ばれないよう同一オリジン以外は断る
 */
import { lookup as dnsLookup, type LookupAddress } from 'node:dns'
import { BlockList, isIP } from 'node:net'
import { Agent, fetch } from 'undici'

const MAX_BYTES = 256 * 1024
const TIMEOUT_MS = 5000
const MAX_REDIRECTS = 5
const MAX_TITLE_LENGTH = 200

// ─── 接続してはいけないアドレス ─────────────────────────────────

const blocked = new BlockList()
for (const [net, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(net, prefix, 'ipv4')
for (const [net, prefix] of [
  ['::', 96], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['64:ff9b::', 96], ['64:ff9b:1::', 48],
  ['100::', 64], ['2001:db8::', 32], ['2002::', 16], ['ff00::', 8],
] as const) blocked.addSubnet(net, prefix, 'ipv6')

/** 内部ネットワークなど、読みに行ってはいけない IP なら true */
export function isBlockedAddress(address: string): boolean {
  const version = isIP(address)
  if (version === 4) return blocked.check(address, 'ipv4')
  if (version === 6) {
    // ::ffff:10.0.0.1 のような IPv4 射影アドレスは中の IPv4 で判断する
    const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return blocked.check(mapped[1], 'ipv4')
    if (/^::ffff:/i.test(address)) return true
    return blocked.check(address, 'ipv6')
  }
  return true
}

/** 読みに行ってよい URL か（スキーム・ポート・IP を直接書いたホスト） */
export function checkTargetUrl(raw: string): URL | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.port && url.port !== '80' && url.port !== '443') return null
  if (url.username || url.password) return null
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (isIP(host) && isBlockedAddress(host)) return null
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return null
  return url
}

/** 名前解決の結果を検査してから接続する（undici の connect に渡す） */
function safeLookup(
  hostname: string,
  options: { all?: boolean; family?: number },
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
) {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '')
    const list = addresses as LookupAddress[]
    if (list.length === 0 || list.some((a) => isBlockedAddress(a.address))) {
      const e: NodeJS.ErrnoException = new Error('blocked address')
      e.code = 'EBLOCKED'
      return callback(e, '')
    }
    if (options.all) return callback(null, list)
    callback(null, list[0].address, list[0].family)
  })
}

const agent = new Agent({
  connect: { lookup: safeLookup as never, timeout: TIMEOUT_MS },
  headersTimeout: TIMEOUT_MS,
  bodyTimeout: TIMEOUT_MS,
})

// ─── HTML からタイトルを取り出す ────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', middot: '·', copy: '©', reg: '®',
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole
  })
}

function clean(text: string): string | null {
  const t = decodeEntities(text).replace(/\s+/g, ' ').trim()
  if (!t) return null
  return t.length > MAX_TITLE_LENGTH ? `${t.slice(0, MAX_TITLE_LENGTH - 1)}…` : t
}

/** <title> を優先し、無ければ og:title を使う */
export function extractTitle(html: string): string | null {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title\s*>/i)
  if (title) {
    const t = clean(title[1])
    if (t) return t
  }
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (/(?:property|name)\s*=\s*["']?(?:og:title|twitter:title)["'\s>]/i.test(tag)) {
      const content = tag.match(/content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i)
      const t = content && clean(content[1] ?? content[2] ?? '')
      if (t) return t
    }
  }
  return null
}

/** 文字コード: Content-Type → <meta charset> の順に見て、分からなければ UTF-8 */
export function detectCharset(contentType: string | null, head: Uint8Array): string {
  const fromHeader = contentType?.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1]
  const ascii = new TextDecoder('latin1').decode(head.subarray(0, 4096))
  const fromMeta =
    ascii.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i)?.[1]
  for (const label of [fromHeader, fromMeta]) {
    if (!label) continue
    try {
      new TextDecoder(label)
      return label
    } catch {
      /* 知らない文字コード名は無視 */
    }
  }
  return 'utf-8'
}

// ─── 取得 ────────────────────────────────────────────────────

async function readHead(body: AsyncIterable<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of body) {
    chunks.push(chunk)
    size += chunk.byteLength
    // </head> か </title> まで読めたら十分
    const tail = new TextDecoder('latin1').decode(chunk).toLowerCase()
    if (size >= MAX_BYTES || tail.includes('</head') || tail.includes('</title')) break
  }
  const out = new Uint8Array(Math.min(size, MAX_BYTES))
  let offset = 0
  for (const c of chunks) {
    const part = c.subarray(0, out.length - offset)
    out.set(part, offset)
    offset += part.length
    if (offset >= out.length) break
  }
  return out
}

/**
 * YouTube はサーバーからの読み込みに確認画面を返すことが多いので、
 * 公式の oEmbed（動画の情報を返す窓口）からタイトルを取る。
 */
export function youtubeOembedUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '')
  if (host !== 'youtube.com' && host !== 'youtu.be') return null
  return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.toString())}`
}

async function fetchYouTubeTitle(oembed: string): Promise<string | null> {
  const res = await fetch(oembed, {
    dispatcher: agent,
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'application/json' },
  })
  if (!res.ok) {
    await res.body?.cancel()
    return null
  }
  const data = (await res.json()) as { title?: unknown }
  return typeof data.title === 'string' ? clean(data.title) : null
}

export async function fetchPageTitle(raw: string): Promise<string | null> {
  const oembed = youtubeOembedUrl(raw)
  if (oembed) {
    const title = await fetchYouTubeTitle(oembed).catch(() => null)
    if (title) return title
  }
  let url = checkTargetUrl(raw)
  const signal = AbortSignal.timeout(TIMEOUT_MS)
  for (let i = 0; url && i <= MAX_REDIRECTS; i++) {
    const res = await fetch(url, {
      dispatcher: agent,
      redirect: 'manual',
      signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; LinkTitleFetcher/1.0)',
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
        'accept-language': 'ja,en;q=0.8',
      },
    })
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      await res.body?.cancel()
      url = location ? checkTargetUrl(new URL(location, url).toString()) : null
      continue
    }
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !res.body || !/text\/html|application\/xhtml\+xml/i.test(type)) {
      await res.body?.cancel()
      return null
    }
    const head = await readHead(res.body as AsyncIterable<Uint8Array>)
    const charset = detectCharset(type, head)
    return extractTitle(new TextDecoder(charset).decode(head))
  }
  return null
}

// ─── 入口 ────────────────────────────────────────────────────

function json(body: unknown, status: number, cacheSeconds: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheSeconds > 0 ? `public, max-age=0, s-maxage=${cacheSeconds}` : 'no-store',
      // CDN のキャッシュを呼び出し元ごとに分ける（他のサイトからの呼び出しにキャッシュを返さないため）
      vary: 'Sec-Fetch-Site',
    },
  })
}

export async function GET(request: Request): Promise<Response> {
  // このアプリの画面以外（他のサイトのスクリプト）からは使わせない
  const site = request.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin') return json({ error: 'forbidden' }, 403, 0)

  const target = new URL(request.url).searchParams.get('url') ?? ''
  if (!target || target.length > 2048 || !checkTargetUrl(target)) {
    return json({ error: 'invalid url' }, 400, 0)
  }
  try {
    const title = await fetchPageTitle(target)
    return json({ title }, 200, title ? 86400 : 600)
  } catch {
    return json({ title: null }, 200, 60)
  }
}
