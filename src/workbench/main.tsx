import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import WorkbenchApp from './WorkbenchApp';
import '../clinical/tokens.css';
import '../clinical/clinical.css';
import '../clinical/uiux.css';
createRoot(document.getElementById('root')!).render(<StrictMode><WorkbenchApp/></StrictMode>);
