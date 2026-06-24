/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  // Adsterra banner ad unit keys (from your Adsterra dashboard). Optional —
  // ads only render when a key is provided, so the build works without them.
  readonly VITE_ADSTERRA_BANNER_KEY?: string;         // 728x90 (desktop/tablet)
  readonly VITE_ADSTERRA_BANNER_MOBILE_KEY?: string;  // 320x50 (mobile)
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
