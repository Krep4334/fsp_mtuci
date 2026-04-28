/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_SOCKET_URL?: string
  /** Публичный URL сайта для canonical, Open Graph и sitemap (без завершающего /) */
  readonly VITE_PUBLIC_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

