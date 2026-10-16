import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth, RequireRole } from '@/components/auth'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { NavigationLoader } from '@/components/feedback'
import { ContactMessagesPage } from '@/features/admin/contact/ContactMessagesPage'
import { LeadsPage } from '@/features/admin/leads/LeadsPage'
import { StayUpdatedPage } from '@/features/admin/stay-updated/StayUpdatedPage'
import { ManageUsersPage } from '@/features/admin/users/ManageUsersPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { UnexpectedErrorPage } from '@/features/errors/UnexpectedErrorPage'
import { HomePage } from '@/features/home/HomePage'
import { PortalLayout } from '@/features/portals/PortalLayouts'
import { PORTALS } from '@/features/portals/portalNav'
import { FaqPage } from '@/features/public/FaqPage'
import { AboutPage, ContactPage, ServicesPage } from '@/features/public/pages'
import { PrivacyPage, RefundsPage, TermsPage } from '@/features/public/policyPages'
import { PublicLayout } from '@/features/public/PublicLayout'
import { PortalDashboardPage } from '@/features/shared/dashboard/PortalDashboardPage'
import { FeedbackPage } from '@/features/shared/feedback/FeedbackPage'
import { ProfilePage } from '@/features/shared/profile/ProfilePage'
import { RevisionDetailsPage } from '@/features/shared/revisions/RevisionDetailsPage'
import { TaskDetailsPage } from '@/features/shared/tasks/TaskDetailsPage'
import { TaskPaymentsPage } from '@/features/shared/tasks/TaskPaymentsPage'
import { TasksPage } from '@/features/shared/tasks/TasksPage'
import { ManageUserProfilePage } from '@/features/shared/users/ManageUserProfilePage'
import { ActivityLogsPage } from '@/features/super/ActivityLogsPage'
import type { AuthRole } from '@/services/auth'

function portalChildRoutes(role: AuthRole) {
  if (role === 'super') {
    return <Route index element={<ActivityLogsPage />} />
  }

  const hasPayments = role === 'admin' || role === 'coordinator' || role === 'client'
  const hasRevisions = role === 'admin' || role === 'coordinator'
  const hasManageUser = role === 'admin' || role === 'coordinator'
  const hasFeedback = role === 'admin' || role === 'tutor' || role === 'client'

  return (
    <>
      <Route index element={<PortalDashboardPage />} />
      <Route path="tasks" element={<TasksPage />} />
      <Route path="tasks/:taskId" element={<TaskDetailsPage />} />
      {hasPayments ? (
        <Route path="tasks/:taskId/payments" element={<TaskPaymentsPage />} />
      ) : null}
      {hasRevisions ? (
        <Route path="tasks/:taskId/revisions/:revisionId" element={<RevisionDetailsPage />} />
      ) : null}
      <Route path="profile" element={<ProfilePage />} />
      {hasFeedback ? <Route path="feedback" element={<FeedbackPage />} /> : null}
      {role === 'admin' ? (
        <>
          <Route path="users" element={<ManageUsersPage />} />
          <Route path="users/:userId" element={<ManageUserProfilePage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="contact" element={<ContactMessagesPage />} />
          <Route path="stay-updated" element={<StayUpdatedPage />} />
        </>
      ) : null}
      {hasManageUser && role !== 'admin' ? (
        <Route path="users/:userId" element={<ManageUserProfilePage />} />
      ) : null}
    </>
  )
}

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
            <Route path="/500" element={<UnexpectedErrorPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {PORTALS.map((portal) => (
            <Route
              key={portal.path}
              path={portal.path}
              element={
                <RequireAuth>
                  <RequireRole roles={[portal.role]}>
                    <PortalLayout portal={portal} />
                  </RequireRole>
                </RequireAuth>
              }
            >
              {portalChildRoutes(portal.role)}
            </Route>
          ))}
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
