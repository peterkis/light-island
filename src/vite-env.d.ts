/// <reference types="vite/client" />
interface Window {
  __TAURI_INTERNALS__?: unknown;
  __ISLAND_DEBUG__?: { snapshot: () => unknown; measure: (ms?: number) => Promise<unknown> };
}
