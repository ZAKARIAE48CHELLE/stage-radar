import type { ApplicationItem } from '../../types/api';
import { ALL_KANBAN_COLS } from '../../lib/constants';
import { KanbanCard } from './KanbanCard';

interface KanbanPipelineProps {
  apps: ApplicationItem[];
  visibleCols: string[];
  onEdit: (app: ApplicationItem) => void;
  onScheduleInterview: (app: ApplicationItem) => void;
}

export function KanbanPipeline({
  apps,
  visibleCols,
  onEdit,
  onScheduleInterview,
}: KanbanPipelineProps) {
  const activeCols = ALL_KANBAN_COLS.filter((c) => visibleCols.includes(c.id));
  const isSingleCol = activeCols.length === 1;
  const isTwoCols = activeCols.length === 2;

  // Group apps by status
  const appsByStatus: Record<string, ApplicationItem[]> = {};
  ALL_KANBAN_COLS.forEach((c) => {
    appsByStatus[c.id] = [];
  });
  apps.forEach((a) => {
    if (appsByStatus[a.status]) {
      appsByStatus[a.status].push(a);
    }
  });

  return (
    <div
      className={`pb-6 ${
        isSingleCol
          ? 'max-w-xl mx-auto'
          : isTwoCols
          ? 'grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto'
          : 'flex gap-3 sm:gap-4 overflow-x-auto pb-4 scroll items-start snap-x snap-mandatory'
      }`}
    >
      {activeCols.map((col) => {
        const colApps = appsByStatus[col.id] || [];

        return (
          <div
            key={col.id}
            className={`flex flex-col bg-slate-100/70 border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 snap-center ${
              isSingleCol
                ? 'w-full'
                : isTwoCols
                ? 'w-full'
                : 'w-[88vw] sm:w-auto sm:min-w-[280px] sm:max-w-[320px] shrink-0'
            }`}
          >
            {/* Column Header */}
            <div
              className={`px-3 py-2 rounded-xl flex items-center justify-between mb-2.5 sm:mb-3 font-bold text-xs shadow-2xs ${col.headerCls}`}
            >
              <div className="flex items-center gap-1.5">
                <span>{col.icon}</span>
                <span>{col.title}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/70 text-slate-800 text-[10px] font-black">
                {colApps.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="flex-1 space-y-2.5 sm:space-y-3 min-h-[100px] overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
              {colApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  <span>Aucune candidature</span>
                </div>
              ) : (
                colApps.map((app) => (
                  <KanbanCard
                    key={app.app_id}
                    app={app}
                    onEdit={onEdit}
                    onScheduleInterview={onScheduleInterview}
                    isWide={isSingleCol}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
