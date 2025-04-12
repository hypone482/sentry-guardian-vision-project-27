
import React from 'react';

interface FeedStatusProps {
  webcamActive: boolean;
  zoomLevel: number;
}

const FeedStatus: React.FC<FeedStatusProps> = ({
  webcamActive,
  zoomLevel
}) => {
  return (
    <div className="absolute bottom-2 left-2 right-2 flex justify-between text-xs text-sentry-accent/70">
      <span>RES: {webcamActive ? "NATIVE" : "640x480"}</span>
      <span>FPS: {webcamActive ? "30" : "SIM"}</span>
      <span>ZOOM: {zoomLevel.toFixed(1)}x</span>
    </div>
  );
};

export default FeedStatus;
