import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import type { ApplicationItem } from '../../types/api';
import { STATUSES, ALL_KANBAN_COLS } from '../../lib/constants';
import {
  TrendingUp,
  Award,
  Calendar,
  Send,
  MapPin,
  Building2,
  PieChart as PieChartIcon,
  Video,
  Layers,
  Filter,
} from 'lucide-react';
import { srcLabel } from '../../lib/format';

interface ApplicationsChartsProps {
  apps: ApplicationItem[];
  onSwitchView?: (view: 'kanban' | 'table' | 'calendar' | 'charts') => void;
  onAddExternal?: () => void;
}

// Design system status colors
const STATUS_COLORS: Record<string, string> = {
  a_postuler: '#94a3b8', // slate-400
  envoyee: '#3b82f6',    // blue-500
  relance: '#6366f1',    // indigo-500
  entretien: '#f59e0b',  // amber-500
  offre: '#10b981',      // emerald-500
  refus: '#f43f5e',      // rose-500
  abandon: '#cbd5e1',    // slate-300
};

export function ApplicationsCharts({ apps, onSwitchView, onAddExternal }: ApplicationsChartsProps) {
  const [period, setPeriod] = useState<'all' | '30d' | '90d' | 'month'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'internal' | 'external'>('all');

  // Filtered dataset based on period & source
  const filteredApps = useMemo(() => {
    const now = Date.now();
    return apps.filter((a) => {
      // Source filter
      if (sourceFilter === 'internal' && a.external) return false;
      if (sourceFilter === 'external' && !a.external) return false;

      // Date resolution
      const rawDate = a.applied_at || a.ext_date || a.updated_at;
      if (!rawDate) return period === 'all';

      const itemTime = new Date(rawDate).getTime();
      if (isNaN(itemTime)) return period === 'all';

      if (period === '30d') {
        return now - itemTime <= 30 * 864e5;
      }
      if (period === '90d') {
        return now - itemTime <= 90 * 864e5;
      }
      if (period === 'month') {
        const d = new Date(itemTime);
        const cur = new Date();
        return d.getMonth() === cur.getMonth() && d.getFullYear() === cur.getFullYear();
      }
      return true;
    });
  }, [apps, period, sourceFilter]);

  // 1. High-level Conversion Funnel KPIs
  const stats = useMemo(() => {
    const total = filteredApps.length;
    const aPostuler = filteredApps.filter((a) => a.status === 'a_postuler').length;
    const envoyees = filteredApps.filter((a) =>
      ['envoyee', 'relance', 'entretien', 'offre', 'refus', 'abandon'].includes(a.status)
    ).length;
    const relances = filteredApps.filter((a) => a.status === 'relance').length;
    const entretiens = filteredApps.filter((a) => ['entretien', 'offre'].includes(a.status)).length;
    const offres = filteredApps.filter((a) => a.status === 'offre').length;
    const refus = filteredApps.filter((a) => a.status === 'refus').length;

    const enCours = filteredApps.filter((a) =>
      ['envoyee', 'relance', 'entretien'].includes(a.status)
    ).length;

    // Rates
    const interviewRate = envoyees > 0 ? Math.round((entretiens / envoyees) * 100) : 0;
    const offerRate = envoyees > 0 ? Math.round((offres / envoyees) * 100) : 0;
    const responseRate = envoyees > 0 ? Math.round(((entretiens + refus) / envoyees) * 100) : 0;

    return {
      total,
      aPostuler,
      envoyees,
      relances,
      entretiens,
      offres,
      refus,
      enCours,
      interviewRate,
      offerRate,
      responseRate,
    };
  }, [filteredApps]);

  // 2. Conversion Funnel Chart Data
  const funnelData = useMemo(() => {
    return [
      {
        stage: 'À postuler',
        count: stats.aPostuler,
        fill: STATUS_COLORS.a_postuler,
        description: 'Préparées',
      },
      {
        stage: 'Envoyées',
        count: stats.envoyees,
        fill: STATUS_COLORS.envoyee,
        description: 'Soumises',
      },
      {
        stage: 'Relancées',
        count: stats.relances,
        fill: STATUS_COLORS.relance,
        description: 'Suivies',
      },
      {
        stage: 'Entretiens',
        count: stats.entretiens,
        fill: STATUS_COLORS.entretien,
        description: 'Décrochés',
      },
      {
        stage: 'Offres',
        count: stats.offres,
        fill: STATUS_COLORS.offre,
        description: 'Succès !',
      },
    ];
  }, [stats]);

  // 3. Status Distribution (Donut)
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredApps.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });

    return ALL_KANBAN_COLS.map((col) => ({
      name: col.title,
      key: col.id,
      value: counts[col.id] || 0,
      color: STATUS_COLORS[col.id] || '#94a3b8',
    })).filter((item) => item.value > 0);
  }, [filteredApps]);

  // 4. Temporal Trend (Monthly applications)
  const timelineData = useMemo(() => {
    const buckets: Record<string, { month: string; raw: string; count: number; entretiens: number }> = {};

    filteredApps.forEach((a) => {
      const rawDate = a.applied_at || a.ext_date || a.updated_at;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;

      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

      if (!buckets[yearMonth]) {
        buckets[yearMonth] = { month: label, raw: yearMonth, count: 0, entretiens: 0 };
      }
      buckets[yearMonth].count += 1;
      if (['entretien', 'offre'].includes(a.status)) {
        buckets[yearMonth].entretiens += 1;
      }
    });

    return Object.values(buckets).sort((a, b) => a.raw.localeCompare(b.raw));
  }, [filteredApps]);

  // 5. Geographic breakdown (Top Cities)
  const cityData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredApps.forEach((a) => {
      const city = a.city?.trim() || 'Non spécifié';
      counts[city] = (counts[city] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, count]) => ({ name, count }));
  }, [filteredApps]);

  // 6. Source & Channel breakdown
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredApps.forEach((a) => {
      const s = a.external ? (a.source === 'externe' ? 'Candidature externe' : a.source) : srcLabel(a.source);
      counts[s] = (counts[s] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [filteredApps]);

  // 7. Interview Formats
  const interviewData = useMemo(() => {
    const appsWithInterview = filteredApps.filter((a) => a.interview_at || a.status === 'entretien');
    const counts: Record<string, { count: number }> = {
      visio: { count: 0 },
      presentiel: { count: 0 },
      telephone: { count: 0 },
    };

    appsWithInterview.forEach((a) => {
      const t = a.interview_type || 'visio';
      if (counts[t]) {
        counts[t].count += 1;
      } else {
        counts.visio.count += 1;
      }
    });

    return [
      { name: 'Visioconférence', count: counts.visio.count, fill: '#3b82f6' },
      { name: 'Présentiel', count: counts.presentiel.count, fill: '#10b981' },
      { name: 'Téléphone', count: counts.telephone.count, fill: '#8b5cf6' },
    ].filter((item) => item.count > 0);
  }, [filteredApps]);

  // 8. Top Companies
  const topCompanies = useMemo(() => {
    const counts: Record<string, { count: number; lastStatus: string }> = {};
    filteredApps.forEach((a) => {
      const c = a.company?.trim() || 'Inconnue';
      if (!counts[c]) {
        counts[c] = { count: 0, lastStatus: a.status };
      }
      counts[c].count += 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([company, data]) => ({ company, ...data }));
  }, [filteredApps]);

  return (
    <div className="space-y-6">
      {/* Filter and Period Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filtres analytiques :</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Period selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setPeriod('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                period === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tout
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                period === 'month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ce mois
            </button>
            <button
              onClick={() => setPeriod('30d')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                period === '30d' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30j
            </button>
            <button
              onClick={() => setPeriod('90d')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                period === '90d' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              90j
            </button>
          </div>

          {/* Source selector */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as 'all' | 'internal' | 'external')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Toutes sources</option>
            <option value="internal">Internes (Stage Radar)</option>
            <option value="external">Externes (LinkedIn, etc.)</option>
          </select>
        </div>
      </div>

      {/* KPI Highlights Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total & Active */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Candidatures</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            <span>{stats.enCours} en cours d'examen</span>
          </div>
        </div>

        {/* Interview Conversion */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taux d'entretien</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-2">{stats.interviewRate}%</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {stats.entretiens} entretien(s) sur {stats.envoyees} envoyée(s)
          </div>
        </div>

        {/* Global Response Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taux de réponse</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-2">{stats.responseRate}%</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {stats.entretiens + stats.refus} retour(s) reçu(s)
          </div>
        </div>

        {/* Success / Offers Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Offres obtenues</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">{stats.offres}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {stats.offerRate}% de concrétisation
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Chart 1: Conversion Pipeline Funnel */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Entonnoir de conversion</span>
              </h2>
              <p className="text-xs text-slate-500">Progression des candidatures à travers chaque étape clé.</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(val: number) => [`${val} postulation(s)`, 'Nombre']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Funnel conversion percentages badges */}
          <div className="grid grid-cols-5 gap-1 pt-3 border-t border-slate-100 text-center">
            {funnelData.map((f) => (
              <div key={f.stage} className="p-1.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 truncate">{f.stage}</div>
                <div className="text-xs font-black text-slate-800 mt-0.5">{f.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Status Distribution (Donut) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-600" />
                <span>Répartition par statut</span>
              </h2>
              <p className="text-xs text-slate-500">Vue d'ensemble de l'état actuel de vos démarches.</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number, name: string) => [
                      `${val} (${Math.round((val / (stats.total || 1)) * 100)}%)`,
                      name,
                    ]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Aucune donnée à afficher pour cette sélection.
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Temporal Trend / Applications Over Time */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Activité & Rythme de postulation</span>
              </h2>
              <p className="text-xs text-slate-500">
                Nombre de candidatures transmises par période pour maintenir votre dynamique.
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 15, right: 15, left: -20, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Candidatures envoyées"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                  <Area
                    type="monotone"
                    dataKey="entretiens"
                    name="Entretiens & Offres"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorInterviews)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Pas assez de données temporelles pour tracer la courbe d'activité.
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: Geographic Distribution */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Répartition géographique</span>
              </h2>
              <p className="text-xs text-slate-500">Villes les plus ciblées par vos démarches.</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {cityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cityData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: number) => [`${val} candidature(s)`, 'Total']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Aucune ville renseignée.
              </div>
            )}
          </div>
        </div>

        {/* Chart 5: Channels & Interview Types */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-emerald-600" />
              <span>Formats d'entretiens & Canaux</span>
            </h2>
            <p className="text-xs text-slate-500">Moyens de contact et plateformes sources.</p>
          </div>

          {/* Interview formats bar */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700">Modalités d'entretien</span>
            <div className="grid grid-cols-3 gap-2">
              {interviewData.length > 0 ? (
                interviewData.map((item) => (
                  <div key={item.name} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-[11px] font-semibold text-slate-500 truncate">{item.name}</div>
                    <div className="text-lg font-black text-slate-900 mt-1">{item.count}</div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 p-3 bg-slate-50 rounded-2xl text-center text-xs text-slate-400">
                  Aucun entretien planifié pour le moment.
                </div>
              )}
            </div>
          </div>

          {/* Top Sources */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700">Top canaux de recrutement</span>
            <div className="space-y-1.5">
              {sourceData.slice(0, 4).map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <span className="font-semibold text-slate-700 truncate">{s.name}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 font-bold text-[11px]">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Companies targeted */}
        {topCompanies.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-700" />
                <span>Entreprises les plus sollicitées</span>
              </h2>
              {onSwitchView && (
                <button
                  onClick={() => onSwitchView('table')}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Voir dans le tableau →
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {topCompanies.map((c) => (
                <div key={c.company} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 text-xs truncate" title={c.company}>
                    {c.company}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{c.count} offre(s)</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                        STATUSES[c.lastStatus as keyof typeof STATUSES]?.cls || 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {STATUSES[c.lastStatus as keyof typeof STATUSES]?.label || c.lastStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Helpful Action Footer */}
      {filteredApps.length === 0 && (
        <div className="bg-blue-50/60 rounded-3xl border border-blue-200/80 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-sm">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Aucune candidature enregistrée pour cette période</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Commencez à suivre vos démarches depuis la liste des offres ou ajoutez vos candidatures externes pour alimenter vos statistiques.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {onAddExternal && (
              <button
                onClick={onAddExternal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                + Ajouter une candidature externe
              </button>
            )}
            {onSwitchView && (
              <button
                onClick={() => onSwitchView('kanban')}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition"
              >
                Aller au Kanban
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
