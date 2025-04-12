import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Maximize2, Camera, ZoomIn, ZoomOut, Crosshair, Target, CameraOff } from 'lucide-react';
import { toast } from 'sonner';

interface Target {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  locked?: boolean;
}

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
  const [targets, setTargets] = useState<Target[]>([]);
  const [timestamp, setTimestamp] = useState(new Date());
  const [targetLocked, setTargetLocked] = useState(false);
  const [currentCoordinates, setCurrentCoordinates] = useState({ x: 50, y: 50 });
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [detectionActive, setDetectionActive] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameCount = useRef(0);
  const viewRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      initWebcam();
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [active]);

  useEffect(() => {
    if (webcamActive && active) {
      setDetectionActive(true);
      
      const processingTimer = setTimeout(() => {
        processVideoFrames();
        
        toast.success("Detection Active", {
          description: `Sensitivity set to ${sensitivity}%`
        });
      }, 1000); // 1 second delay to ensure video loads
      
      return () => clearTimeout(processingTimer);
    } else {
      setDetectionActive(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [webcamActive, active, sensitivity]);

  const initWebcam = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser doesn't support webcam access");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setWebcamActive(true);
        setWebcamError(null);
        toast.success("Camera Connected", {
          description: "Webcam access successful"
        });
      }
    } catch (error) {
      console.error("Webcam access error:", error);
      setWebcamError((error as Error).message || "Failed to access webcam");
      setWebcamActive(false);
      toast.error("Camera Error", {
        description: (error as Error).message || "Failed to access webcam"
      });
      
      simulateMotionDetection();
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setWebcamActive(false);
  };

  const processVideoFrames = () => {
    const video = videoRef.current;
    const canvas = detectionCanvasRef.current;
    
    if (!video || !canvas || !webcamActive) return;
    
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setTimeout(processVideoFrames, 100);
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const analyzeFrame = () => {
      setTimestamp(new Date());
      
      if (video.videoWidth === 0 || video.videoHeight === 0 || !webcamActive) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        return;
      }
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        const currentFrame = context.getImageData(0, 0, canvas.width, canvas.height);
        
        if (prevFrameRef.current) {
          const motionTargets = detectMotion(prevFrameRef.current, currentFrame, sensitivity);
          
          if (motionTargets.length > 0) {
            setTargets(motionTargets);
            onMotionDetected(motionTargets);
            
            const shouldLock = Math.random() < (sensitivity / 200);
            
            if (shouldLock && motionTargets.length > 0 && !targetLocked) {
              const targetIndex = Math.floor(Math.random() * motionTargets.length);
              const target = motionTargets[targetIndex];
              
              setTargetLocked(true);
              setCurrentCoordinates({ x: target.x, y: target.y });
              
              motionTargets[targetIndex] = { ...target, locked: true };
              setTargets(motionTargets);
            }
          }
        }
        
        prevFrameRef.current = currentFrame;
      } catch (error) {
        console.error("Error processing video frame:", error);
      }
      
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    };
    
    analyzeFrame();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleVideoLoaded = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0 && detectionCanvasRef.current) {
        detectionCanvasRef.current.width = video.videoWidth;
        detectionCanvasRef.current.height = video.videoHeight;
      }
    };
    
    video.addEventListener('loadeddata', handleVideoLoaded);
    
    return () => {
      video.removeEventListener('loadeddata', handleVideoLoaded);
    };
  }, []);

  const detectMotion = (prevFrame: ImageData, currentFrame: ImageData, sensitivity: number): Target[] => {
    // ... keep existing detectMotion function
  };

  const groupIntoTargets = (blocks: { x: number, y: number, diff: number }[], width: number, height: number): Target[] => {
    // ... keep existing groupIntoTargets function
  };

  const simulateMotionDetection = () => {
    if (!active) return;
    
    const interval = setInterval(() => {
      setTimestamp(new Date());
      
      if (Math.random() < sensitivity / 100) {
        const newTargets: Target[] = [];
        const targetCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < targetCount; i++) {
          const x = Math.random() * 80 + 10;
          const y = Math.random() * 80 + 10;
          const locked = i === 0 && Math.random() > 0.7;
          
          if (locked) {
            setTargetLocked(true);
            setCurrentCoordinates({ x, y });
          }
          
          newTargets.push({
            id: Date.now() + i,
            x,
            y,
            width: Math.random() * 20 + 5,
            height: Math.random() * 20 + 5,
            confidence: Math.random() * 50 + 50,
            locked
          });
        }
        
        setTargets(newTargets);
        onMotionDetected(newTargets);
      } else if (Math.random() > 0.7) {
        setTargets([]);
        setTargetLocked(false);
      }
    }, 500);

    return () => clearInterval(interval);
  };

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

  useEffect(() => {
    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          for (let i = 0; i < 500; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2;
            const alpha = Math.random() * 0.1;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(x, y, size, size);
          }
          
          const scanLinePos = (frameCount.current % 100) / 100 * canvas.height;
          ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
          ctx.fillRect(0, scanLinePos, canvas.width, 2);
          
          frameCount.current++;
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const handleViewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!active || !viewRef.current) return;
    
    const rect = viewRef.current.getBoundingClientRect();
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

      <div 
        ref={viewRef}
        className="relative flex-1 border border-sentry-border bg-black/40 overflow-hidden cursor-crosshair"
        onClick={handleViewClick}
      >
        {active && (
          <video 
            ref={videoRef}
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              !webcamActive && "hidden",
              zoomLevel > 1 && `scale-[${zoomLevel}]`
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
            {webcamError && (
              <div className="absolute inset-0 flex items-center justify-center flex-col p-4 text-center">
                <CameraOff className="h-10 w-10 text-sentry-secondary mb-2" />
                <p className="text-sentry-secondary text-sm">Camera unavailable: {webcamError}</p>
                <p className="text-xs text-sentry-foreground/60 mt-1">Using simulated feed</p>
              </div>
            )}
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
            <Target className="h-10 w-10 animate-pulse" />
          ) : (
            <Crosshair className="h-8 w-8" />
          )}
        </div>
        
        <div className="absolute bottom-2 left-2 right-2 flex justify-between text-xs text-sentry-accent/70">
          <span>RES: {webcamActive ? "NATIVE" : "640x480"}</span>
          <span>FPS: {webcamActive ? "30" : "SIM"}</span>
          <span>ZOOM: {zoomLevel.toFixed(1)}x</span>
        </div>
        
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
        
        <div className="absolute top-2 right-2 flex gap-2 text-sentry-accent/70">
          <button 
            className="hover:text-sentry-primary transition-colors"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 2.0}
          >
            <ZoomIn size={16} />
          </button>
          <button 
            className="hover:text-sentry-primary transition-colors"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1.0}
          >
            <ZoomOut size={16} />
          </button>
          <button className="hover:text-sentry-primary transition-colors">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoFeed;
