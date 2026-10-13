import { norm } from './text';

/**
 * Checks if an offer is remunerated.
 * Primary source is offer.is_paid (set by scraper).
 * Fallback scans title and description text with positive and negation checks.
 */
export function isPaid(
  offer: { is_paid?: boolean; title?: string; description?: string },
  extraText: string = ''
): boolean {
  if (offer.is_paid) return true;

  const text = norm([offer.title || '', offer.description || '', extraText].join(' '));

  // Explicit negations
  if (/non\s+r[ée]mun[ée]r[ée]|sans\s+r[ée]mun[ée]ration|non\s+gratifi[ée]|b[ée]n[ée]vole/.test(text)) {
    return false;
  }

  // Positive mentions
  return /(?:stage\s+)?r[ée]mun[ée]r[ée]|gratifi[ée]|indemnit[ée]|stipend|salaire|\b\d+\s*(?:dh|mad|dhs)\b/.test(text);
}
