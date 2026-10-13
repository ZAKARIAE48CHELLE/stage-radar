import { useMemo, useState } from 'react';
import {
  CAREER_CATEGORIES,
  PRESET_CAREER_SITES,
  useCareerSites,
  useSaveCareerSite,
} from './api';
import { CareerSiteModal } from './CareerSiteModal';
import { Spinner } from '../../components/feedback/Spinner';
import { ErrorState } from '../../components/feedback/ErrorState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useAuth } from '../auth/AuthProvider';
import { norm } from '../../lib/text';
import type { CareerSite } from '../../types/db';

export function CareerSitesPage() {
  const { user } = useAuth();
  const { data: sites = [], isLoading, error, refetch } = useCareerSites();
  const saveMutation = useSaveCareerSite();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedSite, setSelectedSite] = useState<CareerSite | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Available categories
  const categories = useMemo(() => {
    return ['Tous', ...CAREER_CATEGORIES];
  }, []);

  // Filtered sites
  const filteredSites = useMemo(() => {
    const qNorm = norm(query);

    return sites.filter((s) => {
      if (qNorm) {
        const hay = norm([s.name, s.category, s.notes].join(' '));
        if (!hay.includes(qNorm)) return false;
      }
      if (selectedCategory !== 'Tous' && s.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [sites, query, selectedCategory]);

  async function handleImportPresets() {
    if (!user) return;
    setIsImporting(true);
    try {
      const existingUrls = new Set(sites.map((s) => s.url.toLowerCase()));
      const toAdd = PRESET_CAREER_SITES.filter(
        (p) => !existingUrls.has(p.url.toLowerCase())
      );

      for (const preset of toAdd) {
        await saveMutation.mutateAsync({
          userId: user.id,
          name: preset.name,
          url: preset.url,
          category: preset.category,
          notes: preset.notes,
        });
      }
    } finally {
      setIsImporting(false);
    }
  }

  function getCategoryBadge(cat: string) {
    const map: Record<string, string> = {
      'Tech & Conseil': 'bg-blue-100 text-blue-800 border-blue-200',
      'Banque & Finance': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Finance & Investissement': 'bg-teal-100 text-teal-800 border-teal-200',
      'Industrie & Énergie': 'bg-amber-100 text-amber-900 border-amber-200',
      'Télécoms': 'bg-purple-100 text-purple-800 border-purple-200',
      'Automobile & Industrie': 'bg-rose-100 text-rose-800 border-rose-200',
    };
    const cls = map[cat] || 'bg-slate-100 text-slate-700 border-slate-200';
    return (
      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${cls}`}>
        {cat || 'Général'}
      </span>
    );
  }

  if (isLoading) {
    return <Spinner className="w-8 h-8 text-blue-600" text="Chargement des sites carrières..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Impossible de charger les sites carrières"
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sites carrières privés</h1>
          <p className="text-sm text-slate-500">
            Enregistrez vos portails RH d'entreprises pour consulter régulièrement leurs offres de stage non indexées.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sites.length < PRESET_CAREER_SITES.length && (
            <button
              onClick={handleImportPresets}
              disabled={isImporting}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-2xs disabled:opacity-50"
            >
              {isImporting ? 'Importation...' : '📥 Importer les portails recommandés'}
            </button>
          )}

          <button
            onClick={() => {
              setSelectedSite(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-sm"
          >
            <span>➕</span> Ajouter un site
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par entreprise, secteur..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Secteur :</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredSites.length === 0 ? (
        <EmptyState
          icon="🌐"
          title="Aucun site carrière enregistré"
          description="Ajoutez vos entreprises favorites ou importez la liste des 12 portails majeurs au Maroc."
          action={{
            label: '📥 Importer les 12 portails recommandés',
            onClick: handleImportPresets,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSites.map((site) => (
            <div
              key={site.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  {getCategoryBadge(site.category)}
                  <button
                    onClick={() => {
                      setSelectedSite(site);
                      setIsModalOpen(true);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-700 font-semibold"
                  >
                    ✏️ Modifier
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{site.name}</h3>

                {site.notes && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                    {site.notes}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-mono truncate max-w-[180px]">
                  {site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </span>

                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs shrink-0"
                >
                  Visiter ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <CareerSiteModal
        site={selectedSite}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSite(null);
        }}
      />
    </div>
  );
}
