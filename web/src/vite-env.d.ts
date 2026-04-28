/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

import type { calculateBulk, loadConfig } from './api/client'
import type { CartLine } from './api/types'

interface ImportMetaEnv {
  readonly VITE_CONFIG_LOAD_URL: string
  readonly VITE_BULK_CALC_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    __test?: {
      loadConfig?: typeof loadConfig
      calculateBulk?: typeof calculateBulk
      addLine?: (line: Omit<CartLine, 'id'>) => void
    }
  }
}

export {}
