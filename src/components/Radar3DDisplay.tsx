import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface RadarTarget {
  id: string;
  angle: number;
  distance: number;
  altitude: number;
  type: 'hostile' | 'neutral' | 'unknown' | 'friendly';
  velocity?: number;
  label?: string;
}

interface Radar3DDisplayProps {
  targets?: RadarTarget[];
  active?: boolean;
  className?: string;
}

const Radar3DDisplay: React.FC<Radar3DDisplayProps> = ({
  targets: externalTargets,
  active = true,
  className
}) => {
  const [sweepAngle, setSweepAngle] = useState(0);
  const [internalTargets, setInternalTargets] = useState<RadarTarget[]>([]);
  const [visibleTargets, setVisibleTargets] = useState<Set<string>>(new Set());
  const [selectedTarget, setSelectedTarget] = useState<RadarTarget | null>(null);

  // Generate random targets when active
  useEffect(() => {
    if (!active) {
      setInternalTargets([]);
      setVisibleTargets(new Set());
      return;
    }

    const generateTargets = () => {
      const count = Math.floor(Math.random() * 6) + 2;
      const newTargets: RadarTarget[] = [];
      const types: RadarTarget['type'][] = ['hostile', 'neutral', 'unknown', 'friendly'];
      
      for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        newTargets.push({
          id: `target-${Date.now()}-${i}`,
          angle: Math.random() * 360,
          distance: 15 + Math.random() * 75,
          altitude: Math.random() * 100,
          type,
          velocity: Math.random() * 800,
          label: `TGT-${String(i + 1).padStart(2, '0')}`
        });
      }
      
      setInternalTargets(newTargets);
    };

    generateTargets();
    const interval = setInterval(generateTargets, 10000);
    
    return () => clearInterval(interval);
  }, [active]);

  // Sweep animation
  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setSweepAngle(prev => (prev + 1.5) % 360);
    }, 30);

    return () => clearInterval(interval);
  }, [active]);

  // Reveal targets when sweep passes over them
  useEffect(() => {
    const targets = externalTargets || internalTargets;
    
    targets.forEach(target => {
      const angleDiff = Math.abs(sweepAngle - target.angle);
      if (angleDiff < 8 || angleDiff > 352) {
        setVisibleTargets(prev => new Set(prev).add(target.id));
        
        setTimeout(() => {
          setVisibleTargets(prev => {
            const next = new Set(prev);
            next.delete(target.id);
            return next;
          });
        }, 4000);
      }
    });
  }, [sweepAngle, externalTargets, internalTargets]);

  const targets = externalTargets || internalTargets;

  const getTargetColor = (type: RadarTarget['type']) => {
    switch (type) {
      case 'hostile': return { bg: 'bg-red-500', text: 'text-red-500', glow: 'rgba(255,0,0,0.6)' };
      case 'neutral': return { bg: 'bg-yellow-400', text: 'text-yellow-400', glow: 'rgba(255,255,0,0.4)' };
      case 'friendly': return { bg: 'bg-emerald-400', text: 'text-emerald-400', glow: 'rgba(0,255,100,0.4)' };
      case 'unknown': return { bg: 'bg-cyan-400', text: 'text-cyan-400', glow: 'rgba(0,200,255,0.4)' };
    }
  };

  const getTargetPosition = (target: RadarTarget) => {
    const radians = (target.angle - 90) * (Math.PI / 180);
    const x = 50 + (target.distance / 2.2) * Math.cos(radians);
    const y = 50 + (target.distance / 2.2) * Math.sin(radians);
    return { x, y };
  };

  const getBearingLabel = (angle: number) => {
    return String(Math.round(angle)).padStart(3, '0');
  };

  return (
    <div className={cn("relative h-full min-h-[300px]", className)}>
      {/* 3D Perspective Grid Background */}
      <div className="absolute inset-0 overflow-hidden rounded bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Grid perspective lines - horizontal */}
        <svg className="absolute inset-0 w-full h-full opacity-30">
          {/* Horizontal grid lines with perspective */}
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1="0"
              y1={`${20 + i * 6}%`}
              x2="100%"
              y2={`${20 + i * 6}%`}
              stroke="hsl(30, 80%, 50%)"
              strokeWidth="0.5"
              opacity={0.3 + (i * 0.05)}
            />
          ))}
          {/* Vertical grid lines */}
          {Array.from({ length: 20 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={`${i * 5.5}%`}
              y1="15%"
              x2={`${i * 5.5}%`}
              y2="95%"
              stroke="hsl(30, 80%, 50%)"
              strokeWidth="0.5"
              opacity="0.2"
            />
          ))}
        </svg>

        {/* Range circles with 3D effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          {[90, 70, 50, 30].map((size, idx) => (
            <div
              key={size}
              className="absolute rounded-full border"
              style={{
                width: `${size}%`,
                height: `${size * 0.6}%`,
                borderColor: idx === 0 ? 'rgba(255, 60, 60, 0.5)' : 'rgba(255, 120, 60, 0.3)',
                borderWidth: idx === 0 ? '2px' : '1px',
                transform: 'perspective(500px) rotateX(60deg)',
                boxShadow: idx === 0 ? '0 0 20px rgba(255, 60, 60, 0.3)' : 'none'
              }}
            />
          ))}
        </div>

        {/* Sweep effect */}
        {active && (
          <div
            className="absolute left-1/2 top-1/2 w-1/2 h-1 origin-left"
            style={{
              transform: `rotate(${sweepAngle}deg)`,
              background: 'linear-gradient(90deg, rgba(255,60,60,0.8) 0%, transparent 100%)',
              boxShadow: '0 0 30px rgba(255,60,60,0.5)',
              filter: 'blur(1px)'
            }}
          />
        )}

        {/* Sweep cone glow */}
        {active && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `conic-gradient(from ${sweepAngle - 30}deg at 50% 50%, 
                rgba(255,60,60,0.15) 0deg, 
                rgba(255,60,60,0.05) 20deg,
                transparent 40deg, 
                transparent 360deg)`
            }}
          />
        )}

        {/* Center point */}
        <div className="absolute left-1/2 top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary border-2 border-primary/50 z-20" 
          style={{ boxShadow: '0 0 15px rgba(0,255,0,0.5)' }} 
        />

        {/* Targets */}
        {targets.map(target => {
          const pos = getTargetPosition(target);
          const isVisible = visibleTargets.has(target.id);
          const colors = getTargetColor(target.type);
          
          return (
            <div
              key={target.id}
              className={cn(
                "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 cursor-pointer z-10",
                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onClick={() => setSelectedTarget(selectedTarget?.id === target.id ? null : target)}
            >
              {/* Target marker */}
              <div 
                className={cn("w-3 h-3 rounded-full", colors.bg)}
                style={{ boxShadow: `0 0 12px ${colors.glow}` }}
              >
                {target.type === 'hostile' && isVisible && (
                  <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50" />
                )}
              </div>
              
              {/* Target label */}
              {isVisible && (
                <div className={cn("absolute left-4 top-0 text-[9px] font-mono whitespace-nowrap", colors.text)}>
                  <div>{target.label}</div>
                  <div className="text-[8px] opacity-70">
                    RNG {(target.distance * 50).toFixed(0)}m
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Bearing indicators */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-2xl font-display text-orange-500 font-bold tracking-wider">
          {getBearingLabel(sweepAngle)}
        </div>
        <div className="absolute top-2 right-4 text-2xl font-display text-cyan-400 font-bold">
          090
        </div>
        <div className="absolute bottom-2 left-4 text-lg font-display text-orange-400 font-bold">
          02
        </div>

        {/* Status indicators */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <span className="text-muted-foreground">RADAR</span>
            <span className={cn("px-1 rounded", active ? "bg-emerald-500 text-black" : "bg-muted text-muted-foreground")}>
              {active ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <span className="text-muted-foreground">XMIT</span>
            <span className="px-1 rounded bg-cyan-500 text-black">XMIT</span>
          </div>
        </div>
      </div>

      {/* Selected target info overlay */}
      {selectedTarget && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur border border-border rounded p-3 min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-3 h-3 rounded-full", getTargetColor(selectedTarget.type).bg)} />
            <span className="font-display text-sm text-primary">{selectedTarget.label}</span>
            <span className={cn("text-xs uppercase", getTargetColor(selectedTarget.type).text)}>
              {selectedTarget.type}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
            <div className="text-muted-foreground">RANGE:</div>
            <div className="text-foreground">{(selectedTarget.distance * 50).toFixed(0)}m</div>
            <div className="text-muted-foreground">BEARING:</div>
            <div className="text-foreground">{selectedTarget.angle.toFixed(1)}°</div>
            <div className="text-muted-foreground">ALTITUDE:</div>
            <div className="text-foreground">{selectedTarget.altitude.toFixed(0)}m</div>
            <div className="text-muted-foreground">VELOCITY:</div>
            <div className="text-foreground">{selectedTarget.velocity?.toFixed(0) || 0} m/s</div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-card/80 backdrop-blur border-t border-border p-2">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">HOSTILE:</span>
              <span className="text-red-500">{targets.filter(t => t.type === 'hostile' && visibleTargets.has(t.id)).length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-muted-foreground">TRACKED:</span>
              <span className="text-emerald-400">{targets.filter(t => visibleTargets.has(t.id)).length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">SWEEP:</span>
            <span className="text-cyan-400">{getBearingLabel(sweepAngle)}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Radar3DDisplay;
