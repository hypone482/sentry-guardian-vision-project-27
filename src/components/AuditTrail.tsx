import React, { useEffect, useState } from 'react';
import { ShieldCheck, Clock, User, Target } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useThreatStore } from '@/stores/threatStore';
import { cn } from '@/lib/utils';

interface AuditEntry {
  id: string;
  threat_id: string;
  intercepted_by: string | null;
  intercepted_at: string;
  origin_lat?: number;
  origin_lon?: number;
  target_lat?: number;
  target_lon?: number;
  priority?: string;
}

const db = supabase as any;

const AuditTrail: React.FC = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const interceptedCount = useThreatStore((s) => s.interceptedCount);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await db
        .from('interceptions')
        .select('id, threat_id, intercepted_by, intercepted_at, threats(origin_lat, origin_lon, target_lat, target_lon, priority)')
        .order('intercepted_at', { ascending: false })
        .limit(100);
      if (!mounted || !data) return;
      setEntries(
        data.map((d: any) => ({
          id: d.id,
          threat_id: d.threat_id,
          intercepted_by: d.intercepted_by,
          intercepted_at: d.intercepted_at,
          ...(d.threats || {}),
        })),
      );
    };
    load();

    const ch = db
      .channel('audit-trail')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interceptions' },
        async (payload: any) => {
          const row = payload.new;
          const { data: t } = await db
            .from('threats')
            .select('origin_lat, origin_lon, target_lat, target_lon, priority')
            .eq('id', row.threat_id)
            .maybeSingle();
          setEntries((prev) =>
            [{ ...row, ...(t || {}) }, ...prev].slice(0, 100),
          );
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      db.removeChannel(ch);
    };
  }, []);

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  const fmtCoord = (v?: number) => (v == null ? '—' : v.toFixed(3));

  const priColor = (p?: string) =>
    p === 'critical' ? 'text-red-500'
    : p === 'high' ? 'text-orange-400'
    : p === 'medium' ? 'text-yellow-400'
    : 'text-emerald-400';

  return (
    <div className="sentry-panel flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="h-4 w-4 text-sentry-accent" />
        <h2 className="sentry-title text-sm">INTERCEPT AUDIT</h2>
        <div className="ml-auto flex items-center gap-2 text-[10px] font-mono">
          <span className="text-muted-foreground">TOTAL:</span>
          <span className="text-sentry-primary">{interceptedCount}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400">LIVE</span>
        </div>
      </div>

      <ScrollArea className="flex-1 pr-2">
        {entries.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs py-6 font-mono">
            No interceptions on record
          </div>
        ) : (
          <div className="space-y-1">
            {entries.map((e) => (
              <div
                key={e.id}
                className="border-l-2 border-emerald-500/50 bg-emerald-500/5 p-1.5 rounded-r"
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-cyan-400" />
                    <span className="text-cyan-400">{e.intercepted_by || 'unknown'}</span>
                    <span className={cn('px-1 rounded bg-card/60 uppercase', priColor(e.priority))}>
                      {e.priority || 'n/a'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{fmtTime(e.intercepted_at)}</span>
                  </div>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-x-2 text-[9px] font-mono text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>ORG</span>
                    <span className="text-foreground">{fmtCoord(e.origin_lat)}, {fmtCoord(e.origin_lon)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-2.5 h-2.5 text-red-400" />
                    <span className="text-foreground">{fmtCoord(e.target_lat)}, {fmtCoord(e.target_lon)}</span>
                  </div>
                </div>
                <div className="text-[8px] font-mono text-muted-foreground/70 mt-0.5 truncate">
                  ID {e.threat_id}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default AuditTrail;
