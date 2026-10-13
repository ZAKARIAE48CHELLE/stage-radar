import React from 'react';
import { ALL_KANBAN_COLS } from '../../lib/constants';

interface KanbanColSelectProps {
  visibleCols: string[];
  onChangeVisibleCols: (cols: string[]) => void;
  counts: Record<string, number>;
}

export function KanbanColSelect({
  visibleCols,
  onChangeVisibleCols,
  counts,
}: KanbanColSelectProps) {
  function handlePresetChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === 'all') {
      onChangeVisibleCols(ALL_KANBAN_COLS.map((c) => c.id));
    } else if (val === 'active') {
      onChangeVisibleCols(['a_postuler', 'envoyee', 'relance', 'entretien', 'offre']);
    } else {
      onChangeVisibleCols([val]);
    }
  }

  function toggleCol(colId: string) {
    if (visibleCols.includes(colId)) {
      if (visibleCols.length > 1) {
        onChangeVisibleCols(visibleCols.filter((id) => id !== colId));
      }
    } else {
      onChangeVisibleCols([...visibleCols, colId]);
    }
  }

  // Determine current preset value for the select
  let currentPreset = 'custom';
  if (visibleCols.length === ALL_KANBAN_COLS.length) {
    currentPreset = 'all';
  } else if (
    visibleCols.length === 5 &&
    ['a_postuler', 'envoyee', 'relance', 'entretien', 'offre'].every((id) => visibleCols.includes(id))
  ) {
    currentPreset = 'active';
  } else if (visibleCols.length === 1) {
    currentPreset = visibleCols[0];
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800">Affichage du Kanban :</span>
          <select
            value={currentPreset}
            onChange={handlePresetChange}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Toutes les 7 colonnes</option>
            <option value="active">Pipeline actif (5 étapes)</option>
            <option disabled>──────────</option>
            {ALL_KANBAN_COLS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} Colonne {c.title}
              </option>
            ))}
            {currentPreset === 'custom' && <option value="custom">Sélection personnalisée</option>}
          </select>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Cliquez sur une puce pour afficher ou masquer une colonne
        </div>
      </div>

      {/* Toggle Chips with live counts */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
        {ALL_KANBAN_COLS.map((col) => {
          const isVisible = visibleCols.includes(col.id);
          const count = counts[col.id] || 0;

          return (
            <button
              key={col.id}
              type="button"
              onClick={() => toggleCol(col.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-2xs ${
                isVisible
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 opacity-60'
              }`}
            >
              <span>{col.icon}</span>
              <span>{col.title}</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isVisible
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
