import { NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';

export function MobileNav() {
  const { isAdmin } = useAuth();

  const navItems = [
    { to: '/offres', label: 'Offres', icon: '🎯' },
    { to: '/candidatures', label: 'Candidatures', icon: '📝' },
    { to: '/carrieres', label: 'Sites', icon: '🌐' },
    { to: '/marche', label: 'Marché', icon: '📊' },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', label: 'Admin', icon: '⚙️' });
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-1.5 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] safe-bottom">
      <nav className="flex items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition text-[11px] font-bold ${
                isActive
                  ? 'text-blue-600 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`text-lg transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className="mt-0.5">{item.label}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-blue-600 mt-0.5" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
