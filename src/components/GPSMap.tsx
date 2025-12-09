import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Navigation, Compass, Locate, AlertCircle, Loader2 } from 'lucide-react';

interface GPSData {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  heading: number;
  speed: number;
}

interface MapMarker {
  id: string;
  x: number;
  y: number;
  type: 'current' | 'waypoint' | 'target' | 'poi';
  label?: string;
}

interface GPSMapProps {
  active?: boolean;
  className?: string;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

const GPSMap: React.FC<GPSMapProps> = ({ active = true, className, onLocationUpdate }) => {
  const [gpsData, setGpsData] = useState<GPSData>({
    latitude: 40.7128,
    longitude: -74.0060,
    altitude: 10,
    accuracy: 5,
    heading: 45,
    speed: 0
  });
  
  const [markers, setMarkers] = useState<MapMarker[]>([
    { id: '1', x: 50, y: 50, type: 'current', label: 'YOU' },
    { id: '2', x: 70, y: 30, type: 'target', label: 'TGT-A' },
    { id: '3', x: 25, y: 65, type: 'waypoint', label: 'WP-1' },
    { id: '4', x: 80, y: 75, type: 'poi', label: 'BASE' },
  ]);

  const [mapScale, setMapScale] = useState(1);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'active' | 'error'>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Request real GPS location
  const requestGPSLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported');
      setGpsStatus('error');
      return;
    }

