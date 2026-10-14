import { describe, it, expect } from 'vitest';
import { ALL_FEATURES, DEFAULT_FEATURES, hasFeature } from './features';
import type { Profile } from '../types/db';

const baseProfile: Profile = {
  id: 'usr_1',
  email: 'test@example.com',
  full_name: 'Test User',
  school: 'EMSI',
  field: 'ia',
  headline: 'Student',
  pitch: 'Pitch',
  wants_pfe: true,
  preferred_cities: ['Casablanca'],
  cv_path: null,
  axes: [],
  role: 'user',
  status: 'approved',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('Features access control', () => {
  it('returns false when profile is null or undefined', () => {
    expect(hasFeature(null, 'apps_kanban')).toBe(false);
    expect(hasFeature(undefined, 'apps_kanban')).toBe(false);
  });

  it('grants all features to admins', () => {
    const adminProfile: Profile = { ...baseProfile, role: 'admin', features: { apps_kanban: false } };
    expect(hasFeature(adminProfile, 'apps_kanban')).toBe(true);
    expect(hasFeature(adminProfile, 'page_offers')).toBe(true);
  });

  it('allows user A to use kanban and user Y to use only table', () => {
    const userA: Profile = {
      ...baseProfile,
      features: {
        apps_kanban: true,
        apps_table: false,
      },
    };

    const userY: Profile = {
      ...baseProfile,
      features: {
        apps_kanban: false,
        apps_table: true,
      },
    };

    // User A
    expect(hasFeature(userA, 'apps_kanban')).toBe(true);
    expect(hasFeature(userA, 'apps_table')).toBe(false);

    // User Y
    expect(hasFeature(userY, 'apps_kanban')).toBe(false);
    expect(hasFeature(userY, 'apps_table')).toBe(true);
  });

  it('falls back to default features when feature is not explicitly set in profile', () => {
    const userWithoutCustomFeatures: Profile = {
      ...baseProfile,
      features: {},
    };

    expect(hasFeature(userWithoutCustomFeatures, 'page_offers')).toBe(true);
    expect(hasFeature(userWithoutCustomFeatures, 'apps_kanban')).toBe(true);
  });

  it('DEFAULT_FEATURES includes every feature in ALL_FEATURES', () => {
    ALL_FEATURES.forEach((f) => {
      expect(DEFAULT_FEATURES[f.key]).toBe(f.default);
    });
  });
});
