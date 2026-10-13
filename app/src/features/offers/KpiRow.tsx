interface KpiRowProps {
  total: number;
  paidCount: number;
  freshCount: number;
  topCount: number;
}

export function KpiRow({ total, paidCount, freshCount, topCount }: KpiRowProps) {
  const kpis = [
    { label: 'Offres ciblées', value: total, sub: 'selon votre profil', color: 'text-slate-900', bg: 'bg-white', icon: '🎯' },
    { label: 'Rémunérées', value: paidCount, sub: 'gratification détectée', color: 'text-emerald-700', bg: 'bg-emerald-50/50', icon: '💰' },
    { label: 'Nouvelles 48h', value: freshCount, sub: 'récemment indexées', color: 'text-blue-700', bg: 'bg-blue-50/50', icon: '⚡' },
    { label: 'Match ≥ 75%', value: topCount, sub: 'très forte affinité', color: 'text-amber-700', bg: 'bg-amber-50/50', icon: '🔥' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
      {kpis.map((k, i) => (
        <div
          key={i}
          className={`${k.bg} border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-2xs flex items-center justify-between`}
        >
          <div>
            <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">{k.label}</div>
            <div className={`text-xl sm:text-2xl font-black mt-0.5 sm:mt-1 ${k.color}`}>{k.value}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate hidden sm:block">{k.sub}</div>
          </div>
          <div className="text-xl sm:text-2xl opacity-80 shrink-0">{k.icon}</div>
        </div>
      ))}
    </div>
  );
}
