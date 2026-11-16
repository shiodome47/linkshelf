/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 部品（ライブラリ）としてビルドする設定。
// react / react-dom は組み込む側のものを使うので、出力には含めない。
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'linkshelf',
      // 見た目は dist/style.css に出す（組み込む側は linkshelf/style.css を読み込む）
      cssFileName: 'style',
    },
    rollupOptions: {
      // 部品に含めるもの（dexie / zustand など）も、組み込む側の npm install で入るので、出力には含めない
      external: [
        /^react(\/.*)?$/,
        /^react-dom(\/.*)?$/,
        /^zustand(\/.*)?$/,
        /^dexie(\/.*)?$/,
        /^@dnd-kit\/.*/,
        /^lucide-react(\/.*)?$/,
      ],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // 部品のテストと、見本のページの「名前を取る処理」のテスト
    include: ['src/**/*.test.{ts,tsx}', 'examples/web/api/**/*.test.ts'],
  },
})
