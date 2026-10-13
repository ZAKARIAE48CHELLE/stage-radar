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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {kpis.map((k, i) => (
        <div
          key={i}
          className={`${k.bg} border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center justify-between`}
        >
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{k.label}</div>
            <div className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{k.sub}</div>
          </div>
          <div className="text-2xl opacity-80">{k.icon}</div>
        </div>
      ))}
    </div>
  );
}
