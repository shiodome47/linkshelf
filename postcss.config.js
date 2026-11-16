import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

/**
 * Tailwind が「すべての要素」（*, ::before, ::after, ::backdrop）に書く変数の初期値を、
 * .linkshelf の中だけに効くように書き換える。組み込む側のアプリ全体に効かないようにするため。
 */
const GLOBAL_SELECTORS = new Set(['*', '::before', '::after', ':before', ':after', '::backdrop'])

function scopeToLinkshelf() {
  return {
    postcssPlugin: 'linkshelf-scope-base',
    Rule(rule) {
      if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return
      if (rule.selectors.length > 0 && rule.selectors.every((s) => GLOBAL_SELECTORS.has(s.trim()))) {
        rule.selectors = [
          ':where(.linkshelf)',
          ':where(.linkshelf) *',
          ':where(.linkshelf) ::before',
          ':where(.linkshelf) ::after',
        ]
      }
    },
  }
}
scopeToLinkshelf.postcss = true

export default {
  plugins: [tailwindcss(), scopeToLinkshelf(), autoprefixer()],
}
