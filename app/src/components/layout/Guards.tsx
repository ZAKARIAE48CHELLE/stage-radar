import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';
import { hasFeature } from '../../lib/features';

export function RequireAuth() {
  const { session, loading, isBlocked, isPending } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Chargement de votre session...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (isBlocked || isPending) {
    return <Navigate to="/pending" replace />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;
  if (!isAdmin) {
    return <Navigate to="/offres" replace />;
  }

  return <Outlet />;
}

export function PublicOnly() {
  const { session, isApproved, loading } = useAuth();

  if (loading) return null;
  if (session && isApproved) {
    return <Navigate to="/offres" replace />;
  }

  return <Outlet />;
}

export function RequireFeature({ feature }: { feature: string }) {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (!hasFeature(profile, feature)) {
    const fallback = hasFeature(profile, 'page_offers')
      ? '/offres'
      : hasFeature(profile, 'page_applications')
      ? '/candidatures'
      : hasFeature(profile, 'page_carrieres')
      ? '/carrieres'
      : hasFeature(profile, 'page_marche')
      ? '/marche'
      : '/profil';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
