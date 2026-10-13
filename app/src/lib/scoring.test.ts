import { describe, it, expect } from 'vitest';
import { computeScore } from './scoring';
import { isPaid } from './paid';
import { norm, containsAny } from './text';

describe('scoring formula (mirror of scraper and SQL)', () => {
  it('returns 0 when no keywords matched', () => {
    expect(computeScore({}, { dev: 30 })).toBe(0);
    expect(computeScore({ dev: 0 }, { dev: 30 })).toBe(0);
  });

  it('calculates score correctly with fit and intensity', () => {
    // 6 hits in an axis with weight 30/30 (fit = 1.0, intensity = 6/12 = 0.5)
    // score = round(100 * (0.6 * 1.0 + 0.4 * 0.5)) = round(100 * 0.8) = 80
    const score = computeScore({ dev: 6 }, { dev: 30 }, 0);
    expect(score).toBe(80);
  });

  it('adds bonus and caps at 100', () => {
    const score = computeScore({ dev: 12 }, { dev: 30 }, 10);
    // 12 hits -> intensity 1.0, fit 1.0 -> 100 + 10 = capped at 100
    expect(score).toBe(100);
  });
});

describe('paid detection with negation', () => {
  it('flags remunerated offers', () => {
    expect(isPaid({ title: 'Stage rémunéré développeur' })).toBe(true);
    expect(isPaid({ description: 'Gratification de 3000 DH par mois' })).toBe(true);
    expect(isPaid({ description: 'Indemnité de stage prévue' })).toBe(true);
  });

  it('rejects explicit negations', () => {
    expect(isPaid({ title: 'Stage non rémunéré' })).toBe(false);
    expect(isPaid({ description: 'Ce stage est sans rémunération.' })).toBe(false);
    expect(isPaid({ description: 'Stage bénévole pour débutant' })).toBe(false);
  });

  it('respects is_paid database boolean flag', () => {
    expect(isPaid({ is_paid: true, title: 'Stage' })).toBe(true);
  });
});

describe('text normalization', () => {
  it('strips accents, collapses whitespace, and lowercases', () => {
    expect(norm('  Élève-Ingénieur   à Fès  ')).toBe('eleve-ingenieur a fes');
  });

  it('matches keywords properly', () => {
    expect(containsAny('stage en react et node.js', ['react', 'vue'])).toBe(true);
    expect(containsAny('stage en react et node.js', ['angular'])).toBe(false);
  });
});
