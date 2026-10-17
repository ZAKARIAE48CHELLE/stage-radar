export function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function daysAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(String(iso).slice(0, 10) + 'T00:00:00Z').getTime()) / 864e5);
  return d <= 0 ? "aujourd'hui" : d === 1 ? 'hier' : `il y a ${d} j`;
}

export function interviewCountdown(iso: string | null | undefined): { label: string; cls: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;

  const diffMs = d.getTime() - Date.now();
  const diffDays = Math.round(diffMs / 864e5);
  const diffHours = Math.round(diffMs / 36e5);

  if (diffMs < -36e5) {
    return { label: 'Passé', cls: 'bg-slate-100 text-slate-500' };
  }
  if (Math.abs(diffHours) <= 18 && Math.abs(diffDays) <= 1) {
    return { label: "Aujourd'hui !", cls: 'bg-amber-100 text-amber-900 font-extrabold animate-pulse' };
  }
  if (diffDays === 1) {
    return { label: 'Demain', cls: 'bg-amber-50 text-amber-800 font-bold' };
  }
  if (diffDays > 1 && diffDays <= 7) {
    return { label: `Dans ${diffDays} j`, cls: 'bg-blue-50 text-blue-700 font-bold' };
  }
  if (diffDays > 7) {
    return { label: `Dans ${diffDays} j`, cls: 'bg-slate-100 text-slate-600' };
  }
  return { label: 'En cours', cls: 'bg-emerald-100 text-emerald-800' };
}

export function scoreClass(score: number): string {
  if (score >= 75) return 'bg-emerald-100 text-emerald-800';
  if (score >= 55) return 'bg-blue-100 text-blue-800';
  return 'bg-slate-100 text-slate-600';
}

export function srcLabel(s: string | null | undefined): string {
  if (!s) return '—';
  if (s === 'france_travail') return 'France Travail';
  if (s === 'joblia.ma') return 'Joblia.ma';
  if (s.startsWith('email:')) return s.slice(6) + ' (alerte)';
  return s;
}

export function isFresh(firstSeen: string | null | undefined): boolean {
  if (!firstSeen) return false;
  return (Date.now() - new Date(firstSeen + 'T00:00:00Z').getTime()) < 2 * 864e5;
}
