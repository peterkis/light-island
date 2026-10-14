import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(({mode})=>({
  define:{'import.meta.env.VITE_APP_TARGET':JSON.stringify(mode==='island'?'island':mode==='workbench'?'workbench':'browser')},
  plugins: [react(), tailwindcss(), {name:'legacy-island-entry',transformIndexHtml:{order:'pre',handler:(html:string)=>mode==='island'?html.replace('/src/main.tsx','/src/legacy-island.tsx'):html}}],
  clearScreen: false,
  server: { host: '127.0.0.1', port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**', '**/evidence/**', '**/test-results/**'] } },
  build: { outDir:mode==='island'?'dist/island':mode==='workbench'?'dist/workbench':'dist/browser',rollupOptions: { input: mode==='island'?['index.html','clinical.html']:['index.html','workbench.html'] }, target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 350 },
}));
