import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useMatches } from '../offers/api';
import { useAuth } from '../auth/AuthProvider';
import { Spinner } from '../../components/feedback/Spinner';
import { ErrorState } from '../../components/feedback/ErrorState';
import { srcLabel } from '../../lib/format';

export function MarketPage() {
  const { data: offers = [], isLoading, error, refetch } = useMatches();
  const { profile } = useAuth();

  // 1. Offres par ville
  const cityData = useMemo(() => {
    const counts: Record<string, number> = {};
    offers.forEach((o) => {
      const city = o.modality === 'Télétravail' ? 'Télétravail' : o.city || 'Non précisé';
      counts[city] = (counts[city] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [offers]);

  // 2. Offres par source
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    offers.forEach((o) => {
      const src = srcLabel(o.source);
      counts[src] = (counts[src] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [offers]);

  // 3. Vos priorités vs demande
  const axesComparisonData = useMemo(() => {
    if (!profile?.axes || profile.axes.length === 0) return [];

    const axes = profile.axes;
    const wSum = axes.reduce((a, x) => a + (Number(x.weight) || 0), 0) || 1;

    const demandCounts = axes.map((x) =>
      offers.reduce((acc, o) => acc + ((o.axis_hits || {})[x.label] || 0), 0)
    );
    const dSum = demandCounts.reduce((a, b) => a + b, 0) || 1;

    return axes.map((x, i) => ({
      axis: x.label,
      priorite: Math.round((100 * (Number(x.weight) || 0)) / wSum),
      demande: Math.round((100 * demandCounts[i]) / dSum),
    }));
  }, [offers, profile]);

  // 4. Top compétences
  const topSkillsData = useMemo(() => {
    const counts: Record<string, number> = {};
    offers.forEach((o) => {
      (o.matched || []).forEach((k) => {
        counts[k] = (counts[k] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);
  }, [offers]);

  if (isLoading) {
    return <Spinner className="w-8 h-8 text-blue-600" text="Analyse du marché en cours..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Impossible d'analyser le marché"
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Marché & tendances</h1>
        <p className="text-sm text-slate-500">
          Statistiques dynamiques calculées sur les <span className="font-bold text-slate-800">{offers.length}</span> offres
          qui correspondent à votre profil.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Offres par ville */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">Offres par ville</h2>
          <p className="text-xs text-slate-500 mb-4">Top des villes les plus représentées.</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: number) => [`${val} offres`, 'Nombre']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Offres par source */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">Offres par source</h2>
          <p className="text-xs text-slate-500 mb-4">Répartition des plateformes d'origine.</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: number) => [`${val} offres`, 'Nombre']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vos priorités vs la demande */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-bold text-slate-900 mb-1">Vos priorités vs la demande du marché</h2>
          <p className="text-xs text-slate-500 mb-4">
            Comparaison entre la part de chaque axe dans vos pondérations personnelles et sa part réelle dans les compétences demandées par les recruteurs.
          </p>

          <div className="h-72 w-full">
            {axesComparisonData.length >= 3 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={axesComparisonData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 10 }} />
                  <Radar name="Mes priorités (%)" dataKey="priorite" stroke="#2563eb" fill="#2563eb" fillOpacity={0.25} />
                  <Radar name="Demande marché (%)" dataKey="demande" stroke="#0d9488" fill="#0d9488" fillOpacity={0.25} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={axesComparisonData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                  <XAxis dataKey="axis" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="priorite" name="Mes priorités (%)" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="demande" name="Demande marché (%)" fill="#0d9488" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Compétences les plus demandées */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Compétences les plus demandées (parmi vos mots-clés)
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Occurrence des technologies et compétences trouvées dans les descriptions d'offres.
          </p>

          <div className="flex flex-wrap gap-2">
            {topSkillsData.length === 0 ? (
              <span className="text-sm text-slate-400">Aucune compétence détectée</span>
            ) : (
              topSkillsData.map(([kw, count]) => (
                <span
                  key={kw}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 transition shadow-2xs"
                >
                  <span>{kw}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black">
                    {count}
                  </span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
