import React from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import logo from '@/assets/logo.png';
import flagVideo from '@/assets/flag-video.mp4';

interface SentryHeaderProps {
  systemStatus: 'active' | 'standby' | 'warning' | 'error';
}

const SentryHeader: React.FC<SentryHeaderProps> = ({ systemStatus }) => {
  return (
    <header className="sentry-panel flex items-center justify-between h-auto min-h-[120px] mb-4 py-3 px-6 ml-56">
      {/* Left side - Logo - Fixed centered vertically */}
      <div className="flex-shrink-0 fixed left-6 top-1/2 -translate-y-1/2 z-50">
        <img
          alt="YOD ALEF Engineering Logo"
          src={logo}
          className="object-contain rounded-sm drop-shadow-2xl"
          style={{
            width: '217px',
            height: '255px',
            filter: 'brightness(1.4) contrast(1.2) saturate(1.15) drop-shadow(0 0 20px rgba(0, 255, 136, 0.3))',
          }}
        />
      </div>

      {/* Center - Title and Info */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <h1
          style={{ fontFamily: 'Algerian, "Times New Roman", serif' }}
          className="leading-tight tracking-wide text-sentry-primary font-medium text-4xl md:text-5xl lg:text-6xl text-center"
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

      {/* Right side - Settings and Flag Video */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <Link
          to="/settings"
          className="hover:text-sentry-primary transition-colors"
          title="Settings"
        >
          <Settings className="h-5 w-5 text-sentry-accent hover:text-sentry-primary" />
        </Link>

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
