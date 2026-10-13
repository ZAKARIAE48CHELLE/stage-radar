import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { MatchOffer } from '../../types/api';
import type { Offer } from '../../types/db';

export function useMatches(maxAgeDays: number = 60) {
  return useQuery({
    queryKey: ['matches', maxAgeDays],
    queryFn: async (): Promise<MatchOffer[]> => {
      const all: MatchOffer[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .rpc('my_matches', { max_age_days: maxAgeDays })
          .range(from, from + 999);

        if (error) throw error;
        if (!data || !data.length) break;
        all.push(...(data as MatchOffer[]));
        if (data.length < 1000) break;
      }
      return all;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useOfferDetail(offerId: number | null) {
  return useQuery({
    queryKey: ['offer-detail', offerId],
    queryFn: async (): Promise<Offer | null> => {
      if (!offerId) return null;
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('id', offerId)
        .single();

      if (error) throw error;
      return data as Offer;
    },
    enabled: !!offerId,
    staleTime: 10 * 60 * 1000,
  });
}
