import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { translateAlertMessage } from './utils/alertTranslator'

// Automatically localize any native window.alert() according to selected FR/AR language
if (typeof window !== 'undefined' && typeof window.alert === 'function') {
  const nativeAlert = window.alert.bind(window);
  window.alert = (msg) => nativeAlert(translateAlertMessage(typeof msg === 'string' ? msg : String(msg ?? '')));
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
