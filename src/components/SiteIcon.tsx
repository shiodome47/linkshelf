import { FileText } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../utils/cn'
import { faviconUrl, titleFromUrl } from '../linkUtils'

/** 頭文字タイルの色（ドメインごとに固定）。明暗どちらのテーマでも白文字が読める濃さ */
const TILE_COLORS = [
  'bg-teal-600', 'bg-blue-600', 'bg-purple-600', 'bg-pink-600',
  'bg-orange-600', 'bg-red-600', 'bg-green-600', 'bg-indigo-600',
]

function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** 読み込みに失敗したアイコンを覚えておき、同じサイトで何度も取りに行かない */
const failed = new Set<string>()

interface SiteIconProps {
  url: string
  title: string
  className?: string
}

/**
 * リンクのサイトアイコン。取れないときは頭文字のタイルを出す。
 */
export function SiteIcon({ url, title, className }: SiteIconProps) {
  const src = faviconUrl(url)
  const [broken, setBroken] = useState(() => !src || failed.has(src))
  const domain = titleFromUrl(url)
  const letter = (title.trim() || domain).charAt(0).toUpperCase() || '?'

  if (!src || broken) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[3px] text-[10px] font-bold leading-none text-white',
          TILE_COLORS[hash(domain) % TILE_COLORS.length],
          className,
        )}
      >
        {letter}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      referrerPolicy="no-referrer"
      draggable={false}
      className={cn('h-4 w-4 flex-shrink-0 rounded-[3px] object-contain', className)}
      onError={() => {
        failed.add(src)
        setBroken(true)
      }}
    />
  )
}

/** リンク集の 1 行のアイコン（アプリの中に保存したテキストは文書のアイコン） */
export function LinkIcon({ link, className }: { link: { url: string; title: string; kind?: 'text' }; className?: string }) {
  if (link.kind === 'text') {
    return <FileText aria-hidden="true" className={cn('h-4 w-4 flex-shrink-0 text-accent-400', className)} />
  }
  return <SiteIcon url={link.url} title={link.title} className={className} />
}
