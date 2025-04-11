
import React from 'react';
import { Shield, AlertTriangle, BellRing, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SentryHeaderProps {
  systemStatus: 'active' | 'standby' | 'warning' | 'error';
}

const SentryHeader: React.FC<SentryHeaderProps> = ({ systemStatus }) => {
  const statusColors = {
    active: 'text-sentry-primary animate-pulse',
    standby: 'text-yellow-500',
    warning: 'text-orange-500 animate-pulse',
    error: 'text-sentry-secondary animate-blink'
  };

  const statusMessages = {
    active: 'SYSTEM ACTIVE - MONITORING',
    standby: 'STANDBY MODE',
    warning: 'WARNING: SYSTEM ISSUES DETECTED',
    error: 'CRITICAL ERROR'
  };

  return (
    <header className="sentry-panel flex items-center justify-between h-16 mb-4">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-sentry-primary" />
        <h1 className="sentry-title text-xl md:text-2xl">SENTRY GUARDIAN</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs">CPU: 34%</span>
          <Activity className="h-4 w-4 text-sentry-accent" />
        </div>
        
        <div className="flex items-center gap-2">
          <span className={cn("font-mono text-xs md:text-sm", statusColors[systemStatus])}>
            {statusMessages[systemStatus]}
          </span>
          <div className={cn("h-2 w-2 rounded-full", statusColors[systemStatus])}></div>
        </div>
        
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-sentry-accent" />
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
        </div>
      </div>
    </header>
  );
};

export default SentryHeader;
