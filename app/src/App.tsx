import { useState } from 'react';
import { ALL_KANBAN_COLS } from './lib/constants';

export default function App() {
  const [selectedCol, setSelectedCol] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'offres' | 'candidatures' | 'carrieres' | 'marche'>('offres');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* TopBar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
              SR
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">Stage Radar</span>
              <span className="ml-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
                React + Vite
              </span>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
            {[
              { id: 'offres', label: 'Offres' },
              { id: 'candidatures', label: 'Mes candidatures' },
              { id: 'carrieres', label: 'Sites carrières' },
              { id: 'marche', label: 'Marché' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3.5 py-1.5 rounded-lg transition ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-700 shadow-sm font-extrabold'
                    : 'hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* User Menu preview */}
          <div className="flex items-center gap-2">
            <a
              href="/perso.html"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition hidden sm:inline"
            >
              Vue Perso
            </a>
            <div className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 bg-white shadow-xs">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                ZC
              </span>
              <span className="text-xs font-bold text-slate-800 hidden sm:inline">Zakariae</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold hidden lg:inline">
                Admin
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Welcome hero */}
        <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Phase 0 Scaffold opérationnel
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Nouvelle architecture React 18 + Vite + TypeScript
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Le socle moderne de Stage Radar est prêt. Il intègre Tailwind CSS, React Query v5, Supabase JS, PWA (Workbox), et Vitest pour des tests unitaires rapides.
            </p>
          </div>
        </section>

        {/* Feature Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold">
              ⚡
            </div>
            <h3 className="text-base font-bold text-slate-900">Vite + React 18 + TS</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Compilation instantanée, typage strict des données Supabase et structure modulaire par domaine (<code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">features/</code>).
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl font-bold">
              📊
            </div>
            <h3 className="text-base font-bold text-slate-900">Kanban & Calendrier</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Prêt pour le pipeline 7 colonnes, le sélecteur de colonnes réactif et la planification d'entretiens avec compte à rebours dynamique.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl font-bold">
              📱
            </div>
            <h3 className="text-base font-bold text-slate-900">PWA & Clean URLs</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Application installable sur mobile et bureau. Routage History API avec fallback SPA sur Cloudflare Pages.
            </p>
          </div>
        </div>

        {/* Interactive Kanban Selector Demo */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Aperçu du sélecteur Kanban</h2>
              <p className="text-xs text-slate-500">Test du composant de colonnes typé avec Tailwind et React state</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Afficher :</span>
              <select
                value={selectedCol}
                onChange={(e) => setSelectedCol(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs shadow-xs focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Toutes les colonnes (7)</option>
                <option value="active">Pipeline actif (5)</option>
                {ALL_KANBAN_COLS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Kanban columns preview */}
          <div className="flex gap-3 overflow-x-auto pb-2 scroll items-start">
            {ALL_KANBAN_COLS.filter((c) => {
              if (selectedCol === 'all') return true;
              if (selectedCol === 'active') return ['a_postuler', 'envoyee', 'relance', 'entretien', 'offre'].includes(c.id);
              return c.id === selectedCol;
            }).map((col) => (
              <div
                key={col.id}
                className="w-64 shrink-0 bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span>{col.icon}</span>
                    <span>{col.title}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${col.headerCls}`}>
                    0
                  </span>
                </div>
                <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  Prêt pour la Phase 4
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Stage Radar &bull; Migration front-end en cours (Phase 0 validée)
      </footer>
    </div>
  );
}
