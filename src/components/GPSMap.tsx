import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Navigation, Compass, Locate, AlertCircle, Loader2, Globe2, Activity, Mountain, Gauge, Crosshair, Clock } from 'lucide-react';
import { useThreatStore } from '@/stores/threatStore';
import { useGPSStore } from '@/stores/gpsStore';

interface LocationDetails {
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  road?: string;
  postcode?: string;
  display?: string;
}

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
  
  const [staticMarkers] = useState<MapMarker[]>([
    { id: 'self', x: 50, y: 50, type: 'current', label: 'YOU' },
    { id: 'wp1', x: 25, y: 65, type: 'waypoint', label: 'WP-1' },
    { id: 'base', x: 80, y: 75, type: 'poi', label: 'BASE' },
  ]);

  const [mapScale, setMapScale] = useState(1);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'active' | 'error'>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [lastFix, setLastFix] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  // re-render every second so "last fix" age stays live
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const liveThreats = useThreatStore((s) => s.liveThreats);

  // Project lat/lon onto local map (~5km window centered on user)
  const threatMarkers: MapMarker[] = useMemo(() => {
    const span = 0.05; // ~5km
    return liveThreats.slice(0, 12).map((t, i) => {
      const dx = (t.target_lon - gpsData.longitude) / span;
      const dy = (t.target_lat - gpsData.latitude) / span;
      const x = Math.max(2, Math.min(98, 50 + dx * 50));
      const y = Math.max(2, Math.min(98, 50 - dy * 50));
      return { id: `threat-${t.id}`, x, y, type: 'target', label: `T-${i + 1}` };
    });
  }, [liveThreats, gpsData.latitude, gpsData.longitude]);

  const markers = useMemo(() => [...staticMarkers, ...threatMarkers], [staticMarkers, threatMarkers]);

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
        
        const fix = {
          latitude,
          longitude,
          altitude: altitude || 0,
          accuracy: accuracy || 5,
          heading: heading || 0,
          speed: speed || 0,
        };
        setGpsData(fix);
        useGPSStore.getState().setFix(fix);
        
        setGpsStatus('active');
        setLastFix(Date.now());
        onLocationUpdate?.(latitude, longitude);
      },
        setLastFix(Date.now());
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

  // Reverse geocode current position (debounced)
  useEffect(() => {
    if (gpsStatus !== 'active') return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setGeoLoading(true);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${gpsData.latitude}&lon=${gpsData.longitude}&zoom=16&addressdetails=1`,
          { signal: ctrl.signal, headers: { 'Accept-Language': 'en' } },
        );
        if (!res.ok) throw new Error('geocode failed');
        const j = await res.json();
        const a = j.address || {};
        setLocationDetails({
          city: a.city || a.town || a.village || a.hamlet || a.suburb,
          state: a.state || a.region,
          country: a.country,
          countryCode: (a.country_code || '').toUpperCase(),
          road: a.road || a.pedestrian || a.neighbourhood,
          postcode: a.postcode,
          display: j.display_name,
        });
      } catch (_) {
        /* offline / blocked — keep prior */
      } finally {
        setGeoLoading(false);
      }
    }, 1500);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [gpsStatus, Math.round(gpsData.latitude * 1000), Math.round(gpsData.longitude * 1000)]);

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

      {/* Detailed Location Panel (reverse geocoded + live telemetry) */}
      <div className="absolute top-2 right-16 bg-card/90 backdrop-blur rounded border border-border p-2 max-w-[260px] text-[9px] font-mono">
        <div className="flex items-center gap-1 mb-1">
          <Globe2 className="w-3 h-3 text-cyan-400" />
          <span className="text-cyan-400 font-display">MY LOCATION</span>
          {geoLoading && <Loader2 className="w-2.5 h-2.5 animate-spin text-muted-foreground ml-auto" />}
          {!geoLoading && lastFix && (
            <span className="ml-auto flex items-center gap-1 text-[8px] text-muted-foreground">
              <Clock className="w-2.5 h-2.5" />
              {Math.max(0, Math.floor((Date.now() - lastFix) / 1000))}s ago
            </span>
          )}
        </div>

        {/* Live telemetry grid */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mb-1.5 pb-1.5 border-b border-border/40">
          <div className="flex items-center gap-1">
            <Crosshair className="w-2.5 h-2.5 text-emerald-400" />
            <span className="text-muted-foreground">LAT</span>
          </div>
          <span className="text-emerald-400 text-right">{gpsData.latitude.toFixed(6)}°</span>

          <div className="flex items-center gap-1">
            <Crosshair className="w-2.5 h-2.5 text-emerald-400" />
            <span className="text-muted-foreground">LON</span>
          </div>
          <span className="text-emerald-400 text-right">{gpsData.longitude.toFixed(6)}°</span>

          <div className="flex items-center gap-1">
            <Mountain className="w-2.5 h-2.5 text-amber-400" />
            <span className="text-muted-foreground">ALT</span>
          </div>
          <span className="text-amber-400 text-right">{gpsData.altitude.toFixed(1)} m</span>

          <div className="flex items-center gap-1">
            <Activity className="w-2.5 h-2.5 text-fuchsia-400" />
            <span className="text-muted-foreground">ACC</span>
          </div>
          <span className="text-fuchsia-400 text-right">±{gpsData.accuracy.toFixed(1)} m</span>

          <div className="flex items-center gap-1">
            <Gauge className="w-2.5 h-2.5 text-sky-400" />
            <span className="text-muted-foreground">SPD</span>
          </div>
          <span className="text-sky-400 text-right">
            {gpsData.speed.toFixed(2)} m/s · {(gpsData.speed * 3.6).toFixed(1)} km/h
          </span>

          <div className="flex items-center gap-1">
            <Compass className="w-2.5 h-2.5 text-cyan-400" />
            <span className="text-muted-foreground">HDG</span>
          </div>
          <span className="text-cyan-400 text-right">{gpsData.heading.toFixed(1)}°</span>
        </div>

        {locationDetails ? (
          <div className="space-y-0.5">
            {locationDetails.road && (
              <div className="text-foreground truncate">📍 {locationDetails.road}</div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">CITY:</span>
              <span className="text-foreground truncate">{locationDetails.city || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">REGION:</span>
              <span className="text-foreground truncate">{locationDetails.state || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">COUNTRY:</span>
              <span className="text-emerald-400">
                {locationDetails.country || '—'}{' '}
                {locationDetails.countryCode && <span className="text-muted-foreground">[{locationDetails.countryCode}]</span>}
              </span>
            </div>
            {locationDetails.postcode && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">POSTAL:</span>
                <span className="text-foreground">{locationDetails.postcode}</span>
              </div>
            )}
            {locationDetails.display && (
              <div className="text-[8px] text-muted-foreground/80 mt-1 leading-tight line-clamp-2">
                {locationDetails.display}
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground text-[9px]">
            {gpsStatus === 'active' ? 'Resolving address…' : 'Awaiting GPS lock'}
          </div>
        )}
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
