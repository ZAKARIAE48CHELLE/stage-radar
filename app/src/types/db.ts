import type { ApplicationStatus } from '../lib/constants';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  school: string;
  field: string;
  headline: string;
  pitch: string;
  wants_pfe: boolean;
  preferred_cities: string[];
  cv_path: string | null;
  axes: Array<{
    label: string;
    weight: number;
    keywords: string[];
  }>;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: number;
  url: string;
  source: string;
  title: string;
  company: string;
  city: string;
  modality: string;
  description: string;
  date_posted: string | null;
  valid_through: string | null;
  is_pfe: boolean;
  is_paid: boolean;
  first_seen: string;
  last_seen: string;
  active: boolean;
  also_on: Array<{ source: string; url: string }>;
}

export interface Application {
  id: number;
  user_id: string;
  offer_id: number | null;
  status: ApplicationStatus;
  notes: string;
  letter: string;
  applied_at: string | null;
  is_external: boolean;
  ext_title: string | null;
  ext_company: string | null;
  ext_city: string | null;
  ext_url: string | null;
  ext_source: string | null;
  ext_date: string | null;
  interview_at: string | null;
  interview_type: 'visio' | 'presentiel' | 'telephone';
  interview_notes: string;
  created_at: string;
  updated_at: string;
}

export interface CareerSite {
  id: number;
  user_id: string;
  name: string;
  url: string;
  category: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Invite {
  code: string;
  created_by: string;
  created_at: string;
  used_by: string | null;
  used_at: string | null;
}
