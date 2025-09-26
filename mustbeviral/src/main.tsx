import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Enhanced root element handling with proper error checking
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element. Make sure you have an element with id="root" in your HTML.');
}

// Register service worker for PWA capabilities
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered:', registration);
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
  });
}

// Enable React Concurrent features
const root = createRoot(rootElement, {
  // Enable React 18 concurrent features for better performance
  onRecoverableError: (error, errorInfo) => {
    console.error('Recoverable error:', error, errorInfo);
  }
});

// Render app with StrictMode for better development experience
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Dispatch app mounted event for loader removal
window.dispatchEvent(new CustomEvent('app-mounted'));