import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <TopBar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400 hidden md:block">
        Stage Radar &bull; Suivi quotidien des stages & PFE au Maroc
      </footer>
      <MobileNav />
    </div>
  );
}
