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
  // - .container（important が効かず、アプリ全体に効いてしまう）は使わない
  // - 変数の初期値も .linkshelf の中だけにする（postcss.config.js）
  // ビルドしたあと、scripts/check-css-scope.mjs で、アプリ全体に効く書き方が無いか確かめる
  important: '.linkshelf',
  corePlugins: { preflight: false, container: false },
  theme: {
    extend: {
      // アニメーションの名前は ls- で始める（組み込む側の @keyframes spin などとぶつからないように）
      keyframes: {
        'ls-spin': { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'ls-spin': 'ls-spin 1s linear infinite',
      },
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
