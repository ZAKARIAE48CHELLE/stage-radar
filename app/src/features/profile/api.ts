import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/db';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      patch,
    }: {
      userId: string;
      patch: Partial<Omit<Profile, 'id' | 'email' | 'role' | 'status' | 'created_at' | 'updated_at'>>;
    }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile', updatedProfile.id], updatedProfile);
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useUploadCv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
      if (file.type !== 'application/pdf') {
        throw new Error('Le CV doit être un fichier PDF.');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Fichier trop lourd : 5 Mo maximum.');
      }

      const path = `${userId}/cv.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(path, file, { upsert: true, contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      const { data, error: profileError } = await supabase
        .from('profiles')
        .update({ cv_path: path, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (profileError) throw profileError;
      return data as Profile;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile', updatedProfile.id], updatedProfile);
    },
  });
}

export function useDeleteCv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, cvPath }: { userId: string; cvPath: string }) => {
      const { error: storageError } = await supabase.storage.from('cvs').remove([cvPath]);
      if (storageError) throw storageError;

      const { data, error: profileError } = await supabase
        .from('profiles')
        .update({ cv_path: null, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (profileError) throw profileError;
      return data as Profile;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile', updatedProfile.id], updatedProfile);
    },
  });
}
