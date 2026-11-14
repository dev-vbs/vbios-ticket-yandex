/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOW_SWAGGER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}