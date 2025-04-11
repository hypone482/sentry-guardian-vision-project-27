
import React from 'react';
import { Sliders, Power, Eye, EyeOff, Settings, RotateCcw, Lock, Unlock } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from '@/lib/utils';

interface ControlPanelProps {
  sensitivity: number;
  onSensitivityChange: (value: number) => void;
  systemActive: boolean;
  onSystemActiveChange: (active: boolean) => void;
  trackingMode: 'passive' | 'active';
  onTrackingModeChange: (mode: 'passive' | 'active') => void;
  onReset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  sensitivity,
  onSensitivityChange,
  systemActive,
  onSystemActiveChange,
  trackingMode,
  onTrackingModeChange,
  onReset
}) => {
  return (
    <div className="sentry-panel h-full">
      <div className="flex items-center gap-2 mb-4">
        <Sliders className="h-4 w-4 text-sentry-accent" />
        <h2 className="sentry-title text-sm">SYSTEM CONTROLS</h2>
      </div>

      <div className="space-y-6">
        {/* System Power */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">SYSTEM POWER</label>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-8 px-3 text-xs", 
                systemActive 
                  ? "bg-sentry-primary/20 text-sentry-primary hover:bg-sentry-primary/30" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted/70"
              )}
              onClick={() => onSystemActiveChange(!systemActive)}
            >
              <Power className="h-3 w-3 mr-2" />
              {systemActive ? "ONLINE" : "STANDBY"}
            </Button>
          </div>
          <div className="h-px bg-border/50 w-full" />
        </div>

        {/* Sensitivity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">DETECTION SENSITIVITY</label>
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
              {sensitivity}%
            </span>
          </div>
          <Slider
            disabled={!systemActive}
            value={[sensitivity]}
            onValueChange={(values) => onSensitivityChange(values[0])}
            min={10}
            max={100}
            step={5}
            className={systemActive ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}
          />
        </div>

        {/* Tracking Mode */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">TRACKING MODE</label>
            <div className="flex items-center">
              <Switch
                disabled={!systemActive}
                checked={trackingMode === 'active'}
                onCheckedChange={(checked) => 
                  onTrackingModeChange(checked ? 'active' : 'passive')
                }
                className={systemActive ? "" : "opacity-50"}
              />
              <span className="ml-2 text-xs">
                {trackingMode === 'active' ? (
                  <Eye className="h-3 w-3 text-sentry-primary" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {trackingMode === 'active' 
              ? "Active tracking enabled. System will follow motion."
              : "Passive monitoring only. No active tracking."
            }
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onReset}
          >
            <RotateCcw className="h-3 w-3 mr-2" />
            RESET
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={!systemActive}
          >
            <Settings className="h-3 w-3 mr-2" />
            CONFIG
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="text-xs col-span-2 bg-sentry-muted hover:bg-sentry-muted/70"
          >
            {systemActive ? (
              <>
                <Lock className="h-3 w-3 mr-2 text-sentry-primary" />
                <span className="text-sentry-primary">SYSTEM SECURED</span>
              </>
            ) : (
              <>
                <Unlock className="h-3 w-3 mr-2 text-yellow-500" />
                <span className="text-yellow-500">SYSTEM UNLOCKED</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
