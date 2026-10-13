import { Link } from 'react-router-dom';
import { NavBar } from './NavBar';
import { UserMenuDropdown } from './UserMenuDropdown';

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/offres" className="flex items-center gap-2.5 shrink-0 hover:opacity-90 transition">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
            SR
          </span>
          <span className="font-extrabold text-slate-900 hidden sm:inline tracking-tight text-base">
            Stage Radar
          </span>
        </Link>

        {/* Navigation Tabs (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4 justify-center">
          <NavBar />
        </div>

        {/* Right side: Vue Perso + User Menu */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/perso.html"
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition hidden md:inline"
            title="Voir le dashboard personnel historique"
          >
            Vue Perso
          </a>
          <UserMenuDropdown />
        </div>
      </div>
    </header>
  );
}
