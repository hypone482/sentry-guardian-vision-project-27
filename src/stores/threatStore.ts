import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shared threat synchronization store for Globe3D ↔ Radar3DDisplay,
 * persisted via Supabase + realtime subscriptions so every client sees
 * the same live feed and intercept state.
 */

export interface RealtimeThreat {
  id: string;
  origin_lat: number;
  origin_lon: number;
  target_lat: number;
  target_lon: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  eta_seconds: number;
  status: 'active' | 'intercepted' | 'impacted';
  radar_id: string | null;
  created_at: string;
}

interface ThreatStore {
  liveThreats: RealtimeThreat[];
  interceptedIds: Set<string>;
  globeToRadarMap: Record<string, string>;
  interceptedCount: number;
  isInitialized: boolean;

  init: () => Promise<void>;
  intercept: (id: string) => Promise<void>;
  addThreat: (t: Partial<RealtimeThreat>) => Promise<void>;
  registerMapping: (globeId: string, radarId: string) => void;
  isIntercepted: (id: string) => boolean;
}

const db = supabase as any;

export const useThreatStore = create<ThreatStore>((set, get) => ({
  liveThreats: [],
  interceptedIds: new Set<string>(),
  globeToRadarMap: {},
  interceptedCount: 0,
  isInitialized: false,

  init: async () => {
    if (get().isInitialized) return;
    set({ isInitialized: true });

    // Seed from current DB state
    const { data } = await db
      .from('threats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (data) {
      const intercepted = new Set<string>(
        data.filter((t: RealtimeThreat) => t.status === 'intercepted').map((t: RealtimeThreat) => t.id),
      );
      const live = data.filter((t: RealtimeThreat) => t.status === 'active');
      set({
        liveThreats: live,
        interceptedIds: intercepted,
        interceptedCount: intercepted.size,
      });
    }

    // Realtime feed
    db.channel('threats-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'threats' },
        (payload: any) => {
          const t = payload.new as RealtimeThreat;
          set((s) => ({ liveThreats: [t, ...s.liveThreats].slice(0, 200) }));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'threats' },
        (payload: any) => {
          const t = payload.new as RealtimeThreat;
          if (t.status === 'intercepted') {
            set((s) => {
              if (s.interceptedIds.has(t.id)) return s;
              const next = new Set(s.interceptedIds);
              next.add(t.id);
              const mapped = s.globeToRadarMap[t.id];
              if (mapped) next.add(mapped);
              return {
                interceptedIds: next,
                interceptedCount: next.size,
                liveThreats: s.liveThreats.filter((x) => x.id !== t.id),
              };
            });
          }
        },
      )
      .subscribe();
  },

  intercept: async (id: string) => {
    // Optimistic local update — also covers non-Supabase ids (Globe demo attacks)
    set((s) => {
      if (s.interceptedIds.has(id)) return s;
      const next = new Set(s.interceptedIds);
      next.add(id);
      const mapped = s.globeToRadarMap[id];
      if (mapped) next.add(mapped);
      const reverse = Object.entries(s.globeToRadarMap).find(([, r]) => r === id)?.[0];
      if (reverse) next.add(reverse);
      return { interceptedIds: next, interceptedCount: next.size };
    });

    // Persist if it's a Supabase uuid
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      await db.from('threats').update({ status: 'intercepted' }).eq('id', id);
      await db.from('interceptions').insert({ threat_id: id, intercepted_by: 'operator' });
    }
  },

  addThreat: async (t) => {
    await db.from('threats').insert({
      origin_lat: t.origin_lat ?? 0,
      origin_lon: t.origin_lon ?? 0,
      target_lat: t.target_lat ?? 9.0192,
      target_lon: t.target_lon ?? 38.7525,
      priority: t.priority ?? 'medium',
      eta_seconds: t.eta_seconds ?? 60,
      status: 'active',
      radar_id: t.radar_id ?? null,
    });
  },

  registerMapping: (globeId, radarId) =>
    set((s) => ({ globeToRadarMap: { ...s.globeToRadarMap, [globeId]: radarId } })),

  isIntercepted: (id: string) => get().interceptedIds.has(id),
}));
