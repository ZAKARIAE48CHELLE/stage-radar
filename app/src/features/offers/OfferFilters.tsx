import { CITIES, STATUSES } from '../../lib/constants';

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

  const hasActiveFilters =
    filters.q !== '' ||
    filters.city !== '' ||
    filters.modality !== '' ||
    filters.source !== '' ||
    filters.status !== '' ||
    filters.fresh ||
    filters.pfe ||
    filters.paid ||
    filters.minScore > 0 ||
    filters.sort !== 'score';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="md:col-span-4 relative">
          <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            value={filters.q}
            onChange={(e) => update('q', e.target.value)}
            placeholder="Rechercher par titre, entreprise, mots-clés..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </div>

        {/* City */}
        <div className="md:col-span-2">
          <select
            value={filters.city}
            onChange={(e) => update('city', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
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
        <div className="md:col-span-2">
          <select
            value={filters.modality}
            onChange={(e) => update('modality', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          >
            <option value="">Toutes modalités</option>
            <option value="Présentiel">Présentiel</option>
            <option value="Hybride">Hybride</option>
            <option value="Télétravail">Télétravail</option>
          </select>
        </div>

        {/* Source */}
        <div className="md:col-span-2">
          <select
            value={filters.source}
            onChange={(e) => update('source', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
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
        <div className="md:col-span-2">
          <select
            value={filters.status}
            onChange={(e) => update('status', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          >
            <option value="">Tous les statuts</option>
            <option value="none">Non postulé</option>
            {Object.entries(STATUSES).map(([id, info]) => (
              <option key={id} value={id}>
                {info.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Toggles + Min score + Sort + Reset */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => update('fresh', !filters.fresh)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
              filters.fresh
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            ⚡ Nouvelles 48h
          </button>

          <button
            type="button"
            onClick={() => update('pfe', !filters.pfe)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
              filters.pfe
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            🎓 PFE uniquement
          </button>

          <button
            type="button"
            onClick={() => update('paid', !filters.paid)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
              filters.paid
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            💰 Rémunéré
          </button>

          <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200">
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
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>Trier par :</span>
            <select
              value={filters.sort}
              onChange={(e) => update('sort', e.target.value as 'score' | 'date')}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
            >
              <option value="score">Score de match</option>
              <option value="date">Date de publication</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={reset}
              className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 ml-2 font-medium"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
