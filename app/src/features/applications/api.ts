import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { ApplicationItem, MatchOffer } from '../../types/api';
import type { ApplicationStatus } from '../../lib/constants';

export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: async (): Promise<ApplicationItem[]> => {
      const { data, error } = await supabase.rpc('my_applications');
      if (error) throw error;
      return (data || []) as ApplicationItem[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appId,
      status,
      appliedAt,
    }: {
      appId: number;
      status: ApplicationStatus;
      appliedAt?: string;
    }) => {
      const patch: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (appliedAt !== undefined) {
        patch.applied_at = appliedAt;
      }

      const { data, error } = await supabase
        .from('applications')
        .update(patch)
        .eq('id', appId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updated) => {
      // Optimistically update applications list cache
      queryClient.setQueryData<ApplicationItem[]>(['applications'], (old = []) =>
        old.map((app) => (app.app_id === updated.id ? { ...app, status: updated.status, applied_at: updated.applied_at, updated_at: updated.updated_at } : app))
      );
      // Invalidate matches so offer rows show the updated status pill
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useSaveOfferApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      offerId,
      userId,
      status,
      appliedAt,
      notes,
      letter,
      interviewAt,
      interviewType,
      interviewNotes,
    }: {
      offerId: number;
      userId: string;
      status: ApplicationStatus;
      appliedAt?: string | null;
      notes?: string;
      letter?: string;
      interviewAt?: string | null;
      interviewType?: 'visio' | 'presentiel' | 'telephone';
      interviewNotes?: string;
    }) => {
      const payload: Record<string, unknown> = {
        user_id: userId,
        offer_id: offerId,
        status,
        applied_at: appliedAt || null,
        notes: notes || '',
        letter: letter || '',
        interview_at: interviewAt || null,
        interview_type: interviewType || 'visio',
        interview_notes: interviewNotes || '',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('applications')
        .upsert(payload, { onConflict: 'user_id,offer_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appId, offerId, userId }: { appId?: number; offerId?: number; userId?: string }) => {
      let query = supabase.from('applications').delete();
      if (appId) {
        query = query.eq('id', appId);
      } else if (offerId && userId) {
        query = query.eq('offer_id', offerId).eq('user_id', userId);
      } else {
        throw new Error('Either appId or (offerId and userId) is required');
      }

      const { error } = await query;
      if (error) throw error;
      return { appId, offerId };
    },
    onSuccess: ({ appId, offerId }) => {
      if (appId) {
        queryClient.setQueryData<ApplicationItem[]>(['applications'], (old = []) =>
          old.filter((app) => app.app_id !== appId)
        );
      } else {
        queryClient.invalidateQueries({ queryKey: ['applications'] });
      }
      if (offerId) {
        queryClient.setQueryData<MatchOffer[]>(['matches'], (old = []) =>
          old.map((m) => (m.id === offerId ? { ...m, app_status: null } : m))
        );
      }
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export interface SaveExternalAppInput {
  id?: number;
  userId: string;
  title: string;
  company: string;
  city?: string;
  url?: string;
  source?: string;
  status: ApplicationStatus;
  extDate?: string | null;
  notes?: string;
  letter?: string;
  interviewAt?: string | null;
  interviewType?: 'visio' | 'presentiel' | 'telephone';
  interviewNotes?: string;
}

export function useSaveExternalApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveExternalAppInput) => {
      const payload: Record<string, unknown> = {
        user_id: input.userId,
        is_external: true,
        ext_title: input.title,
        ext_company: input.company,
        ext_city: input.city || null,
        ext_url: input.url || null,
        ext_source: input.source || 'externe',
        status: input.status,
        ext_date: input.extDate || null,
        applied_at: input.extDate || null,
        notes: input.notes || '',
        letter: input.letter || '',
        interview_at: input.interviewAt || null,
        interview_type: input.interviewType || 'visio',
        interview_notes: input.interviewNotes || '',
        updated_at: new Date().toISOString(),
      };

      if (input.id) {
        const { data, error } = await supabase
          .from('applications')
          .update(payload)
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('applications')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}
