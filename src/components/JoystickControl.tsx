import React, { useState, useRef, useCallback, Suspense, useEffect, Component, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Crosshair, RotateCcw, Gauge, Eye, EyeOff } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useJoystickStore } from '@/stores/joystickStore';

interface JoystickControlProps {
  active?: boolean;
  className?: string;
  onPositionChange?: (x: number, y: number) => void;
}

const GLB_URL = '/joystick.glb';

// Error boundary so a failed GLB fetch never blanks the whole app
class GLBErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.hasError ? null : this.props.children; }
}

const JoystickModel: React.FC<{ tiltX: number; tiltZ: number; sweep: boolean }> = ({
  tiltX,
  tiltZ,
  sweep,
}) => {
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

  return (
    <group ref={ref}>
      <primitive object={scene} scale={1.2} />
    </group>
  );
};

const JoystickControl: React.FC<JoystickControlProps> = ({
  active = true,
  className,
  onPositionChange,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [calibrated, setCalibrated] = useState(true);
  const [sweep, setSweep] = useState(false);
  const [sensitivity, setSensitivity] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const visible = useJoystickStore((s) => s.visible);
  const setVisible = useJoystickStore((s) => s.setVisible);
  const syncVector = useJoystickStore((s) => s.setVector);
  const setStoreCalibrated = useJoystickStore((s) => s.setCalibrated);

  const maxDistance = 60;

  // Push to shared store + parent
  useEffect(() => {
    const nx = position.x / maxDistance;
    const ny = position.y / maxDistance;
    syncVector(nx, ny);
    onPositionChange?.(nx, ny);
  }, [position, onPositionChange, syncVector]);

  useEffect(() => {
    setStoreCalibrated(calibrated);
  }, [calibrated, setStoreCalibrated]);

  const handleStart = useCallback(() => {
    if (!active) return;
    setIsDragging(true);
  }, [active]);

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = (clientX - cx) * sensitivity;
      let dy = (clientY - cy) * sensitivity;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDistance) {
        const s = maxDistance / dist;
        dx *= s;
        dy *= s;
      }
      setPosition({ x: dx, y: dy });
    },
    [isDragging, sensitivity],
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
  }, []);

  const calibrate = () => {
    setCalibrated(false);
    setSweep(true);
    setTimeout(() => {
      setPosition({ x: 0, y: 0 });
      setCalibrated(true);
      setSweep(false);
    }, 1500);
  };

  const angle = Math.atan2(position.y, position.x) * (180 / Math.PI);
  const magnitude = (Math.sqrt(position.x * position.x + position.y * position.y) / maxDistance) * 100;

  // Tilt the GLB model proportional to joystick offset
  const tiltX = (position.y / maxDistance) * 0.5;
  const tiltZ = (position.x / maxDistance) * 0.5;

  return (
    <div className={cn('relative h-full min-h-[260px] flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-primary" />
          <span className="text-xs font-display text-primary">JOYSTICK CONTROL</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVisible(!visible)}
            className="p-1 rounded border border-border/50 bg-card/40 hover:bg-card text-muted-foreground"
            title="Toggle 3D model"
          >
            {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              calibrated ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse',
            )}
          />
          <span className="text-[9px] font-mono text-muted-foreground">
            {calibrated ? 'CALIBRATED' : 'CALIBRATING...'}
          </span>
        </div>
      </div>

      {/* Joystick area - 3D plate + drag surface */}
      <div className="flex-1 flex items-center justify-center">
        <div
          ref={containerRef}
          className="relative w-44 h-44 rounded-full bg-gradient-to-b from-card to-background border-2 border-border overflow-hidden select-none"
          onMouseDown={(e) => handleStart()}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={() => isDragging && handleEnd()}
          onTouchStart={(e) => {
            e.preventDefault();
            handleStart();
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            handleMove(t.clientX, t.clientY);
          }}
          onTouchEnd={handleEnd}
        >
          {/* Grid + cardinal markers */}
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

          {/* 3D GLB joystick */}
          {visible ? (
            <Canvas camera={{ position: [0, 1.6, 2.6], fov: 40 }} gl={{ antialias: true, alpha: true }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[3, 4, 2]} intensity={1.1} />
              <pointLight position={[-3, 2, -2]} intensity={0.4} color="#22c55e" />
              <Suspense
                fallback={
                  <Html center>
                    <span className="text-[9px] font-mono text-muted-foreground">LOADING MODEL…</span>
                  </Html>
                }
              >
                <JoystickModel tiltX={tiltX} tiltZ={tiltZ} sweep={sweep} />
              </Suspense>
            </Canvas>
          ) : (
            // 2D fallback knob
            <div
              className={cn(
                'absolute w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-primary shadow-lg',
                isDragging ? 'cursor-grabbing' : 'cursor-grab',
              )}
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

      {/* Data Display */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="bg-card/50 rounded border border-border/50 p-2">
          <div className="text-[8px] text-muted-foreground font-mono">X-AXIS</div>
          <div className="text-sm font-mono text-primary">
            {((position.x / maxDistance) * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-card/50 rounded border border-border/50 p-2">
          <div className="text-[8px] text-muted-foreground font-mono">Y-AXIS</div>
          <div className="text-sm font-mono text-cyan-400">
            {((-position.y / maxDistance) * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-card/50 rounded border border-border/50 p-2">
          <div className="text-[8px] text-muted-foreground font-mono">ANGLE</div>
          <div className="text-sm font-mono text-yellow-400">
            {magnitude > 5 ? `${angle.toFixed(0)}°` : '--'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={calibrate}
          disabled={!calibrated}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-colors',
            calibrated
              ? 'bg-accent/20 text-accent border border-accent/40 hover:bg-accent/30'
              : 'bg-muted/20 text-muted-foreground border border-border cursor-not-allowed',
          )}
        >
          <RotateCcw className="w-3 h-3" />
          RECALIBRATE
        </button>

        <div className="flex-1 flex items-center gap-1 px-2 py-1 bg-card/50 rounded border border-border/50">
          <Gauge className="w-3 h-3 text-muted-foreground" />
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-primary"
          />
          <span className="text-[9px] font-mono text-muted-foreground w-6">
            {sensitivity.toFixed(1)}x
          </span>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30 text-[9px] font-mono">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">MAG:</span>
          <span className="text-primary">{magnitude.toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">SYNC:</span>
          <span className="text-emerald-400">LIVE</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={cn('w-2 h-2 rounded-full', active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')}
          />
          <span className="text-muted-foreground">{active ? 'ACTIVE' : 'OFFLINE'}</span>
        </div>
      </div>
    </div>
  );
};

export default JoystickControl;
