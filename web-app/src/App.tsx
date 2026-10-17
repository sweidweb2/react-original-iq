import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth, RequirePermission, RequireRole } from '@/components/auth'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { NavigationLoader, ScrollToTop } from '@/components/feedback'
import { MAINTENANCE_PATH, MaintenanceGate } from '@/components/maintenance/MaintenanceGate'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { UnexpectedErrorPage } from '@/features/errors/UnexpectedErrorPage'
import { PortalLayout } from '@/features/portals/PortalLayouts'
import { PORTALS } from '@/features/portals/portalNav'
import { PublicLayout } from '@/features/public/PublicLayout'
import { localizedPublicRoutes } from '@/features/public/publicRoutes'
import { lazyPage } from '@/lib/lazyPage'
import type { PermissionCheck, PermissionKey } from '@/lib/permissions'
import type { AuthRole } from '@/services/auth'

const LoginPage = lazyPage(() => import('@/features/auth/LoginPage'), 'LoginPage')
const RegisterPage = lazyPage(() => import('@/features/auth/RegisterPage'), 'RegisterPage')
const ForgotPasswordPage = lazyPage(
  () => import('@/features/auth/ForgotPasswordPage'),
  'ForgotPasswordPage',
)
const ResetVerifyPage = lazyPage(() => import('@/features/auth/ResetVerifyPage'), 'ResetVerifyPage')
const ResetUpdatePage = lazyPage(() => import('@/features/auth/ResetUpdatePage'), 'ResetUpdatePage')
const MaintenancePage = lazyPage(
  () => import('@/features/errors/MaintenancePage'),
  'MaintenancePage',
)

const PortalDashboardPage = lazyPage(
  () => import('@/features/shared/dashboard/PortalDashboardPage'),
  'PortalDashboardPage',
)
const TasksPage = lazyPage(() => import('@/features/shared/tasks/TasksPage'), 'TasksPage')
const TaskDetailsPage = lazyPage(
  () => import('@/features/shared/tasks/TaskDetailsPage'),
  'TaskDetailsPage',
)
const TaskPaymentsPage = lazyPage(
  () => import('@/features/shared/tasks/TaskPaymentsPage'),
  'TaskPaymentsPage',
)
const RevisionDetailsPage = lazyPage(
  () => import('@/features/shared/revisions/RevisionDetailsPage'),
  'RevisionDetailsPage',
)
const ProfilePage = lazyPage(() => import('@/features/shared/profile/ProfilePage'), 'ProfilePage')
const FeedbackPage = lazyPage(
  () => import('@/features/shared/feedback/FeedbackPage'),
  'FeedbackPage',
)
const ManageUserProfilePage = lazyPage(
  () => import('@/features/shared/users/ManageUserProfilePage'),
  'ManageUserProfilePage',
)

const AdminHomePage = lazyPage(() => import('@/features/admin/home/AdminHomePage'), 'AdminHomePage')
const ManageUsersPage = lazyPage(
  () => import('@/features/admin/users/ManageUsersPage'),
  'ManageUsersPage',
)
const LeadsPage = lazyPage(() => import('@/features/admin/leads/LeadsPage'), 'LeadsPage')
const ContactMessagesPage = lazyPage(
  () => import('@/features/admin/contact/ContactMessagesPage'),
  'ContactMessagesPage',
)
const StayUpdatedPage = lazyPage(
  () => import('@/features/admin/stay-updated/StayUpdatedPage'),
  'StayUpdatedPage',
)

const ActivityLogsPage = lazyPage(
  () => import('@/features/super/ActivityLogsPage'),
  'ActivityLogsPage',
)
const ErrorLogsPage = lazyPage(() => import('@/features/super/ErrorLogsPage'), 'ErrorLogsPage')
const ManageRbacPage = lazyPage(
  () => import('@/features/super/rbac/ManageRbacPage'),
  'ManageRbacPage',
)
const BackupPage = lazyPage(() => import('@/features/super/backup/BackupPage'), 'BackupPage')
const SettingsPage = lazyPage(
  () => import('@/features/super/settings/SettingsPage'),
  'SettingsPage',
)

const TASKS: PermissionKey[] = ['view_tasks', 'view_all_tasks']

function gated(permission: PermissionCheck, page: ReactNode) {
  return <RequirePermission permission={permission}>{page}</RequirePermission>
}

/** Every portal mounts the pages it may need; permissions decide what each user can open. */
function portalChildRoutes(role: AuthRole) {
  const users = (
    <>
      <Route path="users" element={gated('view_users', <ManageUsersPage />)} />
      <Route path="users/:userId" element={gated('view_users', <ManageUserProfilePage />)} />
    </>
  )

  if (role === 'super') {
    return (
      <>
        <Route index element={gated('view_activity_logs', <ActivityLogsPage />)} />
        <Route path="errors" element={gated('view_error_logs', <ErrorLogsPage />)} />
        {users}
        <Route path="rbac" element={gated('manage_rbac', <ManageRbacPage />)} />
        <Route path="backup" element={gated('manage_backups', <BackupPage />)} />
        <Route path="settings" element={gated('manage_system', <SettingsPage />)} />
        <Route path="profile" element={<ProfilePage />} />
      </>
    )
  }

  return (
    <>
      <Route
        index
        element={
          role === 'admin'
            ? gated('view_reports', <AdminHomePage />)
            : gated('view_dashboard', <PortalDashboardPage />)
        }
      />
      <Route path="tasks" element={gated(TASKS, <TasksPage />)} />
      <Route path="tasks/:taskId" element={gated(TASKS, <TaskDetailsPage />)} />
      <Route path="tasks/:taskId/payments" element={gated('view_payments', <TaskPaymentsPage />)} />
      <Route
        path="tasks/:taskId/revisions/:revisionId"
        element={gated('view_revisions', <RevisionDetailsPage />)}
      />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="feedback" element={gated('view_feedback', <FeedbackPage />)} />
      {users}
      <Route path="leads" element={gated('manage_leads', <LeadsPage />)} />
      <Route path="contact" element={gated('manage_contact_messages', <ContactMessagesPage />)} />
      <Route path="stay-updated" element={gated('manage_newsletter', <StayUpdatedPage />)} />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <NavigationLoader />
      <ScrollToTop />
      <ErrorBoundary>
        <MaintenanceGate>
          <Routes>
            {localizedPublicRoutes()}

            <Route element={<PublicLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/password-reset/verify" element={<ResetVerifyPage />} />
              <Route path="/password-reset/update" element={<ResetUpdatePage />} />
              <Route path="/signup" element={<RegisterPage />} />
              <Route path="/register" element={<Navigate to="/signup" replace />} />
              <Route path="/500" element={<UnexpectedErrorPage />} />
              <Route path={MAINTENANCE_PATH} element={<MaintenancePage />} />
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
        </MaintenanceGate>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
