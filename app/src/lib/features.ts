import type { Profile } from '../types/db';

export interface FeatureDefinition {
  key: string;
  label: string;
  description: string;
  category: 'pages' | 'applications' | 'offers';
  default: boolean;
}

export const FEATURE_CATEGORIES = {
  pages: { id: 'pages', label: 'Pages & Navigation' },
  applications: { id: 'applications', label: 'Mes candidatures (Vues & Outils)' },
  offers: { id: 'offers', label: "Offres d'emploi (Affichage & Outils)" },
} as const;

export const ALL_FEATURES: FeatureDefinition[] = [
  // Pages
  {
    key: 'page_offers',
    label: "Offres d'emploi",
    description: "Accès à la page des offres (/offres)",
    category: 'pages',
    default: true,
  },
  {
    key: 'page_applications',
    label: "Mes candidatures",
    description: "Accès au suivi complet des candidatures (/candidatures)",
    category: 'pages',
    default: true,
  },
  {
    key: 'page_carrieres',
    label: "Sites carrières",
    description: "Accès au répertoire des portails carrières (/carrieres)",
    category: 'pages',
    default: true,
  },
  {
    key: 'page_marche',
    label: "Marché & Tendances",
    description: "Accès aux statistiques et tendances de l'emploi (/marche)",
    category: 'pages',
    default: true,
  },

  // Candidatures
  {
    key: 'apps_kanban',
    label: "Vue Kanban (Cartes)",
    description: "Pipeline interactif par colonnes de statut",
    category: 'applications',
    default: true,
  },
  {
    key: 'apps_table',
    label: "Vue Tableau",
    description: "Liste compacte tabulaire des candidatures",
    category: 'applications',
    default: true,
  },
  {
    key: 'apps_calendar',
    label: "Vue Calendrier",
    description: "Calendrier des entretiens et relances planifiés",
    category: 'applications',
    default: true,
  },
  {
    key: 'apps_add_external',
    label: "Ajout candidature externe",
    description: "Possibilité d'ajouter des candidatures trouvées ailleurs",
    category: 'applications',
    default: true,
  },
  {
    key: 'apps_export_excel',
    label: "Export Excel (.xlsx)",
    description: "Téléchargement complet du tableau des candidatures",
    category: 'applications',
    default: true,
  },

  // Offres
  {
    key: 'offers_view_cards',
    label: "Vue Cartes (Offres)",
    description: "Affichage des offres sous forme de cartes riches",
    category: 'offers',
    default: true,
  },
  {
    key: 'offers_view_table',
    label: "Vue Tableau (Offres)",
    description: "Affichage des offres sous forme de tableau compact",
    category: 'offers',
    default: true,
  },
  {
    key: 'offers_kpi_row',
    label: "Barre des KPIs",
    description: "Affichage des compteurs synthétiques (scores, PFE, rémunéré)",
    category: 'offers',
    default: true,
  },
  {
    key: 'offers_letter_generator',
    label: "Générateur de lettre",
    description: "Rédaction assistée de lettre de motivation personnalisée",
    category: 'offers',
    default: true,
  },
];

export const DEFAULT_FEATURES: Record<string, boolean> = ALL_FEATURES.reduce(
  (acc, f) => {
    acc[f.key] = f.default;
    return acc;
  },
  {} as Record<string, boolean>
);

/**
 * Checks whether a specific feature is enabled for a user profile.
 * - Admins have all features enabled.
 * - If profile.features specifies the key, that boolean value is used.
 * - Otherwise, falls back to the default feature state.
 */
export function hasFeature(profile: Profile | null | undefined, featureKey: string): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  if (profile.features && profile.features[featureKey] !== undefined) {
    return Boolean(profile.features[featureKey]);
  }
  return DEFAULT_FEATURES[featureKey] ?? true;
}
