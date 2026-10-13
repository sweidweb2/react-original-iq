import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth, RequireRole } from '@/components/auth'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { NavigationLoader } from '@/components/feedback'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { UnexpectedErrorPage } from '@/features/errors/UnexpectedErrorPage'
import { HomePage } from '@/features/home/HomePage'
import { PortalHomePage } from '@/features/portals/PortalHomePage'
import {
  AdminPortalLayout,
  ClientPortalLayout,
  CoordinatorPortalLayout,
  TutorPortalLayout,
} from '@/features/portals/PortalLayouts'
import { FaqPage } from '@/features/public/FaqPage'
import { AboutPage, ContactPage, ServicesPage } from '@/features/public/pages'
import { PrivacyPage, RefundsPage, TermsPage } from '@/features/public/policyPages'
import { PublicLayout } from '@/features/public/PublicLayout'
function App() {
  return (
    <BrowserRouter>
      <NavigationLoader />
      <ErrorBoundary>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/refunds" element={<RefundsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<RegisterPage />} />
            <Route path="/register" element={<Navigate to="/signup" replace />} />
          </Route>
          <Route path="/500" element={<UnexpectedErrorPage />} />

          <Route
            path="/admin"
            element={
              <RequireAuth>
                <RequireRole roles={['admin']} fallbackTo="/">
                  <AdminPortalLayout />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route
              index
              element={
                <PortalHomePage
                  title="Admin home"
                  description="Admin portal landing — tools will land here."
                />
              }
            />
          </Route>

          <Route
            path="/coordinator"
            element={
              <RequireAuth>
                <RequireRole roles={['coordinator']} fallbackTo="/">
                  <CoordinatorPortalLayout />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route
              index
              element={
                <PortalHomePage
                  title="Coordinator home"
                  description="Coordinator portal landing — tools will land here."
                />
              }
            />
          </Route>

          <Route
            path="/tutor"
            element={
              <RequireAuth>
                <RequireRole roles={['tutor']} fallbackTo="/">
                  <TutorPortalLayout />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route
              index
              element={
                <PortalHomePage
                  title="Tutor home"
                  description="Tutor portal landing — tools will land here."
                />
              }
            />
          </Route>

          <Route
            path="/client"
            element={
              <RequireAuth>
                <RequireRole roles={['client']} fallbackTo="/">
                  <ClientPortalLayout />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route
              index
              element={
                <PortalHomePage
                  title="Client home"
                  description="Client portal landing — tools will land here."
                />
              }
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
