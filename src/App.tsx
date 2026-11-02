import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { NotFoundPage } from '@/components/layout/NotFoundPage';
import { RequireAuth, RequirePermission } from '@/features/auth/guards';
import { HomePage } from '@/features/home/HomePage';

/** Route-level code splitting: every page except Home is its own chunk. */
const page = <T,>(load: () => Promise<T>, name: keyof T) =>
  lazy(() => load().then((m) => ({ default: m[name] as unknown as React.ComponentType })));

const CompaniesPage = page(() => import('@/features/companies/CompaniesPage'), 'CompaniesPage');
const CompanyPage = page(() => import('@/features/companies/CompanyPage'), 'CompanyPage');
const QuestionPage = page(() => import('@/features/questions/QuestionPage'), 'QuestionPage');
const AuthPage = page(() => import('@/features/auth/AuthPage'), 'AuthPage');
const ContributePage = page(() => import('@/features/contribute/ContributePage'), 'ContributePage');
const MyProfilePage = page(() => import('@/features/profile/MyProfilePage'), 'MyProfilePage');
const PublicProfilePage = page(
  () => import('@/features/profile/PublicProfilePage'),
  'PublicProfilePage',
);
const ListPage = page(() => import('@/features/study/ListsTab'), 'ListPage');
const NotificationsPage = page(
  () => import('@/features/notifications/NotificationsPage'),
  'NotificationsPage',
);
const SettingsPage = page(() => import('@/features/settings/SettingsPage'), 'SettingsPage');
const ReviewQueuePage = page(() => import('@/features/admin/ReviewQueuePage'), 'ReviewQueuePage');
const CompanyReviewPage = page(
  () => import('@/features/admin/CompanyReviewPage'),
  'CompanyReviewPage',
);
const InboxPage = page(() => import('@/features/messages/InboxPage'), 'InboxPage');
const HistoryPage = page(() => import('@/features/history/HistoryPage'), 'HistoryPage');
const ReportsPage = page(() => import('@/features/admin/ReportsPage'), 'ReportsPage');
const RolesPage = page(() => import('@/features/admin/RolesPage'), 'RolesPage');
const AssignRolesPage = page(() => import('@/features/admin/AssignRolesPage'), 'AssignRolesPage');
const AnalyticsPage = page(() => import('@/features/admin/AnalyticsPage'), 'AnalyticsPage');
const UsersPage = page(() => import('@/features/admin/UsersPage'), 'UsersPage');
const UserDetailPage = page(() => import('@/features/admin/UsersPage'), 'UserDetailPage');
const CompaniesAdminPage = page(
  () => import('@/features/admin/CompaniesAdminPage'),
  'CompaniesAdminPage',
);

const auth = (el: React.ReactNode) => <RequireAuth>{el}</RequireAuth>;

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/companies', element: <CompaniesPage /> },
      { path: '/c/:slug', element: <CompanyPage /> },
      { path: '/c/:slug/:qslug', element: <QuestionPage /> },
      // One parent element so switching between the two tabs keeps the page mounted.
      { element: <AuthPage />, children: [{ path: '/login' }, { path: '/register' }] },
      { path: '/contribute', element: <ContributePage /> },
      { path: '/u/:username', element: <PublicProfilePage /> },
      { path: '/me', element: auth(<MyProfilePage />) },
      { path: '/lists/:id', element: auth(<ListPage />) },
      { path: '/notifications', element: auth(<NotificationsPage />) },
      { path: '/inbox', element: auth(<InboxPage />) },
      { path: '/history', element: auth(<HistoryPage />) },
      { path: '/inbox/:id', element: auth(<InboxPage />) },
      { path: '/settings', element: <SettingsPage /> },
      {
        path: '/admin/review',
        element: (
          <RequirePermission permission="questions.review">
            <ReviewQueuePage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/company-review',
        element: (
          <RequirePermission permission="companies.review">
            <CompanyReviewPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/reports',
        element: (
          <RequirePermission permission="reports.review">
            <ReportsPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/roles',
        element: (
          <RequirePermission permission="roles.manage">
            <RolesPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/assign',
        element: (
          <RequirePermission any={['users.assign_roles', 'users.ban']}>
            <AssignRolesPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/analytics',
        element: (
          <RequirePermission permission="analytics.view">
            <AnalyticsPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/users',
        element: (
          <RequirePermission permission="users.view_private">
            <UsersPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/users/:id',
        element: (
          <RequirePermission permission="users.view_private">
            <UserDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/companies',
        element: (
          <RequirePermission any={['companies.review', 'companies.edit', 'companies.delete']}>
            <CompaniesAdminPage />
          </RequirePermission>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
