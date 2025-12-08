
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Custom hooks
import { useWebcam } from '@/hooks/useWebcam';
import { useMotionDetection } from '@/hooks/useMotionDetection';
import { useAmbientEffects } from '@/hooks/useAmbientEffects';

// Components
import FeedHeader from '@/components/video/FeedHeader';
import TargetOverlay from '@/components/video/TargetOverlay';
import FeedStatus from '@/components/video/FeedStatus';
import CoordinatesDisplay from '@/components/video/CoordinatesDisplay';
import WebcamError from '@/components/video/WebcamError';
import ZoomControls from '@/components/video/ZoomControls';
import Minimap from '@/components/video/Minimap';
import CameraModes, { CameraMode } from '@/components/video/CameraModes';
import RangeFinder from '@/components/video/RangeFinder';

// Utilities
import { simulateMotionDetection, Target } from '@/utils/motionDetection';

interface VideoFeedProps {
  feedId: string;
  sensitivity: number;
  active: boolean;
  onMotionDetected: (targets: Target[]) => void;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ 
  feedId, 
  sensitivity, 
  active, 
  onMotionDetected 
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [cameraMode, setCameraMode] = useState<CameraMode>('normal');

  // Handle keyboard shortcuts for camera modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!active) return;
      if (e.key === '1') setCameraMode('normal');
      if (e.key === '2') setCameraMode('nightVision');
      if (e.key === '3') setCameraMode('thermal');
      if (e.key === '4') setCameraMode('rangeFinder');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  const handleModeChange = (mode: CameraMode) => {
    setCameraMode(mode);
    toast.info("Camera Mode", {
      description: `Switched to ${mode === 'nightVision' ? 'Night Vision' : mode === 'thermal' ? 'Thermal' : mode === 'rangeFinder' ? 'Range Finder' : 'Normal'} mode`
    });
  };

  // Get camera mode styles
  const getCameraModeStyles = () => {
    switch (cameraMode) {
      case 'nightVision':
        return 'brightness-150 contrast-125 hue-rotate-[80deg] saturate-200';
      case 'thermal':
        return 'brightness-110 contrast-150 saturate-150 hue-rotate-[-30deg]';
      case 'rangeFinder':
        return 'brightness-110 contrast-110';
      default:
        return '';
    }
  };

  const getCameraModeOverlay = () => {
    switch (cameraMode) {
      case 'nightVision':
        return 'bg-green-500/10';
      case 'thermal':
        return 'bg-gradient-to-b from-orange-500/10 via-yellow-500/5 to-red-500/10';
      case 'rangeFinder':
        return 'bg-cyan-500/5';
      default:
        return '';
    }
  };
  
  // Custom hooks
  const {
    webcamActive,
    webcamError,
    videoRef,
  } = useWebcam({
    active,
    onError: () => simulateMotionDetection(
      active,
      sensitivity,
      setTimestamp,
      setTargets,
      setTargetLocked,
      setCurrentCoordinates,
      onMotionDetected
    )
  });
  
  const {
    targets,
    timestamp,
    targetLocked,
    currentCoordinates,
    detectionActive,
    detectionCanvasRef,
    setTargets,
    setTimestamp,
    setTargetLocked,
    setCurrentCoordinates
  } = useMotionDetection({
    videoRef,
    sensitivity,
    active,
    webcamActive,
    onMotionDetected
  });
  
  const canvasRef = useAmbientEffects();
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2.0));
    toast.info("Zoom Adjusted", {
      description: `Zoom level: ${(zoomLevel + 0.2).toFixed(1)}x`
    });
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 1.0));
    toast.info("Zoom Adjusted", {
      description: `Zoom level: ${(zoomLevel - 0.2).toFixed(1)}x`
    });
  };

  const handleViewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!active) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setCurrentCoordinates({ x, y });
    
    if (Math.random() > 0.6) {
      setTargetLocked(true);
      
      const newTarget: Target = {
        id: Date.now(),
        x,
        y,
        width: 10,
        height: 10,
        confidence: 85,
        locked: true
      };
      
      setTargets([newTarget, ...targets.slice(0, 2)]);
      onMotionDetected([newTarget]);
      
      toast.warning("Target Locked", {
        description: "Manual target acquisition"
      });
    }
  };

  return (
    <div className="sentry-panel flex flex-col h-full">
      <FeedHeader 
        feedId={feedId}
        webcamActive={webcamActive}
        detectionActive={detectionActive}
        timestamp={timestamp}
        active={active}
      />

      <div 
        className={cn(
          "relative flex-1 border border-sentry-border bg-black/40 overflow-hidden cursor-crosshair",
          cameraMode === 'nightVision' && "border-green-500/40",
          cameraMode === 'thermal' && "border-orange-500/40",
          cameraMode === 'rangeFinder' && "border-cyan-500/40"
        )}
        onClick={handleViewClick}
      >
        {/* Camera mode overlay */}
        <div className={cn(
          "absolute inset-0 pointer-events-none z-10 transition-colors duration-300",
          getCameraModeOverlay()
        )} />

        {/* Night vision scanlines effect */}
        {cameraMode === 'nightVision' && (
          <div 
            className="absolute inset-0 pointer-events-none z-10 opacity-20"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.1) 2px, rgba(0,255,0,0.1) 4px)'
            }}
          />
        )}

        {/* Thermal gradient overlay */}
        {cameraMode === 'thermal' && (
          <div 
            className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay opacity-40"
            style={{
              background: 'linear-gradient(180deg, rgba(255,0,0,0.2) 0%, rgba(255,165,0,0.2) 25%, rgba(255,255,0,0.2) 50%, rgba(0,255,0,0.2) 75%, rgba(0,0,255,0.2) 100%)'
            }}
          />
        )}

        {active && (
          <video 
            ref={videoRef}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-all duration-300",
              !webcamActive && "hidden",
              getCameraModeStyles()
            )}
            style={{ transform: `scale(${zoomLevel})` }}
            autoPlay
            playsInline
            muted
          />
        )}
        
        <canvas 
          ref={detectionCanvasRef} 
          className="hidden"
        />
        
        {(!webcamActive || webcamError) && (
          <div className="absolute inset-0 bg-gradient-to-b from-sentry-muted/40 to-black/20">
            <WebcamError webcamError={webcamError} />
          </div>
        )}
        
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          width="300"
          height="200"
        />
        
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 pointer-events-none">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className="border border-sentry-accent/10"></div>
          ))}
        </div>
        
        <TargetOverlay 
          targets={targets}
          targetLocked={targetLocked}
          currentCoordinates={currentCoordinates}
        />
        
        <FeedStatus 
          webcamActive={webcamActive}
          zoomLevel={zoomLevel}
        />
        
        <CoordinatesDisplay 
          currentCoordinates={currentCoordinates}
          targetLocked={targetLocked}
          detectionActive={detectionActive}
        />
        
        <ZoomControls 
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
        
        <Minimap
          targets={targets}
          currentCoordinates={currentCoordinates}
          targetLocked={targetLocked}
          active={active}
        />

        <CameraModes
          currentMode={cameraMode}
          onModeChange={handleModeChange}
          active={active}
        />

        {cameraMode === 'rangeFinder' && (
          <RangeFinder
            targets={targets}
            currentCoordinates={currentCoordinates}
            active={active}
          />
        )}
      </div>
    </div>
  );
};

export default VideoFeed;
