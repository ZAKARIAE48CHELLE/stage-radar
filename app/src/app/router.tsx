import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { PublicOnly, RequireAdmin, RequireAuth } from '../components/layout/Guards';
import { LoginPage } from '../features/auth/LoginPage';
import { SignupPage } from '../features/auth/SignupPage';
import { ForgotPage } from '../features/auth/ForgotPage';
import { ResetPage } from '../features/auth/ResetPage';
import { PendingPage } from '../features/auth/PendingPage';
import { OffersPage } from '../features/offers/OffersPage';
import { ApplicationsPage } from '../features/applications/ApplicationsPage';
import { CareerSitesPage } from '../features/career-sites/CareerSitesPage';
import { MarketPage } from '../features/market/MarketPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { AdminPage } from '../features/admin/AdminPage';
import { useAuth } from '../features/auth/AuthProvider';

function RootRedirect() {
  const { profile } = useAuth();
  if (profile && (!profile.axes || profile.axes.length === 0)) {
    return <Navigate to="/profil" replace />;
  }
  return <Navigate to="/offres" replace />;
}

export const router = createBrowserRouter([
  // Public auth routes
  {
    element: <PublicOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot', element: <ForgotPage /> },
      { path: '/reset', element: <ResetPage /> },
    ],
  },

  // Pending route
  {
    path: '/pending',
    element: <PendingPage />,
  },

  // Protected app routes
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <RootRedirect /> },
          { path: '/offres', element: <OffersPage /> },
          { path: '/candidatures', element: <ApplicationsPage /> },
          { path: '/carrieres', element: <CareerSitesPage /> },
          { path: '/marche', element: <MarketPage /> },
          { path: '/profil', element: <ProfilePage /> },
          {
            element: <RequireAdmin />,
            children: [{ path: '/admin', element: <AdminPage /> }],
          },
        ],
      },
    ],
  },

  // Fallback
  {
    path: '*',
    element: <Navigate to="/offres" replace />,
  },
]);
