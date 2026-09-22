import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/D2Dv1/', // <-- THIS LINE PREVENTS THE WHITE SCREEN
  plugins: [
    react(),
    tailwindcss(),
  ],
})