    setGpsStatus('loading');
    setGpsError(null);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, altitude, accuracy, heading, speed } = position.coords;
        
        setGpsData({
          latitude,
          longitude,
          altitude: altitude || 0,
          accuracy: accuracy || 5,
          heading: heading || 0,
          speed: speed || 0
        });
        
        setGpsStatus('active');
        onLocationUpdate?.(latitude, longitude);
      },
      (error) => {
        console.error('GPS Error:', error);
        setGpsError(error.message);
        setGpsStatus('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );

    setWatchId(id);
  }, [onLocationUpdate]);

  // Cleanup GPS watch on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Auto-start GPS when active
  useEffect(() => {
    if (active && gpsStatus === 'idle') {
      requestGPSLocation();
    }
  }, [active, gpsStatus, requestGPSLocation]);

  const getMarkerColor = (type: MapMarker['type']) => {
    switch (type) {
      case 'current': return 'bg-emerald-500';
      case 'target': return 'bg-red-500';
      case 'waypoint': return 'bg-cyan-400';
      case 'poi': return 'bg-yellow-400';
    }
  };

  const formatCoordinate = (value: number, isLat: boolean) => {
    const direction = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    const abs = Math.abs(value);
    const degrees = Math.floor(abs);
    const minutes = Math.floor((abs - degrees) * 60);
    const seconds = ((abs - degrees - minutes / 60) * 3600).toFixed(2);
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  return (
    <div className={cn("relative h-full min-h-[250px]", className)}>
      {/* Map Display */}
      <div className="absolute inset-0 bg-slate-950 rounded overflow-hidden">
        {/* Grid overlay */}
        <svg className="absolute inset-0 w-full h-full">
          {/* Grid lines */}
          {Array.from({ length: 10 }).map((_, i) => (
            <React.Fragment key={i}>
              <line
                x1={`${(i + 1) * 10}%`}
                y1="0"
                x2={`${(i + 1) * 10}%`}
                y2="100%"
                stroke="hsl(142, 76%, 44%)"
                strokeWidth="0.5"
                opacity="0.15"
              />
              <line
                x1="0"
                y1={`${(i + 1) * 10}%`}
                x2="100%"
                y2={`${(i + 1) * 10}%`}
                stroke="hsl(142, 76%, 44%)"
                strokeWidth="0.5"
                opacity="0.15"
              />
            </React.Fragment>
          ))}
          
          {/* Simulated terrain/structures */}
          <rect x="15%" y="20%" width="10%" height="15%" fill="hsl(142, 76%, 44%)" opacity="0.2" />
          <rect x="60%" y="45%" width="20%" height="8%" fill="hsl(142, 76%, 44%)" opacity="0.15" />
          <rect x="35%" y="70%" width="12%" height="12%" fill="hsl(142, 76%, 44%)" opacity="0.2" />
          <polygon points="200,150 220,120 240,150" fill="hsl(142, 76%, 44%)" opacity="0.25" />
          
          {/* Roads */}
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="hsl(210, 70%, 50%)" strokeWidth="2" opacity="0.3" />
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="hsl(210, 70%, 50%)" strokeWidth="2" opacity="0.3" />
        </svg>

        {/* Map markers */}
        {markers.map(marker => (
          <div
            key={marker.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
          >
            <div className={cn(
              "w-3 h-3 rounded-full border-2 border-background",
              getMarkerColor(marker.type),
              marker.type === 'current' && "animate-pulse"
            )}
              style={{ boxShadow: `0 0 10px currentColor` }}
            />
            {marker.type === 'current' && (
              <div 
                className="absolute w-6 h-6 -top-1.5 -left-1.5"
                style={{ transform: `rotate(${gpsData.heading}deg)` }}
              >
                <Navigation className="w-full h-full text-emerald-500" style={{ transform: 'rotate(0deg)' }} />
              </div>
            )}
            <span className="absolute left-4 top-0 text-[9px] font-mono text-foreground whitespace-nowrap">
              {marker.label}
            </span>
          </div>
        ))}

        {/* Distance lines from current position */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {markers.filter(m => m.type !== 'current').map(marker => (
            <line
              key={`line-${marker.id}`}
              x1="50%"
              y1="50%"
              x2={`${marker.x}%`}
              y2={`${marker.y}%`}
              stroke="hsl(210, 70%, 50%)"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.3"
            />
          ))}
        </svg>

        {/* Compass overlay */}
        <div className="absolute top-2 right-2 w-12 h-12">
          <div 
            className="w-full h-full rounded-full border border-primary/30 bg-card/50 flex items-center justify-center"
            style={{ transform: `rotate(${-gpsData.heading}deg)` }}
          >
            <div className="text-[8px] font-bold text-red-500 absolute top-1">N</div>
            <div className="text-[8px] text-muted-foreground absolute bottom-1">S</div>
            <div className="text-[8px] text-muted-foreground absolute right-1">E</div>
            <div className="text-[8px] text-muted-foreground absolute left-1">W</div>
            <div className="w-0.5 h-4 bg-gradient-to-b from-red-500 to-foreground absolute" />
          </div>
        </div>

        {/* Scale indicator */}
        <div className="absolute bottom-12 right-2 text-[9px] font-mono text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-12 h-0.5 bg-primary" />
            <span>100m</span>
          </div>
        </div>
      </div>

      {/* GPS Data Panel */}
      <div className="absolute top-2 left-2 bg-card/90 backdrop-blur rounded border border-border p-2 min-w-[140px]">
        <div className="flex items-center gap-1 mb-2">
          {gpsStatus === 'loading' ? (
            <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
          ) : gpsStatus === 'error' ? (
            <AlertCircle className="w-3 h-3 text-red-500" />
          ) : (
            <Locate className={cn("w-3 h-3", gpsStatus === 'active' ? "text-emerald-500" : "text-muted-foreground")} />
          )}
          <span className="text-[10px] font-display text-primary">
            {gpsStatus === 'active' ? 'GPS LOCK' : gpsStatus === 'loading' ? 'ACQUIRING...' : gpsStatus === 'error' ? 'GPS ERROR' : 'GPS IDLE'}
          </span>
          <span className={cn(
            "w-2 h-2 rounded-full ml-auto",
            gpsStatus === 'active' ? "bg-emerald-500 animate-pulse" : 
            gpsStatus === 'loading' ? "bg-yellow-500 animate-pulse" : "bg-red-500"
          )} />
        </div>
        
        {gpsError && (
          <div className="text-[8px] text-red-400 mb-1 break-words max-w-[120px]">{gpsError}</div>
        )}
        
        {gpsStatus !== 'active' && (
          <button
            onClick={requestGPSLocation}
            className="w-full text-[9px] font-mono bg-primary/20 text-primary border border-primary/40 rounded px-2 py-1 mb-2 hover:bg-primary/30"
          >
            {gpsStatus === 'loading' ? 'ACQUIRING...' : 'ENABLE GPS'}
          </button>
        )}
        
        <div className="space-y-1 text-[9px] font-mono">
          <div className="flex justify-between">
            <span className="text-muted-foreground">LAT:</span>
            <span className="text-foreground">{formatCoordinate(gpsData.latitude, true)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">LON:</span>
            <span className="text-foreground">{formatCoordinate(gpsData.longitude, false)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ALT:</span>
            <span className="text-foreground">{gpsData.altitude.toFixed(1)}m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">HDG:</span>
            <span className="text-cyan-400">{gpsData.heading.toFixed(0)}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">SPD:</span>
            <span className="text-foreground">{gpsData.speed.toFixed(1)} m/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ACC:</span>
            <span className="text-emerald-400">±{gpsData.accuracy}m</span>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-card/80 backdrop-blur border-t border-border p-2">
        <div className="flex items-center justify-between text-[9px] font-mono">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-500" />
              <span className="text-muted-foreground">TGT:</span>
              <span className="text-red-500">{markers.filter(m => m.type === 'target').length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Navigation className="w-3 h-3 text-cyan-400" />
              <span className="text-muted-foreground">WP:</span>
              <span className="text-cyan-400">{markers.filter(m => m.type === 'waypoint').length}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Compass className="w-3 h-3 text-primary" />
            <span className="text-primary">{gpsData.heading.toFixed(0)}° MAG</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPSMap;
