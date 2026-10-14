import { NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';
import { hasFeature } from '../../lib/features';
import { Briefcase, FileText, Globe, BarChart3, Settings } from 'lucide-react';

export function MobileNav() {
  const { profile, isAdmin } = useAuth();

  const allItems = [
    { to: '/offres', label: 'Offres', icon: Briefcase, feature: 'page_offers' },
    { to: '/candidatures', label: 'Candidatures', icon: FileText, feature: 'page_applications' },
    { to: '/carrieres', label: 'Sites', icon: Globe, feature: 'page_carrieres' },
    { to: '/marche', label: 'Marché', icon: BarChart3, feature: 'page_marche' },
  ];

  const navItems = allItems.filter((item) => hasFeature(profile, item.feature));

  if (isAdmin) {
    navItems.push({ to: '/admin', label: 'Admin', icon: Settings, feature: '' });
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-1.5 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] safe-bottom">
      <nav className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
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
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-blue-600' : 'text-slate-500'}`} />
                  <span className="mt-1">{item.label}</span>
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-blue-600 mt-0.5" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
