import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 구글 로그인 리디렉션 주소를 Supabase에 등록해두므로 포트가 바뀌면 로그인이 깨진다.
    // 다른 포트로 몰래 옮겨가지 않도록 고정한다.
    port: 5173,
    strictPort: true,
  },
})
