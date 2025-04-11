
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Maximize2, Camera, ZoomIn, ZoomOut } from 'lucide-react';

interface Target {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameCount = useRef(0);

  // Simulate random motion detection
  useEffect(() => {
    if (!active) {
      setTargets([]);
      return;
    }

    const interval = setInterval(() => {
      // Update timestamp
      setTimestamp(new Date());
      
      // Randomly detect motion based on sensitivity
      if (Math.random() < sensitivity / 100) {
        const newTargets: Target[] = [];
        const targetCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < targetCount; i++) {
          newTargets.push({
            id: Date.now() + i,
            x: Math.random() * 80 + 10, // 10-90%
            y: Math.random() * 80 + 10, // 10-90%
            width: Math.random() * 20 + 5, // 5-25%
            height: Math.random() * 20 + 5, // 5-25%
            confidence: Math.random() * 50 + 50 // 50-100%
          });
        }
        
        setTargets(newTargets);
        onMotionDetected(newTargets);
      } else if (Math.random() > 0.7) {
        // Sometimes clear targets
        setTargets([]);
      }
      
      // Draw scan lines and noise on canvas
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
    }, 500);

    return () => clearInterval(interval);
  }, [active, sensitivity, onMotionDetected]);

  return (
    <div className="sentry-panel flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-sentry-accent" />
          <span className="sentry-title text-sm">CAMERA {feedId}</span>
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

      <div className="relative flex-1 border border-sentry-border bg-black/40 overflow-hidden">
        {/* Static camera feed (simulated) */}
        <div className="absolute inset-0 bg-gradient-to-b from-sentry-muted/40 to-black/20"></div>
        
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
            className="absolute border-2 border-sentry-secondary animate-pulse"
            style={{
              left: `${target.x}%`,
              top: `${target.y}%`,
              width: `${target.width}%`,
              height: `${target.height}%`,
            }}
          >
            <div className="absolute -top-5 -left-1 text-sentry-secondary text-xs">
              ID:{target.id.toString().slice(-4)} [{Math.round(target.confidence)}%]
            </div>
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-sentry-secondary"></div>
            <div className="absolute top-0 left-0 w-2 h-2 bg-sentry-secondary"></div>
          </div>
        ))}
        
        {/* Camera details overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-between text-xs text-sentry-accent/70">
          <span>RES: 640x480</span>
          <span>FPS: 30</span>
          <span>ZOOM: 1.0x</span>
        </div>
        
        {/* Controls */}
        <div className="absolute top-2 right-2 flex gap-2 text-sentry-accent/70">
          <button className="hover:text-sentry-primary transition-colors">
            <ZoomIn size={16} />
          </button>
          <button className="hover:text-sentry-primary transition-colors">
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
