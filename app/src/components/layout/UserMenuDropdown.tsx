import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';

export function UserMenuDropdown() {
  const { profile, user, signOut, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const displayName = profile?.full_name || profile?.email || user?.email || 'Utilisateur';
  const displayEmail = profile?.email || user?.email || '';
  const initials = (profile?.full_name || displayEmail)
    .split(' ')
    .filter(Boolean)
    .map(x => x[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const isProfileActive = location.pathname === '/profil';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-xs focus:outline-none ${
          isProfileActive ? 'ring-2 ring-blue-600 border-blue-500' : ''
        }`}
      >
        <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-inner">
          {initials}
        </span>
        <span className="text-xs font-bold text-slate-800 max-w-[130px] truncate hidden sm:inline">
          {displayName}
        </span>
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="font-bold text-slate-900 truncate text-sm">{displayName}</p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{displayEmail}</p>
            <div className="mt-1.5">
              <span
                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  isAdmin
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                {isAdmin ? 'Administrateur' : 'Étudiant(e)'}
              </span>
            </div>
          </div>

          <div className="py-1">
            <Link
              to="/profil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-semibold transition"
            >
              <span className="text-base">👤</span>
              <div className="flex-1">
                <div>Éditer le profil</div>
                <div className="text-[10px] text-slate-400 font-normal">CV, axes, villes, préférences</div>
              </div>
            </Link>

            <a
              href="/perso.html"
              className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 font-semibold transition sm:hidden"
            >
              <span className="text-base">📊</span>
              <div>Vue Perso historique</div>
            </a>
          </div>

          <div className="border-t border-slate-100 my-1" />

          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
            className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 font-semibold transition"
          >
            <span className="text-base">🚪</span>
            <span>Se déconnecter</span>
          </button>
        </div>
      )}
    </div>
  );
}
