import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import devApi from './dev-api.js'

// `npm run dev`   → http://localhost:5173 on your computer
// `npm run phone` → https://<your-computer-ip>:5173 on your phone (same Wi-Fi).
//                   HTTPS is needed for the microphone; accept the certificate warning.
export default defineConfig(({ mode }) => ({
  plugins: [react(), devApi(), mode === 'phone' && basicSsl()].filter(Boolean),
}))
