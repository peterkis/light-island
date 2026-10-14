import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Island} from './components/Island';
import {useIsland} from './hooks/useIsland';
import './tailwind.css';
import './styles.css';
import './island-horizontal.css';
import './notch-motion.css';
document.documentElement.classList.add('native-page');
function LegacyIsland(){return <Island c={useIsland()}/>;}
createRoot(document.getElementById('root')!).render(<StrictMode><LegacyIsland/></StrictMode>);
