import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { SelectionProvider } from './state/selection.jsx';
import { initAnalytics } from './lib/analytics.js';
import './styles/index.css';

initAnalytics();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SelectionProvider>
      <App />
    </SelectionProvider>
  </React.StrictMode>
);
