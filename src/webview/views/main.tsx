import { catchWebviewGlobalError } from '@webview/utils/error-handler.utils';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import App from './App';

// Handle errors biar kedetect error webview di output log
catchWebviewGlobalError();

const rootElement = document.getElementById('root')!;
const root = createRoot(rootElement);
root.render(<App />);
