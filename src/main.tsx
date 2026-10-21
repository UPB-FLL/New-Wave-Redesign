import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { handleChunkPreloadError } from './lib/chunkReload';
import { initAnalytics } from './lib/analytics';
import './index.css';

window.addEventListener('vite:preloadError', (event) => handleChunkPreloadError(event));
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
