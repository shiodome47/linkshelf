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
    },
    rollupOptions: {
      // 部品に含めるもの（dexie / zustand など）も、組み込む側の npm install で入るので、出力には含めない
      external: [/^react(\/.*)?$/, /^react-dom(\/.*)?$/, /^zustand(\/.*)?$/, /^dexie(\/.*)?$/],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
