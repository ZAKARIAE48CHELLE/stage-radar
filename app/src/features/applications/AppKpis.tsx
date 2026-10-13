import { STATUSES } from '../../lib/constants';

interface AppKpisProps {
  counts: Record<string, number>;
  total: number;
  upcomingInterviewsCount: number;
}

export function AppKpis({ counts, total, upcomingInterviewsCount }: AppKpisProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      {/* Total Tile */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total</div>
        <div className="text-xl font-black text-slate-900 mt-0.5">{total}</div>
        <div className="text-[10px] text-slate-400">
          {upcomingInterviewsCount > 0 ? `${upcomingInterviewsCount} entretien(s)` : 'suivies'}
        </div>
      </div>

      {/* 7 Status Tiles */}
      {Object.entries(STATUSES).map(([id, info]) => {
        const count = counts[id] || 0;
        return (
          <div
            key={id}
            className={`border rounded-xl p-3 shadow-2xs transition ${info.cls} bg-opacity-30`}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider truncate">{info.label}</div>
            <div className="text-xl font-black mt-0.5">{count}</div>
            <div className="text-[10px] opacity-75">
              {total > 0 ? `${Math.round((100 * count) / total)}%` : '0%'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
