import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Target } from '@/utils/motionDetection';

interface TargetTrail {
  id: number;
  positions: { x: number; y: number; timestamp: number }[];
}

interface MinimapProps {
  targets: Target[];
  currentCoordinates: { x: number; y: number };
  targetLocked: boolean;
  active: boolean;
  className?: string;
}

const Minimap: React.FC<MinimapProps> = ({
  targets,
  currentCoordinates,
  targetLocked,
  active,
  className
}) => {
  const [trails, setTrails] = useState<Map<number, TargetTrail>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxTrailLength = 15;
  const trailFadeTime = 3000; // ms

  // Update trails when targets change
  useEffect(() => {
    if (!active) {
      setTrails(new Map());
      return;
    }

    setTrails(prevTrails => {
      const newTrails = new Map(prevTrails);
      const now = Date.now();

      targets.forEach(target => {
        const existingTrail = newTrails.get(target.id);
        const newPosition = { x: target.x, y: target.y, timestamp: now };

        if (existingTrail) {
          // Add new position and trim old ones
          const updatedPositions = [
            ...existingTrail.positions.filter(p => now - p.timestamp < trailFadeTime),
            newPosition
          ].slice(-maxTrailLength);

          newTrails.set(target.id, {
            ...existingTrail,
            positions: updatedPositions
          });
        } else {
          newTrails.set(target.id, {
            id: target.id,
            positions: [newPosition]
          });
        }
      });

      // Clean up trails for targets that no longer exist
      const activeIds = new Set(targets.map(t => t.id));
      newTrails.forEach((_, id) => {
        if (!activeIds.has(id)) {
          const trail = newTrails.get(id);
          if (trail && trail.positions.every(p => now - p.timestamp > trailFadeTime)) {
            newTrails.delete(id);
          }
        }
      });

      return newTrails;
    });
  }, [targets, active]);

  // Draw trails on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();

      trails.forEach((trail, id) => {
        const target = targets.find(t => t.id === id);
        const isLocked = target?.locked;
        
        if (trail.positions.length < 2) return;

        // Draw trail line
        ctx.beginPath();
        trail.positions.forEach((pos, index) => {
          const x = (pos.x / 100) * canvas.width;
          const y = (pos.y / 100) * canvas.height;
          const age = now - pos.timestamp;
          const opacity = Math.max(0, 1 - age / trailFadeTime);

          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          ctx.strokeStyle = isLocked 
            ? `rgba(255, 0, 0, ${opacity * 0.8})` 
            : `rgba(0, 255, 0, ${opacity * 0.6})`;
          ctx.lineWidth = 1.5;
        });
        ctx.stroke();

        // Draw trail dots
        trail.positions.forEach((pos, index) => {
          const x = (pos.x / 100) * canvas.width;
          const y = (pos.y / 100) * canvas.height;
          const age = now - pos.timestamp;
          const opacity = Math.max(0, 1 - age / trailFadeTime);
          const size = index === trail.positions.length - 1 ? 3 : 1.5;

          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = isLocked 
            ? `rgba(255, 0, 0, ${opacity})` 
            : `rgba(0, 255, 0, ${opacity})`;
          ctx.fill();
        });
      });
    };

    draw();
    const animationId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animationId);
  }, [trails, targets]);

  return (
    <div className={cn(
      "absolute bottom-14 right-3 w-32 h-24 bg-sentry-muted/80 border border-sentry-accent/40 rounded overflow-hidden backdrop-blur-sm",
      className
    )}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-sentry-muted/90 flex items-center justify-between px-1.5 z-10">
        <span className="text-[8px] font-mono text-sentry-accent uppercase">Minimap</span>
        <span className={cn(
          "w-1.5 h-1.5 rounded-full",
          active ? "bg-sentry-primary animate-pulse" : "bg-muted-foreground"
        )} />
      </div>

      {/* Grid background */}
      <div className="absolute inset-0 mt-4">
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="border border-sentry-accent/10"></div>
          ))}
        </div>

        {/* Canvas for trails */}
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          width={128}
          height={80}
        />

        {/* Current targets */}
        {targets.map(target => (
          <div
            key={target.id}
            className={cn(
              "absolute w-2 h-2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150",
              target.locked ? "bg-sentry-secondary" : "bg-sentry-primary"
            )}
            style={{
              left: `${target.x}%`,
              top: `${target.y}%`,
              boxShadow: target.locked 
                ? '0 0 6px rgba(255, 0, 0, 0.8)' 
                : '0 0 4px rgba(0, 255, 0, 0.6)'
            }}
          >
            {target.locked && (
              <div className="absolute inset-0 bg-sentry-secondary animate-ping opacity-50" />
            )}
          </div>
        ))}

        {/* Crosshair position */}
        <div
          className={cn(
            "absolute w-1 h-1 rounded-full transform -translate-x-1/2 -translate-y-1/2",
            targetLocked ? "bg-sentry-secondary" : "bg-sentry-accent"
          )}
          style={{
            left: `${currentCoordinates.x}%`,
            top: `${currentCoordinates.y}%`
          }}
        />

        {/* Field of view indicator */}
        <div className="absolute inset-2 border border-sentry-accent/30 rounded-sm pointer-events-none" />
      </div>

      {/* Stats bar */}
      <div className="absolute bottom-0 left-0 right-0 h-3 bg-sentry-muted/90 flex items-center justify-between px-1.5">
        <span className="text-[7px] font-mono text-muted-foreground">
          TGT: {targets.length}
        </span>
        <span className="text-[7px] font-mono text-muted-foreground">
          TRL: {trails.size}
        </span>
      </div>
    </div>
  );
};

export default Minimap;
