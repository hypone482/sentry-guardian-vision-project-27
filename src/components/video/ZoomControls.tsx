
import React from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut
}) => {
  return (
    <div className="absolute top-2 right-2 flex gap-2 text-sentry-accent/70">
      <button 
        className="hover:text-sentry-primary transition-colors"
        onClick={onZoomIn}
        disabled={zoomLevel >= 2.0}
      >
        <ZoomIn size={16} />
      </button>
      <button 
        className="hover:text-sentry-primary transition-colors"
        onClick={onZoomOut}
        disabled={zoomLevel <= 1.0}
      >
        <ZoomOut size={16} />
      </button>
      <button className="hover:text-sentry-primary transition-colors">
        <Maximize2 size={16} />
      </button>
    </div>
  );
};

export default ZoomControls;
