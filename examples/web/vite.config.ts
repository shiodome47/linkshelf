import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // linkshelf は ../.. を指しているので、react が 2 つ読み込まれないようにまとめる
  resolve: { dedupe: ['react', 'react-dom'] },
})
