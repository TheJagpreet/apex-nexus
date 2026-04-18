import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'

// Apply saved theme (or dark default) before first paint to avoid flash
document.documentElement.setAttribute(
  'data-theme',
  localStorage.getItem('apex_theme') || 'dark'
)
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SessionProvider } from './context/SessionContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
