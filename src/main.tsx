import { createRoot } from 'react-dom/client';
import { useEffect, StrictMode, Suspense, lazy } from 'react';
import { useIsland } from './hooks/useIsland';
import { Island } from './components/Island';
const Studio = lazy(() => import('./components/Studio').then(module => ({ default: module.Studio })));
import { measureFrames } from './lib/performance';
import './tailwind.css';
import './styles.css';
import './island-horizontal.css';
import './notch-motion.css';
const islandOnly = new URLSearchParams(location.search).get('view') === 'island';
document.documentElement.classList.toggle('native-page', islandOnly);
function App() {
  const c = useIsland();
  useEffect(() => {
    if (import.meta.env.DEV) window.__ISLAND_DEBUG__ = { snapshot: () => ({ model: c.model, mode: c.mode, connection: c.connection, settings: c.settings }), measure: measureFrames };
  }, [c]);
  return islandOnly ? <Island c={c}/> : <Suspense fallback={null}><Studio c={c}/></Suspense>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
