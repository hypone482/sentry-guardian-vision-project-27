
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
    <>
      {detectionActive && (
        <div className="absolute top-2 left-2 text-xs bg-black/50 px-2 py-1 rounded text-sentry-primary">
          MOTION DETECTION ACTIVE
        </div>
      )}
      
      <div className="absolute top-10 left-2 text-xs flex flex-col text-sentry-accent/70 font-mono">
        <span>X: {Math.round(currentCoordinates.x)}°</span>
        <span>Y: {Math.round(currentCoordinates.y)}°</span>
        <span className={targetLocked ? "text-red-500" : "hidden"}>
          TARGET {targetLocked ? "LOCKED" : "SEARCHING"}
        </span>
      </div>
    </>
  );
};

export default CoordinatesDisplay;
