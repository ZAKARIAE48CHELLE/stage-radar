import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { CareerSite } from '../../types/db';

export const PRESET_CAREER_SITES = [
  { name: 'OCP Group', url: 'https://careers.ocpgroup.ma/', category: 'Industrie & Énergie', notes: 'Portail carrières officiel d’OCP (stages PFE, jeunes diplômés et profils expérimentés).' },
  { name: 'Capgemini Maroc', url: 'https://www.capgemini.com/ma-fr/carrieres/', category: 'Tech & Conseil', notes: 'Recrutement IT, Cloud, Digital, Data et IA (Casablanca & Rabat).' },
  { name: 'Attijariwafa bank', url: 'https://recrutement.attijariwafabank.com/', category: 'Banque & Finance', notes: 'Plateforme officielle de recrutement Attijariwafa (stages et opportunités).' },
  { name: 'Bank of Africa (BMCE)', url: 'https://recrutement.bankofafrica.ma/', category: 'Banque & Finance', notes: 'Espace carrières et candidatures de Bank of Africa.' },
  { name: 'Groupe CDG', url: 'https://recrutement.cdg.ma/', category: 'Finance & Investissement', notes: 'Portail RH de la Caisse de Dépôt et de Gestion.' },
  { name: 'Maroc Telecom', url: 'https://www.iam.ma/groupe-maroc-telecom/carrieres/recrutement.aspx', category: 'Télécoms', notes: 'Portail de recrutement Maroc Telecom (IAM).' },
  { name: 'Orange Maroc', url: 'https://recrutement.orange.ma/', category: 'Télécoms', notes: 'Stages et carrières Orange Maroc.' },
  { name: 'Inwi', url: 'https://carrieres.inwi.ma/', category: 'Télécoms', notes: 'Espace carrières et opportunités chez Inwi.' },
  { name: 'Renault Group Maroc', url: 'https://renault.talent-soft.com/', category: 'Automobile & Industrie', notes: 'Usines Tanger & Casablanca, ingénierie et fonctions support.' },
  { name: 'Stellantis Maroc', url: 'https://careers.stellantis.com/', category: 'Automobile & Industrie', notes: 'Usine de Kénitra et centre technique de Casablanca.' },
  { name: 'Sopra Steria Maroc', url: 'https://www.soprasteria.ma/carrieres', category: 'Tech & Conseil', notes: 'ESN européenne implantée à Casablanca et Rabat.' },
  { name: 'DXC Technology Maroc', url: 'https://dxc.com/ma/fr/careers', category: 'Tech & Conseil', notes: 'Services IT, cloud et cybersécurité à Technopolis Salé.' },
];

export const CAREER_CATEGORIES = [
  'Tech & Conseil',
  'Banque & Finance',
  'Industrie & Énergie',
  'Télécoms',
  'Automobile & Industrie',
  'Finance & Investissement',
  'Général',
  'Autre',
];

export function useCareerSites() {
  return useQuery({
    queryKey: ['career-sites'],
    queryFn: async (): Promise<CareerSite[]> => {
      const { data, error } = await supabase
        .from('career_sites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CareerSite[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveCareerSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      userId,
      name,
      url,
      category,
      notes,
    }: {
      id?: number;
      userId: string;
      name: string;
      url: string;
      category?: string;
      notes?: string;
    }) => {
      const payload = {
        user_id: userId,
        name: name.trim(),
        url: url.trim(),
        category: category || 'Général',
        notes: notes || '',
        updated_at: new Date().toISOString(),
      };

      if (id) {
        const { data, error } = await supabase
          .from('career_sites')
          .update(payload)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('career_sites')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-sites'] });
    },
  });
}

export function useDeleteCareerSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: number; userId: string }) => {
      const { error } = await supabase
        .from('career_sites')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<CareerSite[]>(['career-sites'], (old = []) =>
        old.filter((s) => s.id !== id)
      );
    },
  });
}
