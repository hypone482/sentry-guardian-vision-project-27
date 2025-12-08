import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Target } from '@/utils/motionDetection';

interface RangeFinderProps {
  targets: Target[];
  currentCoordinates: { x: number; y: number };
  active: boolean;
}

const RangeFinder: React.FC<RangeFinderProps> = ({
  targets,
  currentCoordinates,
  active
}) => {
  const [rangeData, setRangeData] = useState({
    distance: 0,
    elevation: 0,
    windage: 0,
    bearing: 0
  });

  useEffect(() => {
    if (!active) return;

    const updateRange = () => {
      // Simulate range data based on coordinates
      const centerX = 50;
      const centerY = 50;
      const dx = currentCoordinates.x - centerX;
      const dy = currentCoordinates.y - centerY;
      
      const distance = Math.sqrt(dx * dx + dy * dy) * 10 + Math.random() * 5;
      const bearing = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
      const elevation = -dy * 0.5 + (Math.random() - 0.5) * 2;
      const windage = dx * 0.3 + (Math.random() - 0.5) * 1;

      setRangeData({
        distance: Math.max(50, distance + 200),
        elevation,
        windage,
        bearing
      });
    };

    updateRange();
    const interval = setInterval(updateRange, 200);
    return () => clearInterval(interval);
  }, [currentCoordinates, active]);

  const lockedTarget = targets.find(t => t.locked);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Center crosshair with range data */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        {/* Horizontal lines */}
        <div className="absolute top-1/2 left-1/2 w-20 h-px bg-cyan-500/80 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 h-20 w-px bg-cyan-500/80 -translate-x-1/2 -translate-y-1/2" />
        
        {/* Range rings */}
        <div className="absolute top-1/2 left-1/2 w-16 h-16 border border-cyan-500/40 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 border border-cyan-500/30 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 border border-cyan-500/20 rounded-full -translate-x-1/2 -translate-y-1/2" />
        
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-cyan-500 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>

      {/* Range data display */}
      <div className="absolute top-3 right-3 bg-black/70 border border-cyan-500/50 rounded p-2 font-mono text-xs">
        <div className="text-cyan-400 font-bold mb-1 text-[10px] uppercase">Range Finder</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
          <span className="text-muted-foreground">DIST:</span>
          <span className="text-cyan-400">{rangeData.distance.toFixed(0)}m</span>
          <span className="text-muted-foreground">BRG:</span>
          <span className="text-cyan-400">{rangeData.bearing.toFixed(1)}°</span>
          <span className="text-muted-foreground">ELEV:</span>
          <span className={cn(
            rangeData.elevation > 0 ? "text-green-400" : "text-red-400"
          )}>
            {rangeData.elevation > 0 ? '+' : ''}{rangeData.elevation.toFixed(1)}°
          </span>
          <span className="text-muted-foreground">WIND:</span>
          <span className={cn(
            rangeData.windage > 0 ? "text-yellow-400" : "text-blue-400"
          )}>
            {rangeData.windage > 0 ? 'R' : 'L'} {Math.abs(rangeData.windage).toFixed(1)}
          </span>
        </div>
      </div>

      {/* Target distance indicators */}
      {targets.map(target => (
        <div
          key={target.id}
          className="absolute transform -translate-x-1/2"
          style={{ left: `${target.x}%`, top: `${target.y}%` }}
        >
          <div className={cn(
            "px-1.5 py-0.5 rounded text-[9px] font-mono mt-4 whitespace-nowrap",
            target.locked 
              ? "bg-red-500/40 text-red-300 border border-red-500/60"
              : "bg-cyan-500/30 text-cyan-300 border border-cyan-500/40"
          )}>
            {(Math.sqrt(Math.pow(target.x - 50, 2) + Math.pow(target.y - 50, 2)) * 10 + 180).toFixed(0)}m
          </div>
        </div>
      ))}

      {/* Mil-dot scale */}
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex items-center gap-1">
        {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map(mil => (
          <div key={mil} className="flex flex-col items-center">
            <div className={cn(
              "w-px bg-cyan-500/60",
              mil === 0 ? "h-3" : Math.abs(mil) % 2 === 0 ? "h-2" : "h-1"
            )} />
            {mil % 2 === 0 && (
              <span className="text-[7px] text-cyan-500/60 mt-0.5">{mil}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RangeFinder;
