import React from 'react';
import { cn } from '@/lib/utils';

interface CoordinatesDisplayProps {
  currentCoordinates: { x: number; y: number };
  targetLocked: boolean;
  detectionActive: boolean;
}

const CoordinatesDisplay: React.FC<CoordinatesDisplayProps> = ({
  currentCoordinates,
  targetLocked,
  detectionActive
}) => {
  return (
    <div className="absolute bottom-14 left-2 z-20">
      {detectionActive && (
        <div className="text-[10px] bg-black/60 px-2 py-1 rounded text-sentry-primary mb-1 font-mono">
          MOTION DETECTION ACTIVE
        </div>
      )}
      
      <div className="bg-black/60 px-2 py-1.5 rounded text-[11px] flex flex-col gap-0.5 font-mono border border-sentry-accent/20">
        <div className="flex items-center gap-2">
          <span className="text-sentry-accent/70">X:</span>
          <span className="text-sentry-primary font-bold w-10 text-right">
            {currentCoordinates.x.toFixed(1)}°
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sentry-accent/70">Y:</span>
          <span className="text-sentry-primary font-bold w-10 text-right">
            {currentCoordinates.y.toFixed(1)}°
          </span>
        </div>
        {targetLocked && (
          <div className="text-red-500 font-bold animate-pulse mt-1 text-center">
            TARGET LOCKED
          </div>
        )}
      </div>
    </div>
  );
};

export default CoordinatesDisplay;
