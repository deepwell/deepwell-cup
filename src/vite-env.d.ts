/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SEASON_ID?: string;
  readonly VITE_NHL_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
