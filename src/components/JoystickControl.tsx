import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Crosshair, RotateCcw, Settings, Gauge } from 'lucide-react';

interface JoystickControlProps {
  active?: boolean;
  className?: string;
  onPositionChange?: (x: number, y: number) => void;
}

const JoystickControl: React.FC<JoystickControlProps> = ({ 
  active = true, 
  className,
  onPositionChange 
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [calibrated, setCalibrated] = useState(true);
  const [sensitivity, setSensitivity] = useState(1);
  const joystickRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxDistance = 40;

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!active) return;
    setIsDragging(true);
  }, [active]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = (clientX - centerX) * sensitivity;
    let deltaY = (clientY - centerY) * sensitivity;

    // Limit to circular boundary
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > maxDistance) {
      const scale = maxDistance / distance;
      deltaX *= scale;
      deltaY *= scale;
    }

    setPosition({ x: deltaX, y: deltaY });
    onPositionChange?.(deltaX / maxDistance, deltaY / maxDistance);
  }, [isDragging, sensitivity, onPositionChange]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    // Spring back to center
    setPosition({ x: 0, y: 0 });
    onPositionChange?.(0, 0);
  }, [onPositionChange]);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => isDragging && handleEnd();

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };
  const onTouchEnd = () => handleEnd();

  const calibrate = () => {
    setCalibrated(false);
    setTimeout(() => {
      setPosition({ x: 0, y: 0 });
      setCalibrated(true);
    }, 1500);
  };

  // Calculate angle and magnitude for display
  const angle = Math.atan2(position.y, position.x) * (180 / Math.PI);
  const magnitude = Math.sqrt(position.x * position.x + position.y * position.y) / maxDistance * 100;

  return (
    <div className={cn("relative h-full min-h-[250px] flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-primary" />
          <span className="text-xs font-display text-primary">JOYSTICK CONTROL</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn(
            "w-2 h-2 rounded-full",
            calibrated ? "bg-emerald-500" : "bg-yellow-500 animate-pulse"
          )} />
          <span className="text-[9px] font-mono text-muted-foreground">
            {calibrated ? 'CALIBRATED' : 'CALIBRATING...'}
          </span>
        </div>
      </div>

      {/* Main Joystick Area */}
      <div className="flex-1 flex items-center justify-center">
        <div 
          ref={containerRef}
          className="relative w-32 h-32 rounded-full bg-card border-2 border-border"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full">
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.2" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.2" />
            <circle cx="50%" cy="50%" r="25%" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.15" />
            <circle cx="50%" cy="50%" r="40%" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.1" />
          </svg>

          {/* Direction indicators */}
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-muted-foreground">N</span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-muted-foreground">S</span>
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-mono text-muted-foreground">W</span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-mono text-muted-foreground">E</span>

          {/* Joystick knob */}
          <div
            ref={joystickRef}
            className={cn(
              "absolute w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-primary shadow-lg cursor-grab",
              isDragging && "cursor-grabbing shadow-primary/50",
              !calibrated && "opacity-50"
            )}
            style={{
              left: `calc(50% + ${position.x}px - 24px)`,
              top: `calc(50% + ${position.y}px - 24px)`,
              transition: isDragging ? 'none' : 'all 0.2s ease-out',
              boxShadow: isDragging ? '0 0 20px hsl(var(--primary) / 0.5)' : undefined
            }}
          >
            <div className="absolute inset-2 rounded-full bg-card/50 flex items-center justify-center">
              <Crosshair className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Data Display */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="bg-card/50 rounded border border-border/50 p-2">
          <div className="text-[8px] text-muted-foreground font-mono">X-AXIS</div>
          <div className="text-sm font-mono text-primary">{(position.x / maxDistance * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-card/50 rounded border border-border/50 p-2">
          <div className="text-[8px] text-muted-foreground font-mono">Y-AXIS</div>
          <div className="text-sm font-mono text-cyan-400">{(-position.y / maxDistance * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-card/50 rounded border border-border/50 p-2">
          <div className="text-[8px] text-muted-foreground font-mono">ANGLE</div>
          <div className="text-sm font-mono text-yellow-400">{magnitude > 5 ? `${angle.toFixed(0)}°` : '--'}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={calibrate}
          disabled={!calibrated}
          className={cn(
            "flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-colors",
            calibrated 
              ? "bg-accent/20 text-accent border border-accent/40 hover:bg-accent/30" 
              : "bg-muted/20 text-muted-foreground border border-border cursor-not-allowed"
          )}
        >
          <RotateCcw className="w-3 h-3" />
          RECALIBRATE
        </button>
        
        <div className="flex-1 flex items-center gap-1 px-2 py-1 bg-card/50 rounded border border-border/50">
          <Gauge className="w-3 h-3 text-muted-foreground" />
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-primary"
          />
          <span className="text-[9px] font-mono text-muted-foreground w-6">{sensitivity.toFixed(1)}x</span>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30 text-[9px] font-mono">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">MAG:</span>
          <span className="text-primary">{magnitude.toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn(
            "w-2 h-2 rounded-full",
            active ? "bg-emerald-500 animate-pulse" : "bg-red-500"
          )} />
          <span className="text-muted-foreground">{active ? 'ACTIVE' : 'OFFLINE'}</span>
        </div>
      </div>
    </div>
  );
};

export default JoystickControl;
