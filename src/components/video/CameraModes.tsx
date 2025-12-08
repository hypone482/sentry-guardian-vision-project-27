import React from 'react';
import { cn } from '@/lib/utils';
import { Eye, Thermometer, Target, Camera } from 'lucide-react';

export type CameraMode = 'normal' | 'nightVision' | 'thermal' | 'rangeFinder';

interface CameraModesProps {
  currentMode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
  active: boolean;
}

const CameraModes: React.FC<CameraModesProps> = ({
  currentMode,
  onModeChange,
  active
}) => {
  const modes: { id: CameraMode; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'normal', label: 'NORM', icon: <Camera className="w-3 h-3" />, shortcut: '1' },
    { id: 'nightVision', label: 'NVIS', icon: <Eye className="w-3 h-3" />, shortcut: '2' },
    { id: 'thermal', label: 'THML', icon: <Thermometer className="w-3 h-3" />, shortcut: '3' },
    { id: 'rangeFinder', label: 'RNGE', icon: <Target className="w-3 h-3" />, shortcut: '4' },
  ];

  return (
    <div className="absolute top-12 left-3 flex flex-col gap-1 z-20">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => active && onModeChange(mode.id)}
          disabled={!active}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono uppercase transition-all duration-200 border rounded",
            currentMode === mode.id
              ? mode.id === 'nightVision'
                ? "bg-green-500/30 border-green-500 text-green-400 shadow-[0_0_8px_rgba(0,255,0,0.4)]"
                : mode.id === 'thermal'
                ? "bg-orange-500/30 border-orange-500 text-orange-400 shadow-[0_0_8px_rgba(255,165,0,0.4)]"
                : mode.id === 'rangeFinder'
                ? "bg-cyan-500/30 border-cyan-500 text-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.4)]"
                : "bg-sentry-accent/30 border-sentry-accent text-sentry-accent"
              : "bg-sentry-muted/60 border-sentry-border text-muted-foreground hover:border-sentry-accent/50",
            !active && "opacity-50 cursor-not-allowed"
          )}
        >
          {mode.icon}
          <span>{mode.label}</span>
          <span className="text-[8px] opacity-60">[{mode.shortcut}]</span>
        </button>
      ))}
    </div>
  );
};

export default CameraModes;
