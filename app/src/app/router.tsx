import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { PublicOnly, RequireAdmin, RequireAuth, RequireFeature } from '../components/layout/Guards';
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
import { hasFeature } from '../lib/features';

function RootRedirect() {
  const { profile } = useAuth();
  if (profile && (!profile.axes || profile.axes.length === 0)) {
    return <Navigate to="/profil" replace />;
  }
  const defaultPage = hasFeature(profile, 'page_offers')
    ? '/offres'
    : hasFeature(profile, 'page_applications')
    ? '/candidatures'
    : hasFeature(profile, 'page_carrieres')
    ? '/carrieres'
    : hasFeature(profile, 'page_marche')
    ? '/marche'
    : '/profil';
  return <Navigate to={defaultPage} replace />;
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
          {
            element: <RequireFeature feature="page_offers" />,
            children: [{ path: '/offres', element: <OffersPage /> }],
          },
          {
            element: <RequireFeature feature="page_applications" />,
            children: [{ path: '/candidatures', element: <ApplicationsPage /> }],
          },
          {
            element: <RequireFeature feature="page_carrieres" />,
            children: [{ path: '/carrieres', element: <CareerSitesPage /> }],
          },
          {
            element: <RequireFeature feature="page_marche" />,
            children: [{ path: '/marche', element: <MarketPage /> }],
          },
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
