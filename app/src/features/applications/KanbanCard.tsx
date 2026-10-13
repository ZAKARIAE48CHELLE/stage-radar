import React from 'react';
import type { ApplicationItem } from '../../types/api';
import type { ApplicationStatus } from '../../lib/constants';
import { STATUSES } from '../../lib/constants';
import { formatDate, interviewCountdown } from '../../lib/format';
import { useUpdateApplicationStatus } from './api';

interface KanbanCardProps {
  app: ApplicationItem;
  onEdit: (app: ApplicationItem) => void;
  onScheduleInterview: (app: ApplicationItem) => void;
  isWide?: boolean;
}

export function KanbanCard({
  app,
  onEdit,
  onScheduleInterview,
  isWide = false,
}: KanbanCardProps) {
  const updateStatus = useUpdateApplicationStatus();
  const countdown = interviewCountdown(app.interview_at);

  function handleMoveStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as ApplicationStatus;
    updateStatus.mutate({
      appId: app.app_id,
      status: newStatus,
      appliedAt:
        ['envoyee', 'relance', 'entretien'].includes(newStatus) && !app.applied_at
          ? new Date().toISOString().slice(0, 10)
          : undefined,
    });
  }

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-md transition group ${
        isWide ? 'max-w-xl mx-auto' : ''
      }`}
    >
      {/* Top badges */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1">
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
            <span className="text-[10px] text-slate-400 font-medium">
              Envoyé le {formatDate(app.applied_at)}
            </span>
          )}
        </div>

        {app.url && (
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-700 text-xs"
            title="Lien externe"
          >
            ↗
          </a>
        )}
      </div>

      {/* Title & Company */}
      <div
        onClick={() => onEdit(app)}
        className="font-bold text-slate-800 text-sm group-hover:text-blue-600 cursor-pointer line-clamp-2 leading-tight"
      >
        {app.title}
      </div>
      <div className="text-xs text-slate-500 font-medium mt-1">
        <span className="text-slate-700 font-semibold">{app.company}</span>
        {app.city && <span> • {app.city}</span>}
      </div>

      {/* Notes preview */}
      {app.notes && (
        <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100 line-clamp-2 italic">
          "{app.notes}"
        </div>
      )}

      {/* Interview alert if present */}
      {app.interview_at && (
        <div className="mt-2.5 p-2 bg-amber-50/90 rounded-lg border border-amber-200 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-950">
            <span>
              {app.interview_type === 'visio' ? '💻' : app.interview_type === 'presentiel' ? '🏢' : '📞'}
            </span>
            <span>{formatDate(app.interview_at)}</span>
          </div>
          {countdown && (
            <span className={`px-2 py-0.2 rounded-full text-[10px] ${countdown.cls}`}>
              {countdown.label}
            </span>
          )}
        </div>
      )}

      {/* Bottom Footer: Status Mover & Quick Schedule */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Déplacer :</span>
          <select
            value={app.status}
            onChange={handleMoveStatus}
            disabled={updateStatus.isPending}
            className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Object.entries(STATUSES).map(([id, info]) => (
              <option key={id} value={id}>
                {info.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => onScheduleInterview(app)}
          className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1"
          title="Planifier ou modifier l'entretien"
        >
          <span>🎤</span>
        </button>
      </div>
    </div>
  );
}
