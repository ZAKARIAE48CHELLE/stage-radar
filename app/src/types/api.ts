import type { ApplicationStatus } from '../lib/constants';

export interface MatchOffer {
  id: number;
  url: string;
  source: string;
  title: string;
  company: string;
  city: string;
  modality: string;
  date_posted: string | null;
  valid_through: string | null;
  is_pfe: boolean;
  first_seen: string;
  also_on: Array<{ source: string; url: string }>;
  score: number;
  axis_hits: Record<string, number>;
  matched: string[];
  app_status: ApplicationStatus | null;
  app_updated: string | null;
}

export interface ApplicationItem {
  app_id: number;
  offer_id: number | null;
  status: ApplicationStatus;
  notes: string;
  applied_at: string | null;
  updated_at: string;
  title: string;
  company: string;
  city: string;
  url: string;
  source: string;
  active: boolean;
  valid_through: string | null;
  external: boolean;
  letter: string;
  ext_date: string | null;
  interview_at: string | null;
  interview_type: 'visio' | 'presentiel' | 'telephone';
  interview_notes: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  school: string;
  field: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'blocked';
  created_at: string;
  n_applications: number;
  n_sent: number;
  n_interviews: number;
  last_activity: string | null;
  features?: Record<string, boolean>;
}
