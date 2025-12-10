import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface RadarTarget {
  id: string;
  angle: number;
  distance: number;
  altitude: number;
  type: 'hostile' | 'neutral' | 'unknown' | 'friendly';
  velocity?: number;
  label?: string;
  trajectory?: { angle: number; distance: number }[];
  predictedPath?: { x: number; y: number }[];
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

  // Generate random targets with trajectory history
  useEffect(() => {
    if (!active) {
      setInternalTargets([]);
      setVisibleTargets(new Set());
      return;
    }

    const generateTargets = () => {
      const count = Math.floor(Math.random() * 5) + 3;
      const newTargets: RadarTarget[] = [];
      const types: RadarTarget['type'][] = ['hostile', 'neutral', 'unknown', 'friendly'];

      for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const baseAngle = Math.random() * 360;
        const baseDistance = 20 + Math.random() * 60;

        // Generate trajectory history
        const trajectory: { angle: number; distance: number }[] = [];
        for (let j = 0; j < 5; j++) {
          trajectory.push({
            angle: baseAngle - j * 2 + Math.random() * 2,
            distance: baseDistance - j * 3 + Math.random() * 2
          });
        }

        // Generate predicted path
        const predictedPath: { x: number; y: number }[] = [];
        for (let j = 1; j <= 4; j++) {
          const predAngle = baseAngle + j * 3;
          const predDistance = baseDistance + j * 4;
          const radians = (predAngle - 90) * (Math.PI / 180);
          predictedPath.push({
            x: 50 + (predDistance / 2.2) * Math.cos(radians),
            y: 50 + (predDistance / 2.2) * Math.sin(radians)
          });
        }

        newTargets.push({
          id: `target-${Date.now()}-${i}`,
          angle: baseAngle,
          distance: baseDistance,
          altitude: Math.random() * 100,
          type,
          velocity: 100 + Math.random() * 700,
          label: `TGT-${String(i + 1).padStart(2, '0')}`,
          trajectory,
          predictedPath
        });
      }

      setInternalTargets(newTargets);
    };

    generateTargets();
    const interval = setInterval(generateTargets, 12000);
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

  // Reveal targets
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
        }, 5000);
      }
    });
  }, [sweepAngle, externalTargets, internalTargets]);

  const targets = externalTargets || internalTargets;

  const getTargetColor = (type: RadarTarget['type']) => {
    switch (type) {
      case 'hostile': return { bg: 'bg-red-500', text: 'text-red-500', glow: 'rgba(255,0,0,0.6)', stroke: '#ef4444' };
      case 'neutral': return { bg: 'bg-yellow-400', text: 'text-yellow-400', glow: 'rgba(255,255,0,0.4)', stroke: '#facc15' };
      case 'friendly': return { bg: 'bg-emerald-400', text: 'text-emerald-400', glow: 'rgba(0,255,100,0.4)', stroke: '#34d399' };
      case 'unknown': return { bg: 'bg-cyan-400', text: 'text-cyan-400', glow: 'rgba(0,200,255,0.4)', stroke: '#22d3ee' };
    }
  };

  const getTargetPosition = (target: RadarTarget) => {
    const radians = (target.angle - 90) * (Math.PI / 180);
    const x = 50 + (target.distance / 2.2) * Math.cos(radians);
    const y = 50 + (target.distance / 2.2) * Math.sin(radians);
    return { x, y };
  };

  const getTrajectoryPosition = (point: { angle: number; distance: number }) => {
    const radians = (point.angle - 90) * (Math.PI / 180);
    const x = 50 + (point.distance / 2.2) * Math.cos(radians);
    const y = 50 + (point.distance / 2.2) * Math.sin(radians);
    return { x, y };
  };

  return (
    <div className={cn("relative h-full min-h-[280px]", className)}>
      <div className="absolute inset-0 overflow-hidden rounded bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full">
          {/* Radial lines from center */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = i * 30;
            const radians = (angle - 90) * (Math.PI / 180);
            const x2 = 50 + 45 * Math.cos(radians);
            const y2 = 50 + 45 * Math.sin(radians);
            return (
              <line
                key={`radial-${i}`}
                x1="50%"
                y1="50%"
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="hsl(30, 80%, 50%)"
                strokeWidth="0.5"
                opacity="0.2"
              />
            );
          })}

          {/* Horizontal grid */}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1="0"
              y1={`${15 + i * 8}%`}
              x2="100%"
              y2={`${15 + i * 8}%`}
              stroke="hsl(30, 80%, 50%)"
              strokeWidth="0.3"
              opacity={0.15 + i * 0.02}
            />
          ))}

          {/* Vertical grid */}
          {Array.from({ length: 16 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={`${i * 6.5}%`}
              y1="10%"
              x2={`${i * 6.5}%`}
              y2="90%"
              stroke="hsl(30, 80%, 50%)"
              strokeWidth="0.3"
              opacity="0.15"
            />
          ))}

          {/* Trajectory lines */}
          {targets.map(target => {
            if (!visibleTargets.has(target.id) || !target.trajectory) return null;
            const colors = getTargetColor(target.type);
            const pos = getTargetPosition(target);

            return (
              <g key={`trajectory-${target.id}`}>
                {/* Trail line */}
                <polyline
                  points={target.trajectory.map(p => {
                    const tp = getTrajectoryPosition(p);
                    return `${tp.x}%,${tp.y}%`;
                  }).join(' ')}
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth="1"
                  opacity="0.4"
                  strokeDasharray="3,2"
                />

                {/* Trail dots */}
                {target.trajectory.map((p, idx) => {
                  const tp = getTrajectoryPosition(p);
                  return (
                    <circle
                      key={idx}
                      cx={`${tp.x}%`}
                      cy={`${tp.y}%`}
                      r={2 - idx * 0.3}
                      fill={colors.stroke}
                      opacity={0.6 - idx * 0.1}
                    />
                  );
                })}

                {/* Predicted path */}
                {target.predictedPath && (
                  <>
                    <polyline
                      points={[`${pos.x}%,${pos.y}%`, ...target.predictedPath.map(p => `${p.x}%,${p.y}%`)].join(' ')}
                      fill="none"
                      stroke={colors.stroke}
                      strokeWidth="1.5"
                      opacity="0.3"
                      strokeDasharray="6,4"
                    />
                    {/* Prediction endpoint */}
                    {target.predictedPath.length > 0 && (
                      <circle
                        cx={`${target.predictedPath[target.predictedPath.length - 1].x}%`}
                        cy={`${target.predictedPath[target.predictedPath.length - 1].y}%`}
                        r="4"
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth="1"
                        opacity="0.5"
                      />
                    )}
                  </>
                )}

                {/* Connecting line to center */}
                <line
                  x1="50%"
                  y1="50%"
                  x2={`${pos.x}%`}
                  y2={`${pos.y}%`}
                  stroke={colors.stroke}
                  strokeWidth="0.5"
                  opacity="0.3"
                  strokeDasharray="2,2"
                />
              </g>
            );
          })}
        </svg>

        {/* Range circles */}
        <div className="absolute inset-0 flex items-center justify-center">
          {[85, 65, 45, 25].map((size, idx) => (
            <div
              key={size}
              className="absolute rounded-full border"
              style={{
                width: `${size}%`,
                height: `${size * 0.7}%`,
                borderColor: idx === 0 ? 'rgba(255, 60, 60, 0.4)' : 'rgba(255, 120, 60, 0.25)',
                borderWidth: idx === 0 ? '2px' : '1px',
                transform: 'perspective(600px) rotateX(55deg)',
                boxShadow: idx === 0 ? '0 0 15px rgba(255, 60, 60, 0.2)' : 'none'
              }}
            />
          ))}
        </div>

        {/* Sweep beam */}
        {active && (
          <>
            <div
              className="absolute left-1/2 top-1/2 w-1/2 h-0.5 origin-left"
              style={{
                transform: `rotate(${sweepAngle}deg)`,
                background: 'linear-gradient(90deg, rgba(255,60,60,0.9) 0%, transparent 100%)',
                boxShadow: '0 0 20px rgba(255,60,60,0.4)',
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `conic-gradient(from ${sweepAngle - 25}deg at 50% 50%, 
                  rgba(255,60,60,0.12) 0deg, 
                  rgba(255,60,60,0.03) 15deg,
                  transparent 30deg, 
                  transparent 360deg)`
              }}
            />
          </>
        )}

        {/* Center point */}
        <div className="absolute left-1/2 top-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary border border-primary/50 z-20"
          style={{ boxShadow: '0 0 12px rgba(0,255,0,0.5)' }}
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
              <div
                className={cn("w-2.5 h-2.5 rounded-full", colors.bg)}
                style={{ boxShadow: `0 0 10px ${colors.glow}` }}
              >
                {target.type === 'hostile' && isVisible && (
                  <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />
                )}
              </div>
              {isVisible && (
                <div className={cn("absolute left-4 -top-1 text-[8px] font-mono whitespace-nowrap", colors.text)}>
                  <div className="font-bold">{target.label}</div>
                  <div className="opacity-70">{(target.distance * 50).toFixed(0)}m</div>
                </div>
              )}
            </div>
          );
        })}

        {/* Bearing indicator */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-xl font-display text-orange-500 font-bold">
          {String(Math.round(sweepAngle)).padStart(3, '0')}°
        </div>

        {/* Status */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-[9px] font-mono">
            <span className="text-muted-foreground">RADAR</span>
            <span className={cn("px-1 rounded text-black", active ? "bg-emerald-500" : "bg-muted")}>
              {active ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* Selected target info */}
      {selectedTarget && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur border border-border rounded p-2 min-w-[180px] z-30">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={cn("w-2.5 h-2.5 rounded-full", getTargetColor(selectedTarget.type).bg)} />
            <span className="font-display text-sm text-primary">{selectedTarget.label}</span>
            <span className={cn("text-[10px] uppercase", getTargetColor(selectedTarget.type).text)}>
              {selectedTarget.type}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] font-mono">
            <span className="text-muted-foreground">RANGE:</span>
            <span>{(selectedTarget.distance * 50).toFixed(0)}m</span>
            <span className="text-muted-foreground">BEARING:</span>
            <span>{selectedTarget.angle.toFixed(1)}°</span>
            <span className="text-muted-foreground">VELOCITY:</span>
            <span>{selectedTarget.velocity?.toFixed(0) || 0} m/s</span>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-card/80 backdrop-blur border-t border-border p-1.5">
        <div className="flex items-center justify-between text-[9px] font-mono">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-muted-foreground">HOSTILE:</span>
              <span className="text-red-500">{targets.filter(t => t.type === 'hostile' && visibleTargets.has(t.id)).length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-muted-foreground">TRACKED:</span>
              <span className="text-emerald-400">{targets.filter(t => visibleTargets.has(t.id)).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Radar3DDisplay;
