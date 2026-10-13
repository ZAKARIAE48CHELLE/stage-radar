import { useState } from 'react';
import { CITIES, STATUSES } from '../../lib/constants';
import { Search, X, SlidersHorizontal, ChevronUp, ChevronDown, Zap, GraduationCap, Coins } from 'lucide-react';

export interface OfferFilterState {
  q: string;
  city: string;
  modality: string;
  source: string;
  status: string;
  fresh: boolean;
  pfe: boolean;
  paid: boolean;
  minScore: number;
  sort: 'score' | 'date';
}

interface OfferFiltersProps {
  filters: OfferFilterState;
  onChange: (filters: OfferFilterState) => void;
  sources: string[];
}

export function OfferFilters({ filters, onChange, sources }: OfferFiltersProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  function update<K extends keyof OfferFilterState>(key: K, value: OfferFilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  function reset() {
    onChange({
      q: '',
      city: '',
      modality: '',
      source: '',
      status: '',
      fresh: false,
      pfe: false,
      paid: false,
      minScore: 0,
      sort: 'score',
    });
  }

  const activeAdvancedCount =
    (filters.city ? 1 : 0) +
    (filters.modality ? 1 : 0) +
    (filters.source ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.minScore > 0 ? 1 : 0) +
    (filters.sort !== 'score' ? 1 : 0);

  const hasAnyFilter =
    filters.q !== '' ||
    filters.fresh ||
    filters.pfe ||
    filters.paid ||
    activeAdvancedCount > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 sm:p-4 mb-4 sm:mb-6">
      {/* Top Search & Mobile Toggle */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={filters.q}
            onChange={(e) => update('q', e.target.value)}
            placeholder="Rechercher poste, entreprise, mots-clés..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
          {filters.q && (
            <button
              onClick={() => update('q', '')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile filter toggle button */}
        <div className="flex sm:hidden items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMobileExpanded(!mobileExpanded)}
            className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Filtres avancés</span>
            {activeAdvancedCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeAdvancedCount}
              </span>
            )}
            {mobileExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {hasAnyFilter && (
            <button
              onClick={reset}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter Pills (Always visible on mobile & desktop) */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2.5">
        <button
          type="button"
          onClick={() => update('fresh', !filters.fresh)}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
            filters.fresh
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-3 h-3" />
          <span>48h</span>
        </button>

        <button
          type="button"
          onClick={() => update('pfe', !filters.pfe)}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
            filters.pfe
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-3 h-3" />
          <span>PFE</span>
        </button>

        <button
          type="button"
          onClick={() => update('paid', !filters.paid)}
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
            filters.paid
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Coins className="w-3 h-3" />
          <span>Rémunéré</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Min score :</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.minScore}
            onChange={(e) => update('minScore', Number(e.target.value))}
            className="w-20 accent-blue-600 cursor-pointer"
          />
          <span className="text-xs font-bold text-slate-700 min-w-[2.5rem]">{filters.minScore}%</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 ml-auto text-xs text-slate-500">
          <span>Tri :</span>
          <select
            value={filters.sort}
            onChange={(e) => update('sort', e.target.value as 'score' | 'date')}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
          >
            <option value="score">Score match</option>
            <option value="date">Date</option>
          </select>

          {hasAnyFilter && (
            <button
              onClick={reset}
              className="text-xs text-slate-500 hover:text-slate-800 underline ml-2 font-medium"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Advanced Dropdowns (Expanded on desktop, toggleable on mobile) */}
      <div className={`mt-3 pt-3 border-t border-slate-100 ${mobileExpanded ? 'block' : 'hidden sm:block'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          {/* City */}
          <div>
            <label className="block sm:hidden text-[10px] font-bold text-slate-400 mb-0.5">Ville</label>
            <select
              value={filters.city}
              onChange={(e) => update('city', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
            >
              <option value="">Toutes les villes</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Modality */}
          <div>
            <label className="block sm:hidden text-[10px] font-bold text-slate-400 mb-0.5">Modalité</label>
            <select
              value={filters.modality}
              onChange={(e) => update('modality', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
            >
              <option value="">Toutes modalités</option>
              <option value="Présentiel">Présentiel</option>
              <option value="Hybride">Hybride</option>
              <option value="Télétravail">Télétravail</option>
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="block sm:hidden text-[10px] font-bold text-slate-400 mb-0.5">Source</label>
            <select
              value={filters.source}
              onChange={(e) => update('source', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
            >
              <option value="">Toutes les sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s.startsWith('email:') ? s.slice(6) + ' (alerte)' : s}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block sm:hidden text-[10px] font-bold text-slate-400 mb-0.5">Statut</label>
            <select
              value={filters.status}
              onChange={(e) => update('status', e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
            >
              <option value="">Tous statuts</option>
              <option value="none">Non postulé</option>
              {Object.entries(STATUSES).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile-only slider and sort */}
        <div className="flex sm:hidden flex-col gap-2 mt-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Score min : {filters.minScore}%</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.minScore}
              onChange={(e) => update('minScore', Number(e.target.value))}
              className="w-32 accent-blue-600"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Trier par :</span>
            <select
              value={filters.sort}
              onChange={(e) => update('sort', e.target.value as 'score' | 'date')}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
            >
              <option value="score">Score match</option>
              <option value="date">Date</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
