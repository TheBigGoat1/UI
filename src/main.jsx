import React from 'react'
import ReactDOM from 'react-dom/client'
import { installExtensionConsoleFilter } from './utils/devConsoleFilter.js'
import App from './App.jsx'
import './index.css'

installExtensionConsoleFilter()

const app = import.meta.env.DEV ? <App /> : (
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

ReactDOM.createRoot(document.getElementById('root')).render(app)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline shell optional */
    });
  });
}
