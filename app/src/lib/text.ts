export function norm(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function kwPattern(kw: string): RegExp {
  const k = escapeRegex(norm(kw)).replace(/\\ /g, '[\\s\\-]+');
  return new RegExp(`(^|[^a-z0-9])${k}($|[^a-z0-9])`, 'i');
}

export function containsAny(textNorm: string, keywords: string[]): boolean {
  return keywords.some(k => kwPattern(k).test(textNorm));
}
