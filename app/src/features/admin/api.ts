import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { AdminUserItem } from '../../types/api';

export interface AdminStats {
  users: number;
  pending: number;
  offers_active: number;
  offers_by_source: Record<string, number>;
  apps_by_status: Record<string, number>;
  last_run: {
    run_at: string;
    stats: {
      synced?: number;
      new_this_run?: number;
      deactivated?: number;
    };
  } | null;
}

export interface AdminInvite {
  email: string;
  invited_by: string;
  created_at: string;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async (): Promise<AdminUserItem[]> => {
      const { data, error } = await supabase.rpc('admin_users');
      if (error) throw error;
      return (data || []) as AdminUserItem[];
    },
    staleTime: 60 * 1000,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<AdminStats> => {
      const { data, error } = await supabase.rpc('admin_stats');
      if (error) throw error;
      return data as AdminStats;
    },
    staleTime: 60 * 1000,
  });
}

export function useInvites() {
  return useQuery({
    queryKey: ['admin-invites'],
    queryFn: async (): Promise<AdminInvite[]> => {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AdminInvite[];
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, invitedBy }: { email: string; invitedBy: string }) => {
      const { data, error } = await supabase
        .from('invites')
        .insert({
          email: email.trim().toLowerCase(),
          invited_by: invitedBy,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AdminInvite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
    },
  });
}

export function useDeleteInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from('invites')
        .delete()
        .eq('email', email);

      if (error) throw error;
      return email;
    },
    onSuccess: (email) => {
      queryClient.setQueryData<AdminInvite[]>(['admin-invites'], (old = []) =>
        old.filter((i) => i.email !== email)
      );
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      patch,
    }: {
      userId: string;
      patch: { status?: 'approved' | 'pending' | 'blocked'; role?: 'admin' | 'user' };
    }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}
