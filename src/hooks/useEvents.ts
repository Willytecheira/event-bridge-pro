import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EventFilters {
  ticker?: string;
  event_type?: string;
  sentiment?: string;
  asset_type?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export function useEvents(filters: EventFilters = {}) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      let query = supabase
        .from('processed_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters.limit ?? 50);

      if (filters.ticker) query = query.ilike('ticker', `%${filters.ticker}%`);
      if (filters.event_type) query = query.eq('event_type', filters.event_type);
      if (filters.sentiment) query = query.eq('sentiment', filters.sentiment);
      if (filters.asset_type) query = query.eq('asset_type', filters.asset_type);
      if (filters.from) query = query.gte('created_at', filters.from);
      if (filters.to) query = query.lte('created_at', filters.to);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useEvent(id: string | null) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('processed_events')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useErrors() {
  return useQuery({
    queryKey: ['errors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processing_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useLogs(filters: { level?: string; module?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('service_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters.limit ?? 100);

      if (filters.level) query = query.eq('level', filters.level);
      if (filters.module) query = query.eq('module', filters.module);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const [eventsRes, errorsRes, dupsRes] = await Promise.all([
        supabase.from('processed_events').select('id', { count: 'exact', head: true }),
        supabase.from('processing_errors').select('id', { count: 'exact', head: true }),
        supabase.from('duplicate_events').select('id', { count: 'exact', head: true }),
      ]);

      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const lastHourRes = await supabase
        .from('processed_events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo);

      return {
        total_processed: eventsRes.count ?? 0,
        total_errors: errorsRes.count ?? 0,
        total_duplicates: dupsRes.count ?? 0,
        events_last_hour: lastHourRes.count ?? 0,
      };
    },
    refetchInterval: 15000,
  });
}

export function useEventsByHour() {
  return useQuery({
    queryKey: ['events-by-hour'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600000).toISOString();
      const { data, error } = await supabase
        .from('processed_events')
        .select('created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      const hourMap: Record<string, number> = {};
      for (let i = 23; i >= 0; i--) {
        const d = new Date(Date.now() - i * 3600000);
        const key = `${d.getHours().toString().padStart(2, '0')}:00`;
        hourMap[key] = 0;
      }
      data?.forEach((e) => {
        const d = new Date(e.created_at);
        const key = `${d.getHours().toString().padStart(2, '0')}:00`;
        if (key in hourMap) hourMap[key]++;
      });
      return Object.entries(hourMap).map(([hour, count]) => ({ hour, count }));
    },
    refetchInterval: 30000,
  });
}

export function useEventDistribution() {
  return useQuery({
    queryKey: ['event-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processed_events')
        .select('event_type, sentiment');
      if (error) throw error;

      const typeMap: Record<string, number> = {};
      const sentimentMap: Record<string, number> = {};
      data?.forEach((e) => {
        if (e.event_type) typeMap[e.event_type] = (typeMap[e.event_type] || 0) + 1;
        if (e.sentiment) sentimentMap[e.sentiment] = (sentimentMap[e.sentiment] || 0) + 1;
      });

      return {
        byType: Object.entries(typeMap).map(([name, value]) => ({ name, value })),
        bySentiment: Object.entries(sentimentMap).map(([name, value]) => ({ name, value })),
      };
    },
    refetchInterval: 30000,
  });
}
