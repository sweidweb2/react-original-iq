import './index.css'
import '@/stores/authStore'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { DownloadProgressPanel } from '@/components/feedback/download-progress'
import { Toaster } from '@/components/ui/toast'

import App from './App.tsx'

const CHUNK_RELOAD_KEY = 'chunk-reload-at'

// A deploy replaces hashed page chunks; an open tab reloads once to fetch the new build.
window.addEventListener('vite:preloadError', (event) => {
  const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0)
  if (Date.now() - lastReload < 10_000) return
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <DownloadProgressPanel />
    <Toaster />
  </StrictMode>,
)
