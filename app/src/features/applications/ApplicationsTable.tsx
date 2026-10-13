import React, { useState } from 'react';
import type { ApplicationItem } from '../../types/api';
import { ApplicationRow } from './ApplicationRow';
import { EmptyState } from '../../components/feedback/EmptyState';

interface ApplicationsTableProps {
  apps: ApplicationItem[];
  onEdit: (app: ApplicationItem) => void;
  onScheduleInterview: (app: ApplicationItem) => void;
  onAddExternal: () => void;
}

export function ApplicationsTable({
  apps,
  onEdit,
  onScheduleInterview,
  onAddExternal,
}: ApplicationsTableProps) {
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const totalPages = Math.max(1, Math.ceil(apps.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const currentApps = apps.slice(startIndex, startIndex + pageSize);

  function handlePageChange(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 300, behavior: 'smooth' });
    }
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
  }

  if (apps.length === 0) {
    return (
      <EmptyState
        icon="📝"
        title="Aucune candidature trouvée"
        description="Vous n'avez pas encore de candidature correspondant à ces critères."
        action={{
          label: '+ Ajouter une candidature externe',
          onClick: onAddExternal,
        }}
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Header Controls */}
      <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="font-semibold text-slate-700">
          <span className="text-blue-600 font-bold">{apps.length}</span> candidature{apps.length > 1 ? 's' : ''}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Lignes par page :</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
              <th className="py-2.5 pl-4 pr-3">Type</th>
              <th className="py-2.5 px-3">Poste & Entreprise</th>
              <th className="py-2.5 px-3">Statut</th>
              <th className="py-2.5 px-3 hidden sm:table-cell">Envoyée</th>
              <th className="py-2.5 px-3">Entretien</th>
              <th className="py-2.5 px-3 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentApps.map((app) => (
              <ApplicationRow
                key={app.app_id}
                app={app}
                onEdit={onEdit}
                onScheduleInterview={onScheduleInterview}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-xs text-slate-500">
            Affichage de <span className="font-medium text-slate-700">{startIndex + 1}</span> à{' '}
            <span className="font-medium text-slate-700">{Math.min(startIndex + pageSize, apps.length)}</span> sur{' '}
            <span className="font-medium text-slate-700">{apps.length}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage === 1}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
            >
              Précédent
            </button>

            <div className="flex items-center gap-1 mx-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-xs text-slate-400">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(p)}
                      className={`w-7 h-7 text-xs rounded-lg font-bold transition ${
                        p === safePage
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
            </div>

            <button
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage === totalPages}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
