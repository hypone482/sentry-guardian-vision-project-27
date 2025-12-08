import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface RadarTarget {
  id: string;
  angle: number; // 0-360 degrees
  distance: number; // 0-100 (percentage from center)
  type: 'hostile' | 'neutral' | 'unknown';
  velocity?: number;
}

interface RadarDisplayProps {
  targets?: RadarTarget[];
  active?: boolean;
  className?: string;
}

const RadarDisplay: React.FC<RadarDisplayProps> = ({ 
  targets: externalTargets, 
  active = true,
  className 
}) => {
  const [sweepAngle, setSweepAngle] = useState(0);
  const [internalTargets, setInternalTargets] = useState<RadarTarget[]>([]);
  const [visibleTargets, setVisibleTargets] = useState<Set<string>>(new Set());

  // Generate random targets when active
  useEffect(() => {
    if (!active) {
      setInternalTargets([]);
      setVisibleTargets(new Set());
      return;
    }

    const generateTargets = () => {
      const count = Math.floor(Math.random() * 4) + 1;
      const newTargets: RadarTarget[] = [];
      
      for (let i = 0; i < count; i++) {
        newTargets.push({
          id: `target-${Date.now()}-${i}`,
          angle: Math.random() * 360,
          distance: 20 + Math.random() * 70,
          type: Math.random() < 0.3 ? 'hostile' : Math.random() < 0.6 ? 'neutral' : 'unknown',
          velocity: Math.random() * 50
        });
      }
      
      setInternalTargets(newTargets);
    };

    generateTargets();
    const interval = setInterval(generateTargets, 8000);
    
    return () => clearInterval(interval);
  }, [active]);

  // Sweep animation
  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setSweepAngle(prev => (prev + 2) % 360);
    }, 30);

    return () => clearInterval(interval);
  }, [active]);

  // Reveal targets when sweep passes over them
  useEffect(() => {
    const targets = externalTargets || internalTargets;
    
    targets.forEach(target => {
      const angleDiff = Math.abs(sweepAngle - target.angle);
      if (angleDiff < 10 || angleDiff > 350) {
        setVisibleTargets(prev => new Set(prev).add(target.id));
        
        // Fade out after 3 seconds
        setTimeout(() => {
          setVisibleTargets(prev => {
            const next = new Set(prev);
            next.delete(target.id);
            return next;
          });
        }, 3000);
      }
    });
  }, [sweepAngle, externalTargets, internalTargets]);

  const targets = externalTargets || internalTargets;

  const getTargetColor = (type: RadarTarget['type']) => {
    switch (type) {
      case 'hostile': return 'bg-sentry-secondary';
      case 'neutral': return 'bg-sentry-primary';
      case 'unknown': return 'bg-sentry-accent';
    }
  };

  const getTargetPosition = (target: RadarTarget) => {
    const radians = (target.angle - 90) * (Math.PI / 180);
    const x = 50 + (target.distance / 2) * Math.cos(radians);
    const y = 50 + (target.distance / 2) * Math.sin(radians);
    return { x, y };
  };

  return (
    <div className={cn("sentry-panel", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="sentry-title text-sm flex items-center gap-2">
          <span className={cn(
            "w-2 h-2 rounded-full",
            active ? "bg-sentry-primary animate-pulse" : "bg-muted-foreground"
          )} />
          RADAR TRACKING
        </h3>
        <span className="text-xs text-muted-foreground font-mono">
          {active ? 'SCANNING' : 'OFFLINE'}
        </span>
      </div>

      <div className="relative aspect-square w-full max-w-[280px] mx-auto">
        {/* Radar background with grid */}
        <div className="absolute inset-0 rounded-full bg-sentry-muted/50 border border-sentry-accent/30 overflow-hidden">
          {/* Range rings */}
          {[25, 50, 75].map(ring => (
            <div
              key={ring}
              className="absolute rounded-full border border-sentry-accent/20"
              style={{
                width: `${ring}%`,
                height: `${ring}%`,
                left: `${(100 - ring) / 2}%`,
                top: `${(100 - ring) / 2}%`
              }}
            />
          ))}

          {/* Cross lines */}
          <div className="absolute w-full h-px bg-sentry-accent/20 top-1/2 left-0" />
          <div className="absolute w-px h-full bg-sentry-accent/20 left-1/2 top-0" />
          
          {/* Diagonal lines */}
          <div 
            className="absolute w-full h-px bg-sentry-accent/10 top-1/2 left-0 origin-center"
            style={{ transform: 'rotate(45deg)' }}
          />
          <div 
            className="absolute w-full h-px bg-sentry-accent/10 top-1/2 left-0 origin-center"
            style={{ transform: 'rotate(-45deg)' }}
          />

          {/* Sweep line with glow */}
          {active && (
            <div
              className="absolute w-1/2 h-0.5 origin-left"
              style={{
                left: '50%',
                top: '50%',
                transform: `rotate(${sweepAngle}deg)`,
                background: 'linear-gradient(90deg, hsl(142 76% 44% / 0.8), transparent)',
                boxShadow: '0 0 10px hsl(142 76% 44% / 0.5)'
              }}
            />
          )}

          {/* Sweep cone/trail effect */}
          {active && (
            <div
              className="absolute inset-0"
              style={{
                background: `conic-gradient(from ${sweepAngle}deg at 50% 50%, 
                  hsl(142 76% 44% / 0.15) 0deg, 
                  transparent 30deg, 
                  transparent 360deg)`
              }}
            />
          )}

          {/* Center point */}
          <div className="absolute w-2 h-2 bg-sentry-primary rounded-full left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10" />

          {/* Targets */}
          {targets.map(target => {
            const pos = getTargetPosition(target);
            const isVisible = visibleTargets.has(target.id);
            
            return (
              <div
                key={target.id}
                className={cn(
                  "absolute w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300",
                  getTargetColor(target.type),
                  isVisible ? "opacity-100" : "opacity-0"
                )}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  boxShadow: isVisible ? `0 0 8px currentColor` : 'none'
                }}
              >
                {/* Target ping animation */}
                {isVisible && target.type === 'hostile' && (
                  <div className="absolute inset-0 rounded-full bg-sentry-secondary animate-ping opacity-75" />
                )}
              </div>
            );
          })}
        </div>

        {/* Cardinal directions */}
        <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-[10px] text-sentry-accent font-mono">N</span>
        <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-[10px] text-sentry-accent font-mono">S</span>
        <span className="absolute top-1/2 -left-4 transform -translate-y-1/2 text-[10px] text-sentry-accent font-mono">W</span>
        <span className="absolute top-1/2 -right-4 transform -translate-y-1/2 text-[10px] text-sentry-accent font-mono">E</span>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4 text-[10px] font-mono">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sentry-secondary" />
          <span className="text-muted-foreground">HOSTILE</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sentry-primary" />
          <span className="text-muted-foreground">NEUTRAL</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sentry-accent" />
          <span className="text-muted-foreground">UNKNOWN</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="bg-sentry-muted/30 rounded p-2">
          <div className="text-lg font-display text-sentry-primary">
            {targets.filter(t => visibleTargets.has(t.id)).length}
          </div>
          <div className="text-[9px] text-muted-foreground">TRACKED</div>
        </div>
        <div className="bg-sentry-muted/30 rounded p-2">
          <div className="text-lg font-display text-sentry-secondary">
            {targets.filter(t => t.type === 'hostile' && visibleTargets.has(t.id)).length}
          </div>
          <div className="text-[9px] text-muted-foreground">HOSTILE</div>
        </div>
        <div className="bg-sentry-muted/30 rounded p-2">
          <div className="text-lg font-display text-sentry-accent">
            {Math.round(sweepAngle)}°
          </div>
          <div className="text-[9px] text-muted-foreground">BEARING</div>
        </div>
      </div>
    </div>
  );
};

export default RadarDisplay;
