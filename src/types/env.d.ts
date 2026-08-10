// Ambient declarations for the browser shell.
//
// Vite+ ships its client types under @voidzero-dev/vite-plus-core rather than a
// bare "vite" package, so the usual `/// <reference types="vite/client" />` does
// not resolve here.
/// <reference types="@voidzero-dev/vite-plus-core/client" />

declare module '*.css'

interface ImportMetaEnv {
  readonly BASE_URL: string
  readonly PROD: boolean
  readonly DEV: boolean
  readonly MODE: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
