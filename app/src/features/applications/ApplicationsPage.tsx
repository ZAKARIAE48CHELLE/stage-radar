import { useMemo, useState } from 'react';
import { useApplications } from './api';
import { AppKpis } from './AppKpis';
import { ApplicationsTable } from './ApplicationsTable';
import { KanbanPipeline } from './KanbanPipeline';
import { KanbanColSelect } from './KanbanColSelect';
import { InterviewCalendar } from './InterviewCalendar';
import { InterviewModal } from './InterviewModal';
import { ExternalAppModal } from './ExternalAppModal';
import { OfferModal } from '../offers/OfferModal';
import { Spinner } from '../../components/feedback/Spinner';
import { ErrorState } from '../../components/feedback/ErrorState';
import { exportAppsExcel } from './exportExcel';
import { ALL_KANBAN_COLS, STATUSES } from '../../lib/constants';
import { norm } from '../../lib/text';
import type { ApplicationItem, MatchOffer } from '../../types/api';
import { useMatches } from '../offers/api';

export function ApplicationsPage() {
  const { data: apps = [], isLoading, error, refetch } = useApplications();
  const { data: matches = [] } = useMatches();

  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'calendar'>('table');
  const [filterQuery, setFilterQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'internal' | 'external'>('all');

  // Kanban column visibility
  const [visibleCols, setVisibleCols] = useState<string[]>(ALL_KANBAN_COLS.map((c) => c.id));

  // Modals state
  const [selectedExternalApp, setSelectedExternalApp] = useState<ApplicationItem | null>(null);
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);

  const [selectedInterviewApp, setSelectedInterviewApp] = useState<ApplicationItem | null>(null);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);

  const [selectedOfferMatch, setSelectedOfferMatch] = useState<MatchOffer | null>(null);

  // Status counts
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    ALL_KANBAN_COLS.forEach((col) => {
      c[col.id] = 0;
    });
    apps.forEach((a) => {
      if (c[a.status] !== undefined) c[a.status]++;
    });
    return c;
  }, [apps]);

  const upcomingInterviewsCount = useMemo(() => {
    const now = Date.now() - 36e5;
    return apps.filter((a) => a.interview_at && new Date(a.interview_at).getTime() >= now).length;
  }, [apps]);

  // Filtered applications
  const filteredApps = useMemo(() => {
    const qNorm = norm(filterQuery);

    return apps.filter((a) => {
      if (qNorm) {
        const hay = norm([a.title, a.company, a.city, a.notes].join(' '));
        if (!hay.includes(qNorm)) return false;
      }
      if (filterStatus && a.status !== filterStatus) return false;
      if (filterType === 'internal' && a.external) return false;
      if (filterType === 'external' && !a.external) return false;
      return true;
    });
  }, [apps, filterQuery, filterStatus, filterType]);

  // Open appropriate detail modal on item click
  function handleEditApp(app: ApplicationItem) {
    if (app.external) {
      setSelectedExternalApp(app);
      setIsExternalModalOpen(true);
    } else if (app.offer_id) {
      // Find in matches or construct minimal MatchOffer
      const match = matches.find((m) => m.id === app.offer_id);
      if (match) {
        setSelectedOfferMatch(match);
      } else {
        setSelectedOfferMatch({
          id: app.offer_id,
          title: app.title,
          company: app.company,
          city: app.city,
          url: app.url,
          source: app.source,
          modality: '',
          date_posted: null,
          valid_through: app.valid_through,
          is_pfe: false,
          first_seen: '',
          also_on: [],
          score: 70,
          axis_hits: {},
          matched: [],
          app_status: app.status,
          app_updated: app.updated_at,
        });
      }
    }
  }

  function handleScheduleInterview(app: ApplicationItem) {
    setSelectedInterviewApp(app);
    setIsInterviewModalOpen(true);
  }

  function handleAddExternal() {
    setSelectedExternalApp(null);
    setIsExternalModalOpen(true);
  }

  if (isLoading) {
    return <Spinner className="w-8 h-8 text-blue-600" text="Chargement de vos candidatures..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Impossible de charger vos candidatures"
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mes candidatures</h1>
          <p className="text-sm text-slate-500">
            Suivi complet de vos démarches, relances et entretiens planifiés.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportAppsExcel(filteredApps)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5 shadow-sm"
          >
            <span>📊</span> Exporter Excel (.xlsx)
          </button>

          <button
            onClick={handleAddExternal}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-sm"
          >
            <span>➕</span> Ajouter externe
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <AppKpis
        counts={counts}
        total={apps.length}
        upcomingInterviewsCount={upcomingInterviewsCount}
      />

      {/* View Switcher & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* View Mode Buttons */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`py-1.5 px-2 sm:px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📋</span>
            <span>Tableau</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`py-1.5 px-2 sm:px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 ${
              viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📊</span>
            <span>Kanban</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`py-1.5 px-2 sm:px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 truncate ${
              viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📅</span>
            <span>Calendrier</span>
            {upcomingInterviewsCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            )}
          </button>
        </div>

        {/* Filter Inputs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Rechercher candidature..."
            className="w-full sm:w-44 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
          >
            <option value="">Tous statuts</option>
            {Object.entries(STATUSES).map(([id, info]) => (
              <option key={id} value={id}>
                {info.label}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'internal' | 'external')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
          >
            <option value="all">Tous types</option>
            <option value="internal">Internes</option>
            <option value="external">Externes</option>
          </select>
        </div>
      </div>

      {/* Active View Container */}
      {viewMode === 'table' && (
        <ApplicationsTable
          apps={filteredApps}
          onEdit={handleEditApp}
          onScheduleInterview={handleScheduleInterview}
          onAddExternal={handleAddExternal}
        />
      )}

      {viewMode === 'kanban' && (
        <div>
          <KanbanColSelect
            visibleCols={visibleCols}
            onChangeVisibleCols={setVisibleCols}
            counts={counts}
          />
          <KanbanPipeline
            apps={filteredApps}
            visibleCols={visibleCols}
            onEdit={handleEditApp}
            onScheduleInterview={handleScheduleInterview}
          />
        </div>
      )}

      {viewMode === 'calendar' && (
        <InterviewCalendar
          apps={filteredApps}
          onSelectInterview={handleScheduleInterview}
        />
      )}

      {/* Modals */}
      <ExternalAppModal
        app={selectedExternalApp}
        isOpen={isExternalModalOpen}
        onClose={() => {
          setIsExternalModalOpen(false);
          setSelectedExternalApp(null);
        }}
      />

      <InterviewModal
        app={selectedInterviewApp}
        isOpen={isInterviewModalOpen}
        onClose={() => {
          setIsInterviewModalOpen(false);
          setSelectedInterviewApp(null);
        }}
      />

      <OfferModal
        offer={selectedOfferMatch}
        isOpen={!!selectedOfferMatch}
        onClose={() => setSelectedOfferMatch(null)}
      />
    </div>
  );
}
