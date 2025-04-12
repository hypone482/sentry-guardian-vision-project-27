
import React from 'react';
import { cn } from '@/lib/utils';
import { Camera, CameraOff } from 'lucide-react';

interface FeedHeaderProps {
  feedId: string;
  webcamActive: boolean;
  detectionActive: boolean;
  timestamp: Date;
  active: boolean;
}

const FeedHeader: React.FC<FeedHeaderProps> = ({
  feedId,
  webcamActive,
  detectionActive,
  timestamp,
  active
}) => {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        {webcamActive ? (
          <Camera className="h-4 w-4 text-sentry-primary animate-pulse" />
        ) : (
          <CameraOff className="h-4 w-4 text-yellow-500" />
        )}
        <span className="sentry-title text-sm">CAMERA {feedId}</span>
        {webcamActive && (
          <span className={cn(
            "text-xs ml-2",
            detectionActive ? "text-sentry-primary" : "text-yellow-500"
          )}>
            ({detectionActive ? "TRACKING" : "LIVE"})
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-sentry-foreground/70">
          {timestamp.toLocaleTimeString()}
        </span>
        <div className={cn(
          "h-2 w-2 rounded-full", 
          active ? "bg-sentry-primary animate-pulse" : "bg-gray-500"
        )}></div>
      </div>
    </div>
  );
};

export default FeedHeader;
