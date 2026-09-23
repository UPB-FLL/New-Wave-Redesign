import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { handleChunkPreloadError } from './lib/chunkReload';
import './index.css';

window.addEventListener('vite:preloadError', (event) => handleChunkPreloadError(event));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
