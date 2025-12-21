import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Global error handling to update the UI if something breaks
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Critical Launch Error: ", { message, source, lineno, colno, error });
  const loadingText = document.getElementById('loading-text');
  if (loadingText) {
    loadingText.innerText = "Saga Launch Failed. Check console for details.";
    loadingText.style.color = "#ef4444";
  }
};

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  const root = createRoot(rootElement);
  
  // Render the application
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // Remove the loader after a short delay to ensure React has started rendering
  const removeLoader = () => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => {
        if (loader && loader.parentNode) {
          loader.remove();
        }
      }, 500);
    }
  };

  // Trigger loader removal
  setTimeout(removeLoader, 200);
};

// Handle mounting based on document state
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}