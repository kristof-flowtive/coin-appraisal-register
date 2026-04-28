/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_CONFIG_LOAD_URL: string
  readonly VITE_BULK_CALC_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
