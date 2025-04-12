
import React from 'react';
import { cn } from '@/lib/utils';
import { Target as TargetIcon, Crosshair } from 'lucide-react';
import { Target } from '@/utils/motionDetection';

interface TargetOverlayProps {
  targets: Target[];
  targetLocked: boolean;
  currentCoordinates: { x: number; y: number };
}

const TargetOverlay: React.FC<TargetOverlayProps> = ({
  targets,
  targetLocked,
  currentCoordinates
}) => {
  return (
    <>
      {targets.map(target => (
        <div 
          key={target.id}
          className={cn(
            "absolute border-2 animate-pulse",
            target.locked ? "border-red-500" : "border-sentry-secondary"
          )}
          style={{
            left: `${target.x}%`,
            top: `${target.y}%`,
            width: `${target.width}%`,
            height: `${target.height}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className={cn(
            "absolute -top-5 -left-1 text-xs",
            target.locked ? "text-red-500" : "text-sentry-secondary"
          )}>
            ID:{target.id.toString().slice(-4)} [{Math.round(target.confidence)}%]
            {target.locked && " LOCKED"}
          </div>
          <div className={cn(
            "absolute bottom-0 right-0 w-2 h-2",
            target.locked ? "bg-red-500" : "bg-sentry-secondary"
          )}></div>
          <div className={cn(
            "absolute top-0 left-0 w-2 h-2",
            target.locked ? "bg-red-500" : "bg-sentry-secondary"
          )}></div>
        </div>
      ))}
      
      <div 
        className={cn(
          "absolute pointer-events-none",
          targetLocked ? "text-red-500" : "text-sentry-accent/50"
        )}
        style={{
          left: `${currentCoordinates.x}%`,
          top: `${currentCoordinates.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        {targetLocked ? (
          <TargetIcon className="h-10 w-10 animate-pulse" />
        ) : (
          <Crosshair className="h-8 w-8" />
        )}
      </div>
    </>
  );
};

export default TargetOverlay;
