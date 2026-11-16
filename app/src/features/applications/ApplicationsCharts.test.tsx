import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApplicationsCharts } from './ApplicationsCharts';
import type { ApplicationItem } from '../../types/api';

const mockApps: ApplicationItem[] = [
  {
    app_id: 1,
    offer_id: 101,
    status: 'envoyee',
    notes: 'Premier contact',
    applied_at: '2026-10-01',
    updated_at: '2026-10-01T10:00:00Z',
    title: 'Stage PFE Data Engineer',
    company: 'TechCorp',
    city: 'Casablanca',
    url: 'https://example.com/1',
    source: 'stagiaires.ma',
    active: true,
    valid_through: null,
    external: false,
    letter: '',
    ext_date: null,
    interview_at: null,
    interview_type: 'visio',
    interview_notes: '',
  },
  {
    app_id: 2,
    offer_id: null,
    status: 'entretien',
    notes: 'Entretien RH technique',
    applied_at: '2026-10-05',
    updated_at: '2026-10-10T14:00:00Z',
    title: 'Stage Machine Learning',
    company: 'AICo',
    city: 'Rabat',
    url: 'https://example.com/2',
    source: 'LinkedIn',
    active: true,
    valid_through: null,
    external: true,
    letter: '',
    ext_date: '2026-10-05',
    interview_at: '2026-11-20T10:00:00Z',
    interview_type: 'visio',
    interview_notes: 'Meet link',
  },
  {
    app_id: 3,
    offer_id: null,
    status: 'offre',
    notes: 'Offre reçue !',
    applied_at: '2026-09-15',
    updated_at: '2026-10-12T11:00:00Z',
    title: 'Stage Data Scientist',
    company: 'FinData',
    city: 'Casablanca',
    url: 'https://example.com/3',
    source: 'externe',
    active: true,
    valid_through: null,
    external: true,
    letter: '',
    ext_date: '2026-09-15',
    interview_at: '2026-10-01T15:00:00Z',
    interview_type: 'presentiel',
    interview_notes: 'Siège social',
  },
];

describe('ApplicationsCharts component', () => {
  it('renders correctly with application metrics and charts', () => {
    render(<ApplicationsCharts apps={mockApps} />);

    // Check KPIs
    expect(screen.getByText('Candidatures')).toBeInTheDocument();
    expect(screen.getByText('Taux d\'entretien')).toBeInTheDocument();
    expect(screen.getByText('Offres obtenues')).toBeInTheDocument();

    // Total should be 3
    expect(screen.getAllByText('3')[0]).toBeInTheDocument();

    // Check sections exist
    expect(screen.getByText('Entonnoir de conversion')).toBeInTheDocument();
    expect(screen.getByText('Répartition par statut')).toBeInTheDocument();
    expect(screen.getByText('Activité & Rythme de postulation')).toBeInTheDocument();
    expect(screen.getByText('Répartition géographique')).toBeInTheDocument();
    expect(screen.getByText('Formats d\'entretiens & Canaux')).toBeInTheDocument();
  });

  it('renders helpful empty state when apps list is empty', () => {
    const handleAdd = vi.fn();
    render(<ApplicationsCharts apps={[]} onAddExternal={handleAdd} />);

    expect(
      screen.getByText('Aucune candidature enregistrée pour cette période')
    ).toBeInTheDocument();
    expect(
      screen.getByText('+ Ajouter une candidature externe')
    ).toBeInTheDocument();
  });
});
