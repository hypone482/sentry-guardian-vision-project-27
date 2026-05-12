import React, { useState, useRef, useCallback, Suspense, useEffect, Component, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Crosshair, RotateCcw, Gauge, Eye, EyeOff, AlertTriangle, RefreshCw, Activity, Sparkles, X } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useJoystickStore } from '@/stores/joystickStore';
import { supabase } from '@/integrations/supabase/client';

interface JoystickControlProps {
  active?: boolean;
  className?: string;
  onPositionChange?: (x: number, y: number) => void;
}

const GLB_URL = '/joystick.glb';

interface GLBDiagnostics {
  url: string;
  status: number | null;
  statusText: string;
  ok: boolean;
  durationMs: number;
  bytes: number | null;
  attemptedAt: string;
  error?: string;
}

class GLBErrorBoundary extends Component<
  { children: ReactNode; onError: (err: Error) => void; resetKey: number },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { this.props.onError(err); }
  componentDidUpdate(prev: { resetKey: number }) {
    if (prev.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  render() { return this.state.hasError ? null : this.props.children; }
}

const JoystickModel: React.FC<{ tiltX: number; tiltZ: number; sweep: boolean }> = ({ tiltX, tiltZ, sweep }) => {
  const { scene } = useGLTF(GLB_URL) as any;
  const ref = useRef<THREE.Group>(null);
  const sweepStart = useRef<number | null>(null);

  useFrame((state) => {
    if (!ref.current) return;
    let targetX = tiltX;
    let targetZ = tiltZ;
    if (sweep) {
      if (sweepStart.current === null) sweepStart.current = state.clock.elapsedTime;
      const t = state.clock.elapsedTime - sweepStart.current;
      targetX = Math.sin(t * 4) * 0.4;
      targetZ = Math.cos(t * 4) * 0.4;
      if (t > 1.4) sweepStart.current = null;
    } else {
      sweepStart.current = null;
    }
    ref.current.rotation.x += (targetX - ref.current.rotation.x) * 0.18;
    ref.current.rotation.z += (-targetZ - ref.current.rotation.z) * 0.18;
  });

  return <group ref={ref}><primitive object={scene} scale={1.2} /></group>;
};

const JoystickControl: React.FC<JoystickControlProps> = ({ active = true, className, onPositionChange }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [calibrated, setCalibrated] = useState(true);
  const [sweep, setSweep] = useState(false);
  const [sensitivity, setSensitivity] = useState(1);
  const [glbFailed, setGlbFailed] = useState(false);
  const [glbErrorMsg, setGlbErrorMsg] = useState<string>('');
  const [diagnostics, setDiagnostics] = useState<GLBDiagnostics | null>(null);
  const [showDiag, setShowDiag] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const visible = useJoystickStore((s) => s.visible);
  const setVisible = useJoystickStore((s) => s.setVisible);
  const syncVector = useJoystickStore((s) => s.setVector);
  const setStoreCalibrated = useJoystickStore((s) => s.setCalibrated);

  const maxDistance = 60;

  // Probe GLB URL — captures status, timing, bytes — runs on mount and on retry
  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      const t0 = performance.now();
      const attemptedAt = new Date().toISOString();
      try {
        const res = await fetch(GLB_URL, { method: 'GET', cache: 'reload' });
        const buf = await res.arrayBuffer();
        const durationMs = Math.round(performance.now() - t0);
        if (cancelled) return;
        setDiagnostics({
          url: new URL(GLB_URL, window.location.origin).href,
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
          durationMs,
          bytes: buf.byteLength,
          attemptedAt,
        });
      } catch (e: any) {
        const durationMs = Math.round(performance.now() - t0);
        if (cancelled) return;
        setDiagnostics({
          url: new URL(GLB_URL, window.location.origin).href,
          status: null,
          statusText: 'NETWORK_ERROR',
          ok: false,
          durationMs,
          bytes: null,
          attemptedAt,
          error: String(e?.message ?? e),
        });
      }
    };
    probe();
    return () => { cancelled = true; };
  }, [loadKey]);

  useEffect(() => {
    const nx = position.x / maxDistance;
    const ny = position.y / maxDistance;
    syncVector(nx, ny);
    onPositionChange?.(nx, ny);
  }, [position, onPositionChange, syncVector]);

  useEffect(() => { setStoreCalibrated(calibrated); }, [calibrated, setStoreCalibrated]);

  const handleStart = useCallback(() => { if (active) setIsDragging(true); }, [active]);
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = (clientX - cx) * sensitivity;
    let dy = (clientY - cy) * sensitivity;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDistance) { const s = maxDistance / dist; dx *= s; dy *= s; }
    setPosition({ x: dx, y: dy });
  }, [isDragging, sensitivity]);
  const handleEnd = useCallback(() => { setIsDragging(false); setPosition({ x: 0, y: 0 }); }, []);

  const calibrate = () => {
    setCalibrated(false); setSweep(true);
    setTimeout(() => { setPosition({ x: 0, y: 0 }); setCalibrated(true); setSweep(false); }, 1500);
  };

  const retryGLB = () => {
    setGlbFailed(false);
    setGlbErrorMsg('');
    setAiMsg('');
    try { (useGLTF as any).clear?.(GLB_URL); } catch {}
    setLoadKey((k) => k + 1);
  };

  const askAI = async () => {
    setAiBusy(true);
    setAiMsg('');
    try {
      const { data, error } = await supabase.functions.invoke('joystick-assist', {
        body: { diagnostics: { ...diagnostics, runtimeError: glbErrorMsg, userAgent: navigator.userAgent, online: navigator.onLine } },
      });
      if (error) throw error;
      setAiMsg((data as any)?.message ?? (data as any)?.error ?? 'No response');
    } catch (e: any) {
      setAiMsg(`AI assist failed: ${e?.message ?? e}`);
    } finally {
      setAiBusy(false);
    }
  };

  const angle = Math.atan2(position.y, position.x) * (180 / Math.PI);
  const magnitude = (Math.sqrt(position.x * position.x + position.y * position.y) / maxDistance) * 100;
  const tiltX = (position.y / maxDistance) * 0.5;
  const tiltZ = (position.x / maxDistance) * 0.5;

  return (
    <div className={cn('relative h-full min-h-[260px] flex flex-col', className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-primary" />
          <span className="text-xs font-display text-primary">JOYSTICK CONTROL</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDiag((v) => !v)}
            className={cn(
              'p-1 rounded border text-muted-foreground',
              diagnostics && !diagnostics.ok ? 'border-destructive/60 text-destructive bg-destructive/10' : 'border-border/50 bg-card/40 hover:bg-card',
            )}
            title="Toggle diagnostics"
          >
            <Activity className="w-3 h-3" />
          </button>
          <button onClick={() => setVisible(!visible)} className="p-1 rounded border border-border/50 bg-card/40 hover:bg-card text-muted-foreground" title="Toggle 3D model">
            {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
          <span className={cn('w-2 h-2 rounded-full', calibrated ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse')} />
          <span className="text-[9px] font-mono text-muted-foreground">{calibrated ? 'CALIBRATED' : 'CALIBRATING...'}</span>
        </div>
      </div>

      {/* GLB failure banner */}
      {glbFailed && (
        <div className="mb-2 rounded border border-destructive/60 bg-destructive/10 p-2 text-[10px] font-mono">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-3 h-3" />
            <span className="font-semibold">3D MODEL FAILED TO LOAD</span>
          </div>
          <div className="mt-1 text-muted-foreground break-all">{glbErrorMsg || 'Could not load /joystick.glb'}</div>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={retryGLB} className="flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90">
              <RefreshCw className="w-3 h-3" /> RETRY
            </button>
            <button onClick={askAI} disabled={aiBusy} className="flex items-center gap-1 px-2 py-1 rounded border border-accent/60 bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50">
              <Sparkles className="w-3 h-3" /> {aiBusy ? 'ANALYZING…' : 'AI ASSIST'}
            </button>
            <button onClick={() => setShowDiag(true)} className="ml-auto text-muted-foreground hover:text-foreground">VIEW DIAG</button>
          </div>
          {aiMsg && (
            <div className="mt-2 p-2 rounded bg-card/60 border border-accent/30 text-foreground whitespace-pre-wrap">{aiMsg}</div>
          )}
        </div>
      )}

      {/* Diagnostics panel */}
      {showDiag && (
        <div className="mb-2 rounded border border-border bg-card/70 p-2 text-[10px] font-mono">
          <div className="flex items-center justify-between mb-1">
            <span className="text-primary font-semibold">GLB DIAGNOSTICS</span>
            <button onClick={() => setShowDiag(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
          </div>
          {diagnostics ? (
            <div className="space-y-0.5 text-muted-foreground">
              <div><span className="text-foreground">URL:</span> <span className="break-all">{diagnostics.url}</span></div>
              <div><span className="text-foreground">STATUS:</span> <span className={diagnostics.ok ? 'text-emerald-400' : 'text-destructive'}>{diagnostics.status ?? '—'} {diagnostics.statusText}</span></div>
              <div><span className="text-foreground">TIME:</span> {diagnostics.durationMs} ms</div>
              <div><span className="text-foreground">SIZE:</span> {diagnostics.bytes != null ? `${(diagnostics.bytes / 1024).toFixed(1)} KB` : '—'}</div>
              <div><span className="text-foreground">AT:</span> {new Date(diagnostics.attemptedAt).toLocaleTimeString()}</div>
              {diagnostics.error && <div className="text-destructive">ERR: {diagnostics.error}</div>}
            </div>
          ) : (
            <div className="text-muted-foreground">probing…</div>
          )}
          <div className="mt-2 flex gap-2">
            <button onClick={retryGLB} className="flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-card"><RefreshCw className="w-3 h-3" /> Re-probe</button>
            <button onClick={askAI} disabled={aiBusy} className="flex items-center gap-1 px-2 py-1 rounded border border-accent/60 bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50"><Sparkles className="w-3 h-3" /> {aiBusy ? '…' : 'AI'}</button>
          </div>
          {aiMsg && !glbFailed && <div className="mt-2 p-2 rounded bg-card/60 border border-accent/30 text-foreground whitespace-pre-wrap">{aiMsg}</div>}
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
        <div
          ref={containerRef}
          className="relative w-44 h-44 rounded-full bg-gradient-to-b from-card to-background border-2 border-border overflow-hidden select-none"
          onMouseDown={() => handleStart()}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={() => isDragging && handleEnd()}
          onTouchStart={(e) => { e.preventDefault(); handleStart(); }}
          onTouchMove={(e) => { const t = e.touches[0]; handleMove(t.clientX, t.clientY); }}
          onTouchEnd={handleEnd}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.18" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.18" />
            <circle cx="50%" cy="50%" r="30%" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.12" />
            <circle cx="50%" cy="50%" r="46%" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.08" />
          </svg>
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-muted-foreground z-10">N</span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-muted-foreground z-10">S</span>
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-mono text-muted-foreground z-10">W</span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-mono text-muted-foreground z-10">E</span>

          {visible && !glbFailed ? (
            <GLBErrorBoundary
              resetKey={loadKey}
              onError={(err) => { setGlbFailed(true); setGlbErrorMsg(err?.message ?? 'Unknown GLB error'); }}
            >
              <Canvas key={loadKey} camera={{ position: [0, 1.6, 2.6], fov: 40 }} gl={{ antialias: true, alpha: true }}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[3, 4, 2]} intensity={1.1} />
                <pointLight position={[-3, 2, -2]} intensity={0.4} color="#22c55e" />
                <Suspense fallback={<Html center><span className="text-[9px] font-mono text-muted-foreground">LOADING MODEL…</span></Html>}>
                  <JoystickModel tiltX={tiltX} tiltZ={tiltZ} sweep={sweep} />
                </Suspense>
              </Canvas>
            </GLBErrorBoundary>
          ) : (
            <div
              className={cn('absolute w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-primary shadow-lg', isDragging ? 'cursor-grabbing' : 'cursor-grab')}
              style={{
                left: `calc(50% + ${position.x}px - 28px)`,
                top: `calc(50% + ${position.y}px - 28px)`,
                transition: isDragging ? 'none' : 'all 0.2s ease-out',
              }}
            >
              <div className="absolute inset-2 rounded-full bg-card/60 flex items-center justify-center">
                <Crosshair className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="bg-card/50 rounded border border-border/50 p-2">
          <div className="text-[8px] text-muted-foreground font-mono">X-AXIS</div>
          <div className="text-sm font-mono text-primary">{((position.x / maxDistance) * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-card/50 rounded border border-border/50 p-2">
          <div className="text-[8px] text-muted-foreground font-mono">Y-AXIS</div>
          <div className="text-sm font-mono text-cyan-400">{((-position.y / maxDistance) * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-card/50 rounded border border-border/50 p-2">
          <div className="text-[8px] text-muted-foreground font-mono">ANGLE</div>
          <div className="text-sm font-mono text-yellow-400">{magnitude > 5 ? `${angle.toFixed(0)}°` : '--'}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={calibrate}
          disabled={!calibrated}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-colors',
            calibrated ? 'bg-accent/20 text-accent border border-accent/40 hover:bg-accent/30' : 'bg-muted/20 text-muted-foreground border border-border cursor-not-allowed',
          )}
        >
          <RotateCcw className="w-3 h-3" /> RECALIBRATE
        </button>
        <div className="flex-1 flex items-center gap-1 px-2 py-1 bg-card/50 rounded border border-border/50">
          <Gauge className="w-3 h-3 text-muted-foreground" />
          <input type="range" min="0.5" max="2" step="0.1" value={sensitivity} onChange={(e) => setSensitivity(parseFloat(e.target.value))} className="flex-1 h-1 accent-primary" />
          <span className="text-[9px] font-mono text-muted-foreground w-6">{sensitivity.toFixed(1)}x</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30 text-[9px] font-mono">
        <div className="flex items-center gap-2"><span className="text-muted-foreground">MAG:</span><span className="text-primary">{magnitude.toFixed(0)}%</span></div>
        <div className="flex items-center gap-2"><span className="text-muted-foreground">SYNC:</span><span className="text-emerald-400">LIVE</span></div>
        <div className="flex items-center gap-1">
          <span className={cn('w-2 h-2 rounded-full', active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
          <span className="text-muted-foreground">{active ? 'ACTIVE' : 'OFFLINE'}</span>
        </div>
      </div>
    </div>
  );
};

export default JoystickControl;
