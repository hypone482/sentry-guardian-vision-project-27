
import React from 'react';
import { CameraOff } from 'lucide-react';

interface WebcamErrorProps {
  webcamError: string | null;
}

const WebcamError: React.FC<WebcamErrorProps> = ({ webcamError }) => {
  if (!webcamError) return null;
  
  return (
    <div className="absolute inset-0 flex items-center justify-center flex-col p-4 text-center">
      <CameraOff className="h-10 w-10 text-sentry-secondary mb-2" />
      <p className="text-sentry-secondary text-sm">Camera unavailable: {webcamError}</p>
      <p className="text-xs text-sentry-foreground/60 mt-1">Using simulated feed</p>
    </div>
  );
};

export default WebcamError;
