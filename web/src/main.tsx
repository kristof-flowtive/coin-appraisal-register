import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { calculateBulk, loadConfig } from './api/client'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

declare global {
  interface Window {
    __test?: {
      loadConfig: typeof loadConfig
      calculateBulk: typeof calculateBulk
    }
  }
}

if (import.meta.env.DEV) {
  window.__test = { loadConfig, calculateBulk }
}
