
CREATE TABLE public.threats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lon DOUBLE PRECISION NOT NULL,
  target_lat DOUBLE PRECISION NOT NULL,
  target_lon DOUBLE PRECISION NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  eta_seconds INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'active',
  radar_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.interceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  threat_id UUID NOT NULL REFERENCES public.threats(id) ON DELETE CASCADE,
  intercepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  intercepted_by TEXT
);

ALTER TABLE public.threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "threats_public_select" ON public.threats FOR SELECT USING (true);
CREATE POLICY "threats_public_insert" ON public.threats FOR INSERT WITH CHECK (true);
CREATE POLICY "threats_public_update" ON public.threats FOR UPDATE USING (true);
CREATE POLICY "threats_public_delete" ON public.threats FOR DELETE USING (true);

CREATE POLICY "interceptions_public_select" ON public.interceptions FOR SELECT USING (true);
CREATE POLICY "interceptions_public_insert" ON public.interceptions FOR INSERT WITH CHECK (true);

ALTER TABLE public.threats REPLICA IDENTITY FULL;
ALTER TABLE public.interceptions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.threats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interceptions;
