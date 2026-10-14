import { NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';
import { hasFeature } from '../../lib/features';

export function NavBar() {
  const { profile, isAdmin } = useAuth();

  const allItems = [
    { to: '/offres', label: 'Offres', feature: 'page_offers' },
    { to: '/candidatures', label: 'Mes candidatures', feature: 'page_applications' },
    { to: '/carrieres', label: 'Sites carrières', feature: 'page_carrieres' },
    { to: '/marche', label: 'Marché', feature: 'page_marche' },
  ];

  const navItems = allItems.filter((item) => hasFeature(profile, item.feature));

  if (isAdmin) {
    navItems.push({ to: '/admin', label: 'Admin', feature: '' });
  }

  return (
    <nav className="flex items-center gap-1 overflow-x-auto scroll py-1 text-xs sm:text-sm font-semibold text-slate-600">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `px-3 py-2 rounded-xl transition whitespace-nowrap ${
              isActive
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'hover:bg-slate-100 hover:text-slate-900'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
