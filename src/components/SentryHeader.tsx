import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, Layout, Home, Monitor, Map, Radio, Activity, Crosshair } from 'lucide-react';
import logo from '@/assets/logo.png';
import flagVideo from '@/assets/flag-video.mp4';
import { cn } from '@/lib/utils';

interface SentryHeaderProps {
  systemStatus: 'active' | 'standby' | 'warning' | 'error';
}

const SentryHeader: React.FC<SentryHeaderProps> = ({
  systemStatus
}) => {
  const location = useLocation();
  
  const navLinks = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/workspace', icon: Layout, label: 'Workspace' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const quickLinks = [
    { icon: Monitor, label: 'Video', section: 'video' },
    { icon: Radio, label: 'Radar', section: 'radar' },
    { icon: Map, label: 'GPS', section: 'gpsmap' },
    { icon: Activity, label: 'Status', section: 'status' },
    { icon: Crosshair, label: 'Target', section: 'globe3d' },
  ];

  return (
    <header className="sentry-panel flex items-center justify-between h-auto min-h-[120px] mb-4 py-3 px-6">
      {/* Left side - Logo */}
      <div className="flex-shrink-0 flex items-center">
        <img
          alt="YOD ALEF Engineering Logo"
          src={logo}
          style={{
            width: '100px',
            height: '114px',
            filter: 'brightness(1.3) contrast(1.1) saturate(1.1) drop-shadow(0 0 12px rgba(0, 255, 136, 0.3))'
          }}
          className="object-contain rounded-none"
        />
      </div>

      {/* Center - Title, Info, and Navigation */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <h1
          style={{ fontFamily: 'Algerian, "Times New Roman", serif' }}
          className="leading-tight tracking-wide text-sentry-primary font-medium text-3xl md:text-4xl lg:text-5xl text-center"
        >
          B-THUNDER-01
        </h1>
        <div
          style={{ fontFamily: '"Imprint MT Shadow", "Times New Roman", serif' }}
          className="text-sentry-accent/80 font-medium text-xs md:text-sm text-center mt-1 max-w-xl leading-relaxed"
        >
          <span className="block">constructed by YOD ALEF Engineering company</span>
          <span className="block mt-0.5 text-sentry-accent/60 text-[10px]">
            Gmail: Workenih1219@Gmail.com | Telegram: https://t.me/WORKENIH
          </span>
        </div>
        
        {/* Navigation Links */}
        <div className="flex items-center gap-2 mt-3">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors text-xs",
                  isActive
                    ? "border-sentry-primary bg-sentry-primary/20 text-sentry-primary"
                    : "border-sentry-primary/30 hover:bg-sentry-primary/10 text-sentry-accent"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
          
          <div className="h-4 w-px bg-sentry-primary/30 mx-1" />
          
          {/* Quick Section Links */}
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.section}
                onClick={() => {
                  const el = document.querySelector(`[data-panel="${link.section}"]`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="flex items-center gap-1 px-2 py-1 rounded border border-border/40 hover:border-sentry-accent/50 hover:bg-sentry-accent/10 transition-colors text-[10px] text-muted-foreground hover:text-sentry-accent"
                title={`Jump to ${link.label}`}
              >
                <Icon className="h-3 w-3" />
                <span className="hidden lg:inline">{link.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right side - Status and Flag Video */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* System Status Indicator */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">STATUS</span>
            <div className={cn(
              "h-2.5 w-2.5 rounded-full animate-pulse",
              systemStatus === 'active' && "bg-green-500",
              systemStatus === 'standby' && "bg-yellow-500",
              systemStatus === 'warning' && "bg-orange-500",
              systemStatus === 'error' && "bg-red-500"
            )} />
          </div>
          <span className={cn(
            "text-xs font-mono uppercase",
            systemStatus === 'active' && "text-green-500",
            systemStatus === 'standby' && "text-yellow-500",
            systemStatus === 'warning' && "text-orange-500",
            systemStatus === 'error' && "text-red-500"
          )}>
            {systemStatus}
          </span>
        </div>

        <div
          className="overflow-hidden rounded border border-sentry-primary/30 shadow-lg shadow-sentry-primary/20"
          style={{ width: '130px', height: '60px' }}
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
