import React from 'react';
import type { ApplicationItem } from '../../types/api';
import type { ApplicationStatus } from '../../lib/constants';
import { STATUSES } from '../../lib/constants';
import { formatDate, interviewCountdown } from '../../lib/format';
import { useUpdateApplicationStatus } from './api';

interface ApplicationRowProps {
  app: ApplicationItem;
  onEdit: (app: ApplicationItem) => void;
  onScheduleInterview: (app: ApplicationItem) => void;
}

export function ApplicationRow({ app, onEdit, onScheduleInterview }: ApplicationRowProps) {
  const updateStatus = useUpdateApplicationStatus();
  const countdown = interviewCountdown(app.interview_at);

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
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
    <tr className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-b-0 text-xs">
      {/* Type badge */}
      <td className="py-3.5 pl-4 pr-3 align-middle whitespace-nowrap">
        {app.external ? (
          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-purple-100 text-purple-700">
            EXTERNE
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-100 text-blue-700">
            INTERNE
          </span>
        )}
      </td>

      {/* Title & Company */}
      <td className="py-3.5 px-3 align-middle max-w-xs">
        <div
          onClick={() => onEdit(app)}
          className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer truncate text-sm"
          title={app.title}
        >
          {app.title}
        </div>
        <div className="text-slate-500 font-medium text-xs mt-0.5 flex items-center gap-1.5">
          <span className="font-semibold text-slate-700">{app.company}</span>
          {app.city && (
            <>
              <span>•</span>
              <span>{app.city}</span>
            </>
          )}
        </div>
      </td>

      {/* In-place Status Select */}
      <td className="py-3.5 px-3 align-middle whitespace-nowrap">
        <select
          value={app.status}
          onChange={handleStatusChange}
          disabled={updateStatus.isPending}
          className={`px-2.5 py-1 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs ${
            STATUSES[app.status]?.cls || 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {Object.entries(STATUSES).map(([id, info]) => (
            <option key={id} value={id}>
              {info.label}
            </option>
          ))}
        </select>
      </td>

      {/* Applied At */}
      <td className="py-3.5 px-3 align-middle text-slate-500 whitespace-nowrap hidden sm:table-cell">
        {formatDate(app.applied_at || app.ext_date)}
      </td>

      {/* Interview & Countdown */}
      <td className="py-3.5 px-3 align-middle whitespace-nowrap">
        {app.interview_at ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onScheduleInterview(app)}
              className="text-left group cursor-pointer"
            >
              <div className="font-bold text-slate-800 text-[11px] group-hover:text-blue-600 flex items-center gap-1">
                <span>
                  {app.interview_type === 'visio' ? '💻' : app.interview_type === 'presentiel' ? '🏢' : '📞'}
                </span>
                <span>{formatDate(app.interview_at)}</span>
              </div>
              {countdown && (
                <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] ${countdown.cls} mt-0.5`}>
                  {countdown.label}
                </span>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={() => onScheduleInterview(app)}
            className="text-[11px] text-slate-400 hover:text-amber-700 hover:bg-amber-50 px-2 py-0.5 rounded-lg border border-dashed border-slate-200 transition"
          >
            + Planifier
          </button>
        )}
      </td>

      {/* Actions */}
      <td className="py-3.5 px-3 align-middle text-right pr-4 whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          {app.url && (
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Ouvrir le lien de l'offre"
            >
              ↗
            </a>
          )}
          <button
            onClick={() => onEdit(app)}
            className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-600 hover:bg-slate-100 transition text-[11px]"
          >
            Détails
          </button>
        </div>
      </td>
    </tr>
  );
}
