/**
 * ⚠ SAME formula as scraper/scoring.py::compute_score and supabase/schema.sql::my_matches
 * Change all three mirrors together.
 *
 * hits_i    = distinct keywords of axis i found (a keyword in title counts twice)
 * fit       = Σ (hits_i / Σhits) · (weight_i / max weight)
 * intensity = min(1, Σhits / 12)
 * score     = round(100·(0.6·fit + 0.4·intensity)) + bonus, capped to 100
 */
export function computeScore(
  axisHits: Record<string, number>,
  weights: Record<string, number>,
  bonus: number = 0
): number {
  const total = Object.values(axisHits).reduce((sum, h) => sum + h, 0);
  if (total <= 0) return 0;

  const validWeights = Object.values(weights).filter(w => w > 0);
  const wmax = validWeights.length ? Math.max(...validWeights) : 1;

  let fit = 0;
  for (const [axis, weight] of Object.entries(weights)) {
    const hits = axisHits[axis] || 0;
    const w = Math.max(weight, 0);
    fit += (hits / total) * (w / wmax);
  }

  const intensity = Math.min(1.0, total / 12);
  const raw = Math.round(100 * (0.6 * fit + 0.4 * intensity)) + bonus;
  return Math.min(100, Math.max(0, raw));
}
