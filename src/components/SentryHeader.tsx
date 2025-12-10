
import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BellRing, Activity, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import flagVideo from '@/assets/flag-video.mp4';

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
    <header className="sentry-panel flex items-center justify-between h-auto min-h-[80px] mb-4 py-2 px-4">
      {/* Left side - Logo and Title */}
      <div className="flex items-center gap-4">
        <img 
          src={logo} 
          alt="YOD ALEF Engineering Logo" 
          className="h-[54px] w-auto object-contain"
          style={{ maxWidth: '63px' }}
        />
        <div className="flex flex-col">
          <h1 
            className="text-[36px] leading-tight font-bold tracking-wide text-sentry-primary"
            style={{ fontFamily: 'Algerian, "Times New Roman", serif' }}
          >
            B-THUNDER-01
          </h1>
          <span 
            className="text-[18px] text-sentry-accent/80"
            style={{ fontFamily: '"Imprint MT Shadow", "Times New Roman", serif' }}
          >
            constructed by YOD ALEF Engineering company
          </span>
        </div>
      </div>
      
      {/* Center - Status */}
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
          <Link to="/settings" className="hover:text-sentry-primary transition-colors" title="Settings">
            <Settings className="h-5 w-5 text-sentry-accent hover:text-sentry-primary" />
          </Link>
          <BellRing className="h-5 w-5 text-sentry-accent" />
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
        </div>
      </div>

      {/* Right side - Flag Video */}
      <div className="flex items-center">
        <div 
          className="overflow-hidden rounded border border-sentry-primary/30 shadow-lg shadow-sentry-primary/20"
          style={{ width: '138px', height: '65px' }}
        >
          <video 
            src={flagVideo}
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
};

export default SentryHeader;
