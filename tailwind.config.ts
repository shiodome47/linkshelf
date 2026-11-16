import type { Config } from 'tailwindcss'

/**
 * 色は CSS の変数（src/style.css の --ls-…）から取る。
 * クラスの名前は Tailwind のまま（bg-neutral-900 など）で、中身の色だけをテーマで差し替える。
 * 「/60」のような透明度も使えるように、color-mix で混ぜる。
 */
const v = (name: string) => `color-mix(in srgb, var(${name}) calc(<alpha-value> * 100%), transparent)`

const neutral = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [n, v(`--ls-n-${n}`)]),
)

export default {
  content: ['./src/**/*.{ts,tsx}'],
  // 組み込む側のページを崩さないように:
  // - ブラウザの見た目の初期化（preflight）は使わない（src/style.css で .linkshelf の中だけ整える）
  // - すべてのクラスを .linkshelf の中だけで効くようにする
  important: '.linkshelf',
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        neutral,
        accent: {
          400: v('--ls-accent-text'),
          500: v('--ls-accent-hover'),
          600: v('--ls-accent'),
        },
        red: {
          300: v('--ls-danger'),
          400: v('--ls-danger'),
          500: v('--ls-danger'),
          950: v('--ls-danger-bg'),
        },
      },
    },
  },
  plugins: [],
} satisfies Config
