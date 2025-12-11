import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, Layout } from 'lucide-react';
import logo from '@/assets/logo.png';
import flagVideo from '@/assets/flag-video.mp4';

interface SentryHeaderProps {
  systemStatus: 'active' | 'standby' | 'warning' | 'error';
}

const SentryHeader: React.FC<SentryHeaderProps> = ({ systemStatus }) => {
  return (
    <header className="sentry-panel flex items-center justify-between h-auto min-h-[100px] mb-4 py-3 px-6">
      {/* Left side - Logo */}
      <div className="flex-shrink-0 flex items-center">
        <img
          alt="YOD ALEF Engineering Logo"
          src={logo}
          className="object-contain rounded-sm"
          style={{
            width: '80px',
            height: '92px',
            filter: 'brightness(1.3) contrast(1.1) saturate(1.1) drop-shadow(0 0 10px rgba(0, 255, 136, 0.2))',
          }}
        />
      </div>

      {/* Center - Title and Info */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <h1
          style={{ fontFamily: 'Algerian, "Times New Roman", serif' }}
          className="leading-tight tracking-wide text-sentry-primary font-medium text-3xl md:text-4xl lg:text-5xl text-center"
        >
          B-THUNDER-01
        </h1>
        <div
          style={{ fontFamily: '"Imprint MT Shadow", "Times New Roman", serif' }}
          className="text-sentry-accent/80 font-medium text-xs md:text-sm text-center mt-2 max-w-xl leading-relaxed"
        >
          <span className="block">constructed by YOD ALEF Engineering company</span>
          <span className="block mt-1 text-sentry-accent/60">
            Gmail: Workenih1219@Gmail.com | Telegram: https://t.me/WORKENIH
          </span>
        </div>
      </div>

      {/* Right side - Navigation, Settings and Flag Video */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          to="/workspace"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-sentry-primary/30 hover:bg-sentry-primary/10 transition-colors"
          title="Workspace"
        >
          <Layout className="h-4 w-4 text-sentry-primary" />
          <span className="text-xs text-sentry-accent hidden sm:inline">Workspace</span>
        </Link>

        <Link
          to="/settings"
          className="hover:text-sentry-primary transition-colors p-1.5"
          title="Settings"
        >
          <Settings className="h-5 w-5 text-sentry-accent hover:text-sentry-primary" />
        </Link>

        <div
          className="overflow-hidden rounded border border-sentry-primary/30 shadow-lg shadow-sentry-primary/20"
          style={{ width: '120px', height: '56px' }}
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
