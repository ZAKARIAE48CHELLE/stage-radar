import React, { useState } from 'react';
import type { ApplicationItem } from '../../types/api';
import type { ApplicationStatus } from '../../lib/constants';
import { STATUSES } from '../../lib/constants';
import { formatDate, interviewCountdown } from '../../lib/format';
import { ApplicationRow } from './ApplicationRow';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useUpdateApplicationStatus } from './api';
import { FileText, Video, Building2, Phone, Calendar } from 'lucide-react';

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
  const updateStatus = useUpdateApplicationStatus();

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
        icon={<FileText className="w-8 h-8 text-slate-400" />}
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Top Header Controls */}
      <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-200 flex items-center justify-between gap-3 text-sm">
        <div className="font-semibold text-slate-700 text-xs sm:text-sm">
          <span className="text-blue-600 font-bold">{apps.length}</span> candidature{apps.length > 1 ? 's' : ''}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="hidden sm:inline">Lignes par page :</span>
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

      {/* Mobile Card List (< sm screens) */}
      <div className="sm:hidden divide-y divide-slate-100">
        {currentApps.map((app) => {
          const countdown = interviewCountdown(app.interview_at);

          return (
            <div key={app.app_id} className="p-3.5 space-y-2.5">
              {/* Header: Type + Status */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {app.external ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                      EXTERNE
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                      INTERNE
                    </span>
                  )}
                  {app.applied_at && (
                    <span className="text-[11px] text-slate-400">
                      {formatDate(app.applied_at || app.ext_date)}
                    </span>
                  )}
                </div>

                {/* In-place status selector */}
                <select
                  value={app.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as ApplicationStatus;
                    updateStatus.mutate({
                      appId: app.app_id,
                      status: newStatus,
                      appliedAt:
                        ['envoyee', 'relance', 'entretien'].includes(newStatus) && !app.applied_at
                          ? new Date().toISOString().slice(0, 10)
                          : undefined,
                    });
                  }}
                  disabled={updateStatus.isPending}
                  className={`px-2.5 py-1 rounded-lg border font-bold text-xs focus:outline-none shadow-2xs ${
                    STATUSES[app.status]?.cls || 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {Object.entries(STATUSES).map(([id, info]) => (
                    <option key={id} value={id}>
                      {info.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Company */}
              <div
                onClick={() => onEdit(app)}
                className="cursor-pointer active:text-blue-600 transition"
              >
                <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                  {app.title}
                </h3>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  <span className="font-semibold text-slate-700">{app.company}</span>
                  {app.city && <span> • {app.city}</span>}
                </div>
              </div>

              {/* Interview banner if scheduled */}
              {app.interview_at && (
                <div
                  onClick={() => onScheduleInterview(app)}
                  className="p-2 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 font-bold text-amber-950 text-[11px]">
                    {app.interview_type === 'visio' ? (
                      <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    ) : app.interview_type === 'presentiel' ? (
                      <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    ) : (
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                    <span>Entretien : {formatDate(app.interview_at)}</span>
                  </div>
                  {countdown && (
                    <span className={`px-2 py-0.2 rounded-full text-[10px] ${countdown.cls}`}>
                      {countdown.label}
                    </span>
                  )}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-1 text-xs">
                {!app.interview_at ? (
                  <button
                    onClick={() => onScheduleInterview(app)}
                    className="text-[11px] text-amber-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>Planifier entretien</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  {app.url && (
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 text-[11px] font-medium"
                    >
                      Lien ↗
                    </a>
                  )}
                  <button
                    onClick={() => onEdit(app)}
                    className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-bold"
                  >
                    Détails
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table (>= sm screens) */}
      <div className="hidden sm:block overflow-x-auto">
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
        <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">{startIndex + 1}</span>-
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
                      <span className="px-0.5 text-xs text-slate-400">...</span>
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
