import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Database, CheckCircle } from 'lucide-react';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* Fixed status indicator */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-sm transition-all duration-300 ${
            isOnline
              ? 'bg-green-500/20 border-green-500/50 text-green-400'
              : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span className="text-xs font-medium">ONLINE</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 animate-pulse" />
              <span className="text-xs font-medium">OFFLINE MODE</span>
              <Database className="h-3 w-3 ml-1" />
            </>
          )}
        </div>
      </div>

      {/* Notification popup */}
      {showNotification && (
        <div
          className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-md transition-all duration-500 animate-in slide-in-from-right ${
            isOnline
              ? 'bg-green-500/30 border-green-500/60 text-green-300'
              : 'bg-amber-500/30 border-amber-500/60 text-amber-300'
          }`}
        >
          {isOnline ? (
            <>
              <CheckCircle className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Connection Restored</p>
                <p className="text-xs opacity-80">Data will sync automatically</p>
              </div>
            </>
          ) : (
            <>
              <WifiOff className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Working Offline</p>
                <p className="text-xs opacity-80">All features available locally</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default OfflineIndicator;
