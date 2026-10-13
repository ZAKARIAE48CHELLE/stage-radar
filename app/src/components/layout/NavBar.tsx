import { NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';

export function NavBar() {
  const { isAdmin } = useAuth();

  const navItems = [
    { to: '/offres', label: 'Offres' },
    { to: '/candidatures', label: 'Mes candidatures' },
    { to: '/carrieres', label: 'Sites carrières' },
    { to: '/marche', label: 'Marché' },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', label: 'Admin' });
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
