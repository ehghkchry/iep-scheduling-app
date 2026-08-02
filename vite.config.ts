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
  build: {
    rollupOptions: {
      output: {
        /*
         * 라이브러리를 우리 코드와 갈라 둔다.
         *
         * 한 덩어리로 두면 화면 문구 하나만 고쳐도 파일 이름이 바뀌어, 다시 들어온
         * 사람이 리액트와 supabase까지 500 kB를 통째로 다시 받는다. 갈라 두면 우리가
         * 고친 부분만 새로 받고 나머지는 브라우저에 있던 걸 쓴다.
         */
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router)/ },
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
          ],
        },
      },
    },
  },
})
