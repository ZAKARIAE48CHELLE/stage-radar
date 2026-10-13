import { useMemo, useState } from 'react';
import { useMatches } from './api';
import { KpiRow } from './KpiRow';
import { OfferFilters, type OfferFilterState } from './OfferFilters';
import { OfferTable } from './OfferTable';
import { OfferCardGrid } from './OfferCardGrid';
import { OfferModal } from './OfferModal';
import { Spinner } from '../../components/feedback/Spinner';
import { ErrorState } from '../../components/feedback/ErrorState';
import type { MatchOffer } from '../../types/api';
import { isFresh } from '../../lib/format';
import { isPaid } from '../../lib/paid';
import { norm } from '../../lib/text';
import { LayoutGrid, Table } from 'lucide-react';

export function OffersPage() {
  const { data: offers = [], isLoading, error, refetch } = useMatches();

  const [selectedOffer, setSelectedOffer] = useState<MatchOffer | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    try {
      const saved = localStorage.getItem('sr_offers_view_mode');
      return saved === 'table' ? 'table' : 'cards';
    } catch {
      return 'cards';
    }
  });

  function handleViewModeChange(mode: 'cards' | 'table') {
    setViewMode(mode);
    try {
      localStorage.setItem('sr_offers_view_mode', mode);
    } catch {
      // ignore
    }
  }

  const [filters, setFilters] = useState<OfferFilterState>({
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

  // Extract unique sources for the dropdown
  const uniqueSources = useMemo(() => {
    const set = new Set<string>();
    offers.forEach((o) => {
      if (o.source) set.add(o.source);
    });
    return Array.from(set).sort();
  }, [offers]);

  // Overall KPIs
  const kpis = useMemo(() => {
    let paidCount = 0;
    let freshCount = 0;
    let topCount = 0;

    offers.forEach((o) => {
      if (isPaid(o)) paidCount++;
      if (isFresh(o.first_seen)) freshCount++;
      if (o.score >= 75) topCount++;
    });

    return {
      total: offers.length,
      paidCount,
      freshCount,
      topCount,
    };
  }, [offers]);

  // Filter & sort offers
  const filteredOffers = useMemo(() => {
    const qNorm = norm(filters.q);

    return offers
      .filter((o) => {
        // Search query
        if (qNorm) {
          const hay = norm(
            [o.title, o.company, o.city, (o.matched || []).join(' ')].join(' ')
          );
          if (!hay.includes(qNorm)) return false;
        }

        // City
        if (filters.city) {
          if (norm(o.city) !== norm(filters.city)) return false;
        }

        // Modality
        if (filters.modality) {
          if (o.modality !== filters.modality) return false;
        }

        // Source
        if (filters.source) {
          if (o.source !== filters.source) return false;
        }

        // Status
        if (filters.status) {
          if (filters.status === 'none') {
            if (o.app_status) return false;
          } else {
            if (o.app_status !== filters.status) return false;
          }
        }

        // Fresh 48h
        if (filters.fresh && !isFresh(o.first_seen)) return false;

        // PFE
        if (filters.pfe && !o.is_pfe) return false;

        // Paid
        if (filters.paid && !isPaid(o)) return false;

        // Min score
        if (o.score < filters.minScore) return false;

        return true;
      })
      .sort((a, b) => {
        if (filters.sort === 'score') {
          if (b.score !== a.score) return b.score - a.score;
          const dateB = b.date_posted || b.first_seen || '';
          const dateA = a.date_posted || a.first_seen || '';
          return dateB.localeCompare(dateA);
        } else {
          const dateB = b.date_posted || b.first_seen || '';
          const dateA = a.date_posted || a.first_seen || '';
          if (dateB !== dateA) return dateB.localeCompare(dateA);
          return b.score - a.score;
        }
      });
  }, [offers, filters]);

  if (isLoading) {
    return <Spinner className="w-8 h-8 text-blue-600" text="Chargement des offres en cours..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Impossible de charger les offres"
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & header with View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Offres de stage</h1>
          <p className="text-sm text-slate-500">
            Stages ciblés au Maroc, scorés en temps réel selon vos compétences et vos axes de recherche.
          </p>
        </div>

        {/* View Mode Toggle: Cards (Default) vs Table */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => handleViewModeChange('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'cards'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cartes</span>
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Tableau</span>
          </button>
        </div>
      </div>

      {/* KPI row */}
      <KpiRow {...kpis} />

      {/* Filter toolbar */}
      <OfferFilters
        filters={filters}
        onChange={setFilters}
        sources={uniqueSources}
      />

      {/* Offers Display: Default Cards vs Table */}
      {viewMode === 'cards' ? (
        <OfferCardGrid
          offers={filteredOffers}
          onSelect={setSelectedOffer}
          onResetFilters={() =>
            setFilters({
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
            })
          }
        />
      ) : (
        <OfferTable
          offers={filteredOffers}
          onSelect={setSelectedOffer}
          onResetFilters={() =>
            setFilters({
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
            })
          }
        />
      )}

      {/* Offer detail & application modal */}
      <OfferModal
        offer={selectedOffer}
        isOpen={!!selectedOffer}
        onClose={() => setSelectedOffer(null)}
      />
    </div>
  );
}
