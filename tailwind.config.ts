import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'

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
        accent: colors.teal,
      },
    },
  },
  plugins: [],
} satisfies Config
