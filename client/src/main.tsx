import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import AppErrorBoundary from './components/AppErrorBoundary.tsx'

// Capture beforeinstallprompt before React mounts (event fires very early)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as Window & { __pwaInstallPrompt?: Event }).__pwaInstallPrompt = e
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary><Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Загружаем кабинет…</div>}>
      <App />
    </Suspense></AppErrorBoundary>
  </StrictMode>,
)

