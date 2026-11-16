/**
 * ビルドした dist/style.css が、.linkshelf の中だけに効く書き方になっているかを確かめる。
 * 組み込む側のアプリ全体に効く書き方（*、.container、h1 など）が見つかったら、エラーで止まる。
 */
import { readFileSync } from 'node:fs'
import postcss from 'postcss'

const file = new URL('../dist/style.css', import.meta.url)
const root = postcss.parse(readFileSync(file, 'utf8'))
const problems = []

const scoped = (selector) => {
  const s = selector.trim()
  return s.startsWith('.linkshelf') || s.startsWith(':where(.linkshelf')
}

root.walkRules((rule) => {
  // アニメーションの中身（from / to / 50% など）は対象外
  if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return
  for (const selector of rule.selectors) {
    if (!scoped(selector)) problems.push(`selector: ${selector}`)
  }
})

root.walkAtRules(/keyframes$/, (at) => {
  if (!at.params.startsWith('ls-')) problems.push(`@keyframes ${at.params}（名前は ls- で始める）`)
})

if (problems.length > 0) {
  console.error('dist/style.css に、アプリ全体に効く書き方があります:')
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log('dist/style.css: すべて .linkshelf の中だけに効く書き方です')
