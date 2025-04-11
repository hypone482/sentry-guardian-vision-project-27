
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

  // Initialize and handle webcam
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

  // Video processing for motion detection
  useEffect(() => {
    if (webcamActive && active) {
      setDetectionActive(true);
      processVideoFrames();
      
      toast.success("Detection Active", {
        description: `Sensitivity set to ${sensitivity}%`
      });
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
      
      // Fall back to simulated data
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

  // Real-time video processing for motion detection
  const processVideoFrames = () => {
    const video = videoRef.current;
    const canvas = detectionCanvasRef.current;
    
    if (!video || !canvas || !webcamActive) return;
    
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const analyzeFrame = () => {
      // Update timestamp
      setTimestamp(new Date());
      
      // Draw current frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const currentFrame = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Compare with previous frame to detect motion
      if (prevFrameRef.current) {
        const motionTargets = detectMotion(prevFrameRef.current, currentFrame, sensitivity);
        
        if (motionTargets.length > 0) {
          setTargets(motionTargets);
          onMotionDetected(motionTargets);
          
          // Randomly lock onto a target based on sensitivity
          const shouldLock = Math.random() < (sensitivity / 200); // Higher sensitivity = higher chance
          
          if (shouldLock && motionTargets.length > 0 && !targetLocked) {
            const targetIndex = Math.floor(Math.random() * motionTargets.length);
            const target = motionTargets[targetIndex];
            
            setTargetLocked(true);
            setCurrentCoordinates({ x: target.x, y: target.y });
            
            // Update the target to be locked
            motionTargets[targetIndex] = { ...target, locked: true };
            setTargets(motionTargets);
          }
        }
      }
      
      // Save current frame for next comparison
      prevFrameRef.current = currentFrame;
      
      // Continue analyzing frames
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    };
    
    // Start the analysis loop
    analyzeFrame();
  };

  // Detect motion by comparing frames
  const detectMotion = (prevFrame: ImageData, currentFrame: ImageData, sensitivity: number): Target[] => {
    const width = prevFrame.width;
    const height = prevFrame.height;
    const threshold = 30 * (sensitivity / 50); // Adjust based on sensitivity
    const blockSize = 20; // Size of blocks to analyze
    const detectedBlocks: { x: number, y: number, diff: number }[] = [];
    
    // Compare frames by blocks to find motion areas
    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        let totalDiff = 0;
        
        // Sample points within the block
        for (let i = 0; i < blockSize; i += 4) {
          for (let j = 0; j < blockSize; j += 4) {
            if (y + j < height && x + i < width) {
              const idx = ((y + j) * width + (x + i)) * 4;
              
              // Calculate difference in RGB values
              const rDiff = Math.abs(currentFrame.data[idx] - prevFrame.data[idx]);
              const gDiff = Math.abs(currentFrame.data[idx + 1] - prevFrame.data[idx + 1]);
              const bDiff = Math.abs(currentFrame.data[idx + 2] - prevFrame.data[idx + 2]);
              
              totalDiff += (rDiff + gDiff + bDiff) / 3;
            }
          }
        }
        
        // If the difference exceeds the threshold, mark as motion
        const avgDiff = totalDiff / ((blockSize / 4) * (blockSize / 4));
        if (avgDiff > threshold) {
          detectedBlocks.push({ 
            x: x / width * 100, 
            y: y / height * 100, 
            diff: avgDiff 
          });
        }
      }
    }
    
    // Group nearby blocks into targets
    return groupIntoTargets(detectedBlocks, width, height);
  };

  // Group nearby motion blocks into cohesive targets
  const groupIntoTargets = (blocks: { x: number, y: number, diff: number }[], width: number, height: number): Target[] => {
    if (blocks.length === 0) return [];
    
    // Simple clustering algorithm to group nearby blocks
    const targets: Target[] = [];
    const visited = new Set<number>();
    
    for (let i = 0; i < blocks.length; i++) {
      if (visited.has(i)) continue;
      
      // Start a new target
      const cluster: typeof blocks = [blocks[i]];
      visited.add(i);
      
      // Find all blocks that belong to this target
      for (let j = 0; j < blocks.length; j++) {
        if (visited.has(j)) continue;
        
        const distX = Math.abs(blocks[i].x - blocks[j].x);
        const distY = Math.abs(blocks[i].y - blocks[j].y);
        
        if (distX < 10 && distY < 10) { // Threshold for grouping
          cluster.push(blocks[j]);
          visited.add(j);
        }
      }
      
      // Calculate target properties
      if (cluster.length > 0) {
        const avgX = cluster.reduce((sum, b) => sum + b.x, 0) / cluster.length;
        const avgY = cluster.reduce((sum, b) => sum + b.y, 0) / cluster.length;
        const avgDiff = cluster.reduce((sum, b) => sum + b.diff, 0) / cluster.length;
        
        // Width and height based on spread of blocks
        const minX = Math.min(...cluster.map(b => b.x));
        const maxX = Math.max(...cluster.map(b => b.x));
        const minY = Math.min(...cluster.map(b => b.y));
        const maxY = Math.max(...cluster.map(b => b.y));
        
        const targetWidth = Math.max(10, maxX - minX + 5); // Minimum size of 10%
        const targetHeight = Math.max(10, maxY - minY + 5); // Minimum size of 10%
        
        // Convert diff to confidence (0-100%)
        const confidence = Math.min(100, (avgDiff / 50) * 100);
        
        // Create the target
        targets.push({
          id: Date.now() + i,
          x: avgX,
          y: avgY,
          width: targetWidth,
          height: targetHeight,
          confidence,
          locked: false
        });
      }
    }
    
    // Sort by confidence
    return targets.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  };

  // Simulate random motion detection when webcam is not available
  const simulateMotionDetection = () => {
    if (!active) return;
    
    const interval = setInterval(() => {
      // Update timestamp
      setTimestamp(new Date());
      
      // Randomly detect motion based on sensitivity
      if (Math.random() < sensitivity / 100) {
        const newTargets: Target[] = [];
        const targetCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < targetCount; i++) {
          const x = Math.random() * 80 + 10; // 10-90%
          const y = Math.random() * 80 + 10; // 10-90%
          const locked = i === 0 && Math.random() > 0.7;
          
          if (locked) {
            setTargetLocked(true);
            setCurrentCoordinates({ x, y });
          }
          
          newTargets.push({
            id: Date.now() + i,
            x,
            y,
            width: Math.random() * 20 + 5, // 5-25%
            height: Math.random() * 20 + 5, // 5-25%
            confidence: Math.random() * 50 + 50, // 50-100%
            locked
          });
        }
        
        setTargets(newTargets);
        onMotionDetected(newTargets);
      } else if (Math.random() > 0.7) {
        // Sometimes clear targets
        setTargets([]);
        setTargetLocked(false);
      }
    }, 500);

    return () => clearInterval(interval);
  };

  // Handle zooming functions
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

  // Draw scan lines and noise on canvas
  useEffect(() => {
    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Add noise
          for (let i = 0; i < 500; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2;
            const alpha = Math.random() * 0.1;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(x, y, size, size);
          }
          
          // Add scan line
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
    
    // 40% chance of lock when clicking
    if (Math.random() > 0.6) {
      setTargetLocked(true);
      
      // Add a new target at click position
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
        {/* Webcam video feed */}
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
        
        {/* Hidden canvas for motion detection */}
        <canvas 
          ref={detectionCanvasRef} 
          className="hidden"
        />
        
        {/* Static camera feed fallback (shown when webcam is not active) */}
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
        
        {/* Canvas for visual effects */}
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          width="300"
          height="200"
        />
        
        {/* Grid overlay */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 pointer-events-none">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className="border border-sentry-accent/10"></div>
          ))}
        </div>
        
        {/* Targets */}
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
        
        {/* Targeting reticle */}
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
        
        {/* Camera details overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-between text-xs text-sentry-accent/70">
          <span>RES: {webcamActive ? "NATIVE" : "640x480"}</span>
          <span>FPS: {webcamActive ? "30" : "SIM"}</span>
          <span>ZOOM: {zoomLevel.toFixed(1)}x</span>
        </div>
        
        {/* Detection status */}
        {detectionActive && (
          <div className="absolute top-2 left-2 text-xs bg-black/50 px-2 py-1 rounded text-sentry-primary">
            MOTION DETECTION ACTIVE
          </div>
        )}
        
        {/* Turret position overlay */}
        <div className="absolute top-10 left-2 text-xs flex flex-col text-sentry-accent/70 font-mono">
          <span>X: {Math.round(currentCoordinates.x)}°</span>
          <span>Y: {Math.round(currentCoordinates.y)}°</span>
          <span className={targetLocked ? "text-red-500" : "hidden"}>
            TARGET {targetLocked ? "LOCKED" : "SEARCHING"}
          </span>
        </div>
        
        {/* Controls */}
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
