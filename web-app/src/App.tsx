import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth, RequireRole } from '@/components/auth'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { NavigationLoader } from '@/components/feedback'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { UnexpectedErrorPage } from '@/features/errors/UnexpectedErrorPage'
import { PortalHomePage } from '@/features/portals/PortalHomePage'
import {
  AdminPortalLayout,
  ClientPortalLayout,
  CoordinatorPortalLayout,
  TutorPortalLayout,
} from '@/features/portals/PortalLayouts'
import { homePathForRole } from '@/lib/homePath'
import { useAuthStore } from '@/stores/authStore'

/** Signed-in `/` — send each role to its portal. */
function RootHome() {
  const role = useAuthStore((s) => s.user?.role)
  return <Navigate to={homePathForRole(role)} replace />
}

function App() {
  return (
    <BrowserRouter>
      <NavigationLoader />
      <ErrorBoundary>
        <Routes>
          <Route
            path="/"
            element={
              <RequireAuth>
                <RootHome />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
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
