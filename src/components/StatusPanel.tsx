
import React from 'react';
import { Activity, Cpu, HardDrive, Thermometer, Wifi } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface StatusPanelProps {
  systemActive: boolean;
}

const StatusPanel: React.FC<StatusPanelProps> = ({ systemActive }) => {
  // Simulated system stats
  const stats = {
    cpu: 34,
    memory: 42,
    network: 28,
    temperature: 38,
    storage: 67
  };

  const getProgressColor = (value: number) => {
    if (value < 40) return "bg-sentry-primary";
    if (value < 70) return "bg-yellow-500";
    return "bg-sentry-secondary";
  };

  return (
    <div className="sentry-panel h-full">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-sentry-accent" />
        <h2 className="sentry-title text-sm">SYSTEM STATUS</h2>
      </div>

      <div className="space-y-4">
        {/* CPU Usage */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3 w-3 text-sentry-accent" />
              <span>CPU</span>
            </div>
            <span className={cn(
              "font-mono",
              stats.cpu > 70 ? "text-sentry-secondary" : 
              stats.cpu > 40 ? "text-yellow-500" : 
              "text-sentry-primary"
            )}>
              {stats.cpu}%
            </span>
          </div>
          <Progress 
            value={stats.cpu} 
            className={cn("h-1 bg-muted", getProgressColor(stats.cpu))}
          />
        </div>

        {/* Memory Usage */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <HardDrive className="h-3 w-3 text-sentry-accent" />
              <span>MEMORY</span>
            </div>
            <span className={cn(
              "font-mono",
              stats.memory > 70 ? "text-sentry-secondary" : 
              stats.memory > 40 ? "text-yellow-500" : 
              "text-sentry-primary"
            )}>
              {stats.memory}%
            </span>
          </div>
          <Progress 
            value={stats.memory} 
            className={cn("h-1 bg-muted", getProgressColor(stats.memory))}
          />
        </div>

        {/* Network Usage */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Wifi className="h-3 w-3 text-sentry-accent" />
              <span>NETWORK</span>
            </div>
            <span className={cn(
              "font-mono",
              stats.network > 70 ? "text-sentry-secondary" : 
              stats.network > 40 ? "text-yellow-500" : 
              "text-sentry-primary"
            )}>
              {stats.network}%
            </span>
          </div>
          <Progress 
            value={stats.network} 
            className={cn("h-1 bg-muted", getProgressColor(stats.network))}
          />
        </div>

        {/* Temperature */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Thermometer className="h-3 w-3 text-sentry-accent" />
              <span>TEMPERATURE</span>
            </div>
            <span className={cn(
              "font-mono",
              stats.temperature > 70 ? "text-sentry-secondary" : 
              stats.temperature > 40 ? "text-yellow-500" : 
              "text-sentry-primary"
            )}>
              {stats.temperature}°C
            </span>
          </div>
          <Progress 
            value={stats.temperature} 
            className={cn("h-1 bg-muted", getProgressColor(stats.temperature))}
          />
        </div>

        {/* System Status */}
        <div className="mt-4 text-xs border border-border rounded p-2">
          <div className="flex justify-between items-center mb-1">
            <span>UPTIME</span>
            <span className="font-mono text-sentry-accent">02:34:15</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span>BATTERY</span>
            <span className="font-mono text-yellow-500">87%</span>
          </div>
          <div className="flex justify-between items-center">
            <span>STATUS</span>
            <div className="flex items-center gap-1.5">
              <span className={systemActive ? "text-sentry-primary" : "text-muted-foreground"}>
                {systemActive ? "ONLINE" : "STANDBY"}
              </span>
              <div className={cn(
                "h-2 w-2 rounded-full", 
                systemActive ? "bg-sentry-primary animate-pulse" : "bg-muted"
              )}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;
