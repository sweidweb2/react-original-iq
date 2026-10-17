import './index.css'
import '@/stores/authStore'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { DownloadProgressPanel } from '@/components/feedback/download-progress'
import { Toaster } from '@/components/ui/toast'

import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <DownloadProgressPanel />
    <Toaster />
  </StrictMode>,
)
