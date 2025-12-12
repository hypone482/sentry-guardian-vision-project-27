import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Plane, Target, AlertTriangle, HelpCircle, Shield, Crosshair } from 'lucide-react';

interface RadarTarget {
  id: string;
  angle: number;
  distance: number; // in meters (100m - 4000m)
  altitude: number; // elevation in meters
  type: 'hostile' | 'neutral' | 'unknown' | 'friendly';
  velocity: number; // m/s
  acceleration: number; // m/s²
  displacement: number; // total displacement in meters
  heading: number; // degrees
  label?: string;
  trajectory?: { angle: number; distance: number; time: number }[];
  predictedPath?: { x: number; y: number }[];
  lrfDistance?: number; // Laser Range Finder distance
}

interface Radar3DDisplayProps {
  targets?: RadarTarget[];
  active?: boolean;
  className?: string;
}

// Range circles in meters
const RANGE_CIRCLES = [100, 250, 500, 1000, 2000, 3000, 4000];
const MAX_RANGE = 4000; // 4km max range

const Radar3DDisplay: React.FC<Radar3DDisplayProps> = ({
  targets: externalTargets,
  active = true,
  className
}) => {
  const [sweepAngle, setSweepAngle] = useState(0);
  const [internalTargets, setInternalTargets] = useState<RadarTarget[]>([]);
  const [visibleTargets, setVisibleTargets] = useState<Set<string>>(new Set());
  const [selectedTarget, setSelectedTarget] = useState<RadarTarget | null>(null);

  // Generate random targets with trajectory history and detailed metrics
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
        const baseDistance = 100 + Math.random() * 3900; // 100m to 4000m
        const velocity = 50 + Math.random() * 450; // 50-500 m/s
        const acceleration = -5 + Math.random() * 10; // -5 to +5 m/s²

        // Generate trajectory history with timestamps
        const trajectory: { angle: number; distance: number; time: number }[] = [];
        let prevDist = baseDistance;
        for (let j = 0; j < 6; j++) {
          prevDist = Math.max(100, prevDist - velocity * 0.5 + Math.random() * 50);
          trajectory.push({
            angle: baseAngle - j * (velocity * 0.02) + Math.random() * 2,
            distance: prevDist,
            time: Date.now() - j * 500
          });
        }

        // Calculate displacement from trajectory
        const displacement = trajectory.length > 1 
          ? Math.sqrt(
              Math.pow(baseDistance - trajectory[trajectory.length - 1].distance, 2) +
              Math.pow((baseAngle - trajectory[trajectory.length - 1].angle) * (baseDistance / 57.3), 2)
            )
          : 0;

        // Generate predicted path
        const predictedPath: { x: number; y: number }[] = [];
        for (let j = 1; j <= 5; j++) {
          const predAngle = baseAngle + j * (velocity * 0.015);
          const predDistance = Math.min(MAX_RANGE, baseDistance + j * velocity * 0.3);
          const radians = (predAngle - 90) * (Math.PI / 180);
          const normalizedDist = (predDistance / MAX_RANGE) * 45;
          predictedPath.push({
            x: 50 + normalizedDist * Math.cos(radians),
            y: 50 + normalizedDist * Math.sin(radians)
          });
        }

        newTargets.push({
          id: `target-${Date.now()}-${i}`,
          angle: baseAngle,
          distance: baseDistance,
          altitude: 50 + Math.random() * 2000, // 50m to 2050m elevation
          type,
          velocity,
          acceleration,
          displacement,
          heading: (baseAngle + 180 + Math.random() * 30 - 15) % 360,
          label: `TGT-${String(i + 1).padStart(2, '0')}`,
          trajectory,
          predictedPath,
          lrfDistance: baseDistance + Math.random() * 10 - 5 // LRF with slight variance
        });
      }

      setInternalTargets(newTargets);
    };

    generateTargets();
    
    // Update target positions for movement simulation
    const moveInterval = setInterval(() => {
      setInternalTargets(prev => prev.map(target => {
        const newDistance = Math.max(100, Math.min(MAX_RANGE, 
          target.distance + (Math.random() - 0.5) * 50
        ));
        const newAngle = (target.angle + (Math.random() - 0.5) * 2 + 360) % 360;
        const newVelocity = Math.max(0, target.velocity + target.acceleration * 0.1);
        
        return {
          ...target,
          distance: newDistance,
          angle: newAngle,
          velocity: newVelocity,
          lrfDistance: newDistance + Math.random() * 10 - 5,
          displacement: target.displacement + Math.abs(target.distance - newDistance)
        };
      }));
    }, 500);

    const regenerateInterval = setInterval(generateTargets, 15000);
    
    return () => {
      clearInterval(moveInterval);
      clearInterval(regenerateInterval);
    };
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
        }, 6000);
      }
    });
  }, [sweepAngle, externalTargets, internalTargets]);

  const targets = externalTargets || internalTargets;

  const getTargetColor = (type: RadarTarget['type']) => {
    switch (type) {
      case 'hostile': return { bg: 'bg-red-500', text: 'text-red-500', glow: 'rgba(255,0,0,0.6)', stroke: '#ef4444', fill: '#ef4444' };
      case 'neutral': return { bg: 'bg-yellow-400', text: 'text-yellow-400', glow: 'rgba(255,255,0,0.4)', stroke: '#facc15', fill: '#facc15' };
      case 'friendly': return { bg: 'bg-emerald-400', text: 'text-emerald-400', glow: 'rgba(0,255,100,0.4)', stroke: '#34d399', fill: '#34d399' };
      case 'unknown': return { bg: 'bg-cyan-400', text: 'text-cyan-400', glow: 'rgba(0,200,255,0.4)', stroke: '#22d3ee', fill: '#22d3ee' };
    }
  };

  const getTargetIcon = (type: RadarTarget['type']) => {
    switch (type) {
      case 'hostile': return AlertTriangle;
      case 'neutral': return Plane;
      case 'friendly': return Shield;
      case 'unknown': return HelpCircle;
    }
  };

  const normalizeDistance = (distance: number) => {
    return (distance / MAX_RANGE) * 45; // 45% of radius max
  };

  const getTargetPosition = (target: RadarTarget) => {
    const radians = (target.angle - 90) * (Math.PI / 180);
    const normalizedDist = normalizeDistance(target.distance);
    const x = 50 + normalizedDist * Math.cos(radians);
    const y = 50 + normalizedDist * Math.sin(radians);
    return { x, y };
  };

  const getTrajectoryPosition = (point: { angle: number; distance: number }) => {
    const radians = (point.angle - 90) * (Math.PI / 180);
    const normalizedDist = normalizeDistance(point.distance);
    const x = 50 + normalizedDist * Math.cos(radians);
    const y = 50 + normalizedDist * Math.sin(radians);
    return { x, y };
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)}km`;
    }
    return `${Math.round(meters)}m`;
  };

  return (
    <div className={cn("relative h-full min-h-[320px]", className)}>
      <div className="absolute inset-0 overflow-hidden rounded bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full">
          {/* Radial lines from center */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = i * 30;
            const radians = (angle - 90) * (Math.PI / 180);
            const x2 = 50 + 48 * Math.cos(radians);
            const y2 = 50 + 48 * Math.sin(radians);
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

          {/* Range circles with labels */}
          {RANGE_CIRCLES.map((range, idx) => {
            const radius = normalizeDistance(range);
            const isKm = range >= 1000;
            const label = isKm ? `${range / 1000}km` : `${range}m`;
            
            return (
              <g key={`range-${range}`}>
                <circle
                  cx="50%"
                  cy="50%"
                  r={`${radius}%`}
                  fill="none"
                  stroke={idx === RANGE_CIRCLES.length - 1 ? 'rgba(255, 60, 60, 0.5)' : 'rgba(255, 120, 60, 0.3)'}
                  strokeWidth={idx === RANGE_CIRCLES.length - 1 ? '2' : '1'}
                  strokeDasharray={idx < 3 ? '4,4' : 'none'}
                />
                {/* Range labels */}
                <text
                  x={`${50 + radius - 2}%`}
                  y="49%"
                  fill="rgba(255, 120, 60, 0.7)"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {label}
                </text>
              </g>
            );
          })}

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
                  strokeWidth="1.5"
                  opacity="0.5"
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
                      r={3 - idx * 0.4}
                      fill={colors.fill}
                      opacity={0.7 - idx * 0.1}
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
                      opacity="0.4"
                      strokeDasharray="8,4"
                    />
                    {/* Prediction endpoint */}
                    {target.predictedPath.length > 0 && (
                      <circle
                        cx={`${target.predictedPath[target.predictedPath.length - 1].x}%`}
                        cy={`${target.predictedPath[target.predictedPath.length - 1].y}%`}
                        r="5"
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth="1.5"
                        opacity="0.5"
                        strokeDasharray="2,2"
                      />
                    )}
                  </>
                )}

                {/* Heading indicator */}
                <line
                  x1={`${pos.x}%`}
                  y1={`${pos.y}%`}
                  x2={`${pos.x + 3 * Math.cos((target.heading - 90) * Math.PI / 180)}%`}
                  y2={`${pos.y + 3 * Math.sin((target.heading - 90) * Math.PI / 180)}%`}
                  stroke={colors.stroke}
                  strokeWidth="2"
                  opacity="0.8"
                />
              </g>
            );
          })}
        </svg>

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
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <Crosshair className="w-5 h-5 text-primary" style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,0,0.6))' }} />
        </div>

        {/* Targets with icons */}
        {targets.map(target => {
          const pos = getTargetPosition(target);
          const isVisible = visibleTargets.has(target.id);
          const colors = getTargetColor(target.type);
          const TargetIcon = getTargetIcon(target.type);

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
              {/* Target icon */}
              <div
                className="relative"
                style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}
              >
                <TargetIcon 
                  className={cn("w-5 h-5", colors.text)} 
                  strokeWidth={2.5}
                />
                {target.type === 'hostile' && isVisible && (
                  <div className="absolute inset-0 animate-ping">
                    <TargetIcon className="w-5 h-5 text-red-500 opacity-40" />
                  </div>
                )}
              </div>
              
              {/* Target info label with LRF distance */}
              {isVisible && (
                <div 
                  className={cn(
                    "absolute left-6 -top-2 text-[8px] font-mono whitespace-nowrap bg-black/60 px-1.5 py-0.5 rounded border",
                    colors.text
                  )}
                  style={{ borderColor: colors.fill }}
                >
                  <div className="font-bold flex items-center gap-1">
                    {target.label}
                    <span className="text-orange-400">[LRF]</span>
                  </div>
                  <div className="opacity-90">
                    <span className="text-orange-300">D:</span> {formatDistance(target.lrfDistance || target.distance)}
                  </div>
                  <div className="opacity-80">
                    <span className="text-cyan-300">ELV:</span> {Math.round(target.altitude)}m
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Bearing indicator */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-xl font-display text-orange-500 font-bold">
          {String(Math.round(sweepAngle)).padStart(3, '0')}°
        </div>

        {/* Status and legend */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[9px] font-mono">
            <span className="text-muted-foreground">RADAR 3D</span>
            <span className={cn("px-1 rounded text-black", active ? "bg-emerald-500" : "bg-muted")}>
              {active ? 'ACTIVE' : 'OFF'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[7px] font-mono mt-1">
            <div className="flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-red-400">HST</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">FRD</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Plane className="w-3 h-3 text-yellow-400" />
              <span className="text-yellow-400">NTL</span>
            </div>
            <div className="flex items-center gap-0.5">
              <HelpCircle className="w-3 h-3 text-cyan-400" />
              <span className="text-cyan-400">UNK</span>
            </div>
          </div>
        </div>

        {/* Range indicator */}
        <div className="absolute top-1.5 right-1.5 text-[9px] font-mono text-orange-400">
          <div>MAX: 4.0km</div>
          <div className="text-muted-foreground">LRF: ACTIVE</div>
        </div>
      </div>

      {/* Selected target detailed info panel */}
      {selectedTarget && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur border border-border rounded-lg p-3 min-w-[260px] z-30 shadow-lg">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
            {React.createElement(getTargetIcon(selectedTarget.type), { 
              className: cn("w-5 h-5", getTargetColor(selectedTarget.type).text) 
            })}
            <span className="font-display text-sm text-primary">{selectedTarget.label}</span>
            <span className={cn("text-[10px] uppercase px-1.5 py-0.5 rounded", getTargetColor(selectedTarget.type).bg, "text-black font-bold")}>
              {selectedTarget.type}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-mono">
            {/* Distance & LRF */}
            <div className="col-span-2 bg-orange-500/10 rounded px-2 py-1 mb-1">
              <div className="flex justify-between">
                <span className="text-orange-400">LRF DISTANCE:</span>
                <span className="text-orange-300 font-bold">{formatDistance(selectedTarget.lrfDistance || selectedTarget.distance)}</span>
              </div>
            </div>
            
            <span className="text-muted-foreground">BEARING:</span>
            <span>{selectedTarget.angle.toFixed(1)}°</span>
            
            <span className="text-muted-foreground">ELEVATION:</span>
            <span className="text-cyan-400">{Math.round(selectedTarget.altitude)}m ASL</span>
            
            <span className="text-muted-foreground">VELOCITY:</span>
            <span className="text-emerald-400">{selectedTarget.velocity.toFixed(1)} m/s</span>
            
            <span className="text-muted-foreground">ACCELERATION:</span>
            <span className={selectedTarget.acceleration >= 0 ? "text-emerald-400" : "text-red-400"}>
              {selectedTarget.acceleration >= 0 ? '+' : ''}{selectedTarget.acceleration.toFixed(2)} m/s²
            </span>
            
            <span className="text-muted-foreground">DISPLACEMENT:</span>
            <span className="text-yellow-400">{formatDistance(selectedTarget.displacement)}</span>
            
            <span className="text-muted-foreground">HEADING:</span>
            <span>{selectedTarget.heading.toFixed(1)}°</span>
            
            {/* Trajectory info */}
            <div className="col-span-2 mt-1 pt-1 border-t border-border/50">
              <span className="text-muted-foreground">TRAJECTORY POINTS:</span>
              <span className="ml-2">{selectedTarget.trajectory?.length || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-card/90 backdrop-blur border-t border-border p-1.5">
        <div className="flex items-center justify-between text-[9px] font-mono">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-muted-foreground">HOSTILE:</span>
              <span className="text-red-500 font-bold">{targets.filter(t => t.type === 'hostile' && visibleTargets.has(t.id)).length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3 text-emerald-400" />
              <span className="text-muted-foreground">TRACKED:</span>
              <span className="text-emerald-400 font-bold">{targets.filter(t => visibleTargets.has(t.id)).length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">TOTAL:</span>
              <span className="text-primary font-bold">{targets.length}</span>
            </div>
          </div>
          <div className="text-orange-400">
            SWEEP: {String(Math.round(sweepAngle)).padStart(3, '0')}°
          </div>
        </div>
      </div>
    </div>
  );
};

export default Radar3DDisplay;
