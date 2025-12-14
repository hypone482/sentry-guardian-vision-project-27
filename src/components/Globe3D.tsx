import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useLoader, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import earthTexture from '@/assets/earth-texture.jpg';
import earthNormal from '@/assets/earth-normal.jpg';
import earthSpecular from '@/assets/earth-specular.jpg';
import earthClouds from '@/assets/earth-clouds.png';
import { useThreatState, SharedThreat } from '@/hooks/useThreatState';
import { Shield, Crosshair, Zap, Target } from 'lucide-react';

interface Attack {
  id: string;
  originLat: number;
  originLng: number;
  originName: string;
  originCountry: string;
  type: 'missile' | 'drone' | 'aircraft' | 'cyber' | 'artillery';
  threatLevel: 'critical' | 'high' | 'medium' | 'low';
  velocity: number;
  altitude: number;
  eta: number;
  progress: number;
  distance: number;
  neutralized?: boolean;
}

interface Globe3DProps {
  active?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
}

const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
};

const getArcPoints = (
  startLat: number, startLng: number,
  endLat: number, endLng: number,
  radius: number,
  segments: number = 50,
  progress: number = 1,
  arcHeight: number = 0.3
): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  const activeSegments = Math.floor(segments * progress);
  
  for (let i = 0; i <= activeSegments; i++) {
    const t = i / segments;
    const lat = startLat + (endLat - startLat) * t;
    const lng = startLng + (endLng - startLng) * t;
    const heightMultiplier = Math.sin(t * Math.PI) * arcHeight;
    const currentRadius = radius + heightMultiplier;
    points.push(latLngToVector3(lat, lng, currentRadius));
  }
  
  return points;
};

const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate angle from target location (for radar sync)
const calculateAngleFromTarget = (
  originLat: number, 
  originLng: number, 
  targetLat: number, 
  targetLng: number
): number => {
  const dLng = (originLng - targetLng) * Math.PI / 180;
  const lat1 = targetLat * Math.PI / 180;
  const lat2 = originLat * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  let angle = Math.atan2(y, x) * 180 / Math.PI;
  return (angle + 360) % 360;
};

const Earth = ({ userLocation }: { userLocation: { lat: number; lng: number } }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  const [colorMap, normalMap, specularMap, cloudsMap] = useLoader(TextureLoader, [
    earthTexture,
    earthNormal,
    earthSpecular,
    earthClouds
  ]);

  const gridGeometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(2.015, 72, 36);
    return new THREE.WireframeGeometry(geo);
  }, []);

  useFrame(() => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.0003;
    }
  });

  const latitudeLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    for (let lat = -80; lat <= 80; lat += 20) {
      const pts: THREE.Vector3[] = [];
      for (let lng = 0; lng <= 360; lng += 3) {
        pts.push(latLngToVector3(lat, lng - 180, 2.018));
      }
      lines.push(pts);
    }
    return lines;
  }, []);

  const longitudeLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    for (let lng = -180; lng < 180; lng += 20) {
      const pts: THREE.Vector3[] = [];
      for (let lat = -90; lat <= 90; lat += 3) {
        pts.push(latLngToVector3(lat, lng, 2.018));
      }
      lines.push(pts);
    }
    return lines;
  }, []);

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 128, 64]} />
        <meshPhongMaterial
          map={colorMap}
          normalMap={normalMap}
          specularMap={specularMap}
          specular={new THREE.Color(0x333333)}
          shininess={15}
        />
      </mesh>

      <lineSegments geometry={gridGeometry}>
        <lineBasicMaterial color="#22c55e" transparent opacity={0.08} />
      </lineSegments>

      {latitudeLines.map((points, i) => (
        <Line key={`lat-${i}`} points={points} color="#22c55e" lineWidth={0.5} transparent opacity={0.15} />
      ))}

      {longitudeLines.map((points, i) => (
        <Line key={`lng-${i}`} points={points} color="#22c55e" lineWidth={0.5} transparent opacity={0.15} />
      ))}

      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.03, 64, 64]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[2.08, 64, 64]} />
        <meshBasicMaterial
          color="#4da6ff"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshBasicMaterial
          color="#1e90ff"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>

      <Line 
        points={Array.from({ length: 121 }, (_, i) => latLngToVector3(0, i * 3 - 180, 2.02))} 
        color="#ffcc00" 
        lineWidth={1} 
        transparent 
        opacity={0.3} 
      />

      <UserMarker lat={userLocation.lat} lng={userLocation.lng} />
    </group>
  );
};

const UserMarker = ({ lat, lng }: { lat: number; lng: number }) => {
  const position = latLngToVector3(lat, lng, 2.06);
  const pulseRef = useRef<THREE.Mesh>(null);
  const outerPulseRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (pulseRef.current) {
      const scale = 1 + Math.sin(time * 4) * 0.3;
      pulseRef.current.scale.setScalar(scale);
    }
    if (outerPulseRef.current) {
      const scale = 1.5 + Math.sin(time * 2) * 0.5;
      outerPulseRef.current.scale.setScalar(scale);
      const mat = outerPulseRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 - Math.sin(time * 2) * 0.15;
    }
    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + Math.sin(time * 3) * 0.2;
    }
  });

  return (
    <group position={position}>
      <mesh ref={outerPulseRef}>
        <ringGeometry args={[0.12, 0.15, 32]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      
      <mesh>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1} />
      </mesh>
      
      <mesh ref={pulseRef}>
        <ringGeometry args={[0.07, 0.09, 32]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      
      <mesh ref={beamRef} position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.3, 8]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.4} />
      </mesh>
      
      <Html distanceFactor={8}>
        <div className="bg-emerald-900/90 px-2 py-1 rounded text-[10px] font-mono text-emerald-400 whitespace-nowrap border border-emerald-500/50 shadow-lg shadow-emerald-500/20">
          <div className="font-bold">YOUR LOCATION</div>
          <div className="text-[8px] text-emerald-300/70">ETHIOPIA - PROTECTED</div>
        </div>
      </Html>
    </group>
  );
};

const AttackOriginMarker = ({ attack }: { attack: Attack }) => {
  const position = latLngToVector3(attack.originLat, attack.originLng, 2.05);
  const ref = useRef<THREE.Mesh>(null);
  
  const threatColors = {
    critical: '#ff0000',
    high: '#ff4444',
    medium: '#ff8800',
    low: '#ffcc00'
  };
  
  const typeIcons = {
    missile: '🚀',
    drone: '🛩️',
    aircraft: '✈️',
    cyber: '💻',
    artillery: '💥'
  };
  
  const color = attack.neutralized ? '#666666' : threatColors[attack.threatLevel];

  useFrame((state) => {
    if (ref.current && !attack.neutralized) {
      ref.current.rotation.y += 0.03;
      const scale = 0.8 + Math.sin(state.clock.elapsedTime * 5) * 0.2;
      ref.current.scale.setScalar(scale);
    }
  });

  if (attack.neutralized) return null;

  return (
    <group position={position}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.05]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={1} 
        />
      </mesh>
      <Html distanceFactor={8}>
        <div 
          className="px-1.5 py-0.5 rounded text-[8px] font-mono whitespace-nowrap border shadow-lg"
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.85)', 
            color, 
            borderColor: color,
            boxShadow: `0 0 10px ${color}40`
          }}
        >
          <div className="flex items-center gap-1">
            <span>{typeIcons[attack.type]}</span>
            <span className="font-bold">{attack.originCountry}</span>
          </div>
          <div className="text-[7px] opacity-80">{attack.originName}</div>
        </div>
      </Html>
    </group>
  );
};

// Clickable attack arc with interception capability
const AttackArc = ({ 
  attack, 
  targetLat, 
  targetLng,
  onIntercept,
  interceptMode
}: { 
  attack: Attack; 
  targetLat: number; 
  targetLng: number;
  onIntercept: (id: string) => void;
  interceptMode: boolean;
}) => {
  const lineRef = useRef<any>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const threatColors = {
    critical: '#ff0000',
    high: '#ff4444',
    medium: '#ff8800',
    low: '#ffcc00'
  };
  
  const color = attack.neutralized ? '#444444' : threatColors[attack.threatLevel];
  
  const arcPoints = useMemo(() => {
    return getArcPoints(
      attack.originLat, attack.originLng,
      targetLat, targetLng,
      2,
      60,
      attack.neutralized ? 0 : attack.progress,
      0.4 + (attack.altitude / 50000) * 0.3
    );
  }, [attack, targetLat, targetLng]);

  const headPosition = arcPoints.length > 0 ? arcPoints[arcPoints.length - 1] : null;

  useFrame((state) => {
    if (headRef.current && headPosition && !attack.neutralized) {
      headRef.current.rotation.y += 0.1;
      const scale = 0.8 + Math.sin(state.clock.elapsedTime * 10) * 0.3;
      headRef.current.scale.setScalar(scale);
    }
  });

  if (arcPoints.length < 2 || attack.neutralized) return null;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (interceptMode) {
      e.stopPropagation();
      onIntercept(attack.id);
    }
  };

  return (
    <group>
      <Line 
        points={arcPoints} 
        color={hovered && interceptMode ? '#00ff00' : color} 
        lineWidth={hovered ? 4 : 2} 
        transparent 
        opacity={0.8}
      />
      
      <Line 
        points={arcPoints} 
        color={color} 
        lineWidth={4} 
        transparent 
        opacity={0.3}
      />
      
      {headPosition && (
        <mesh 
          ref={headRef} 
          position={headPosition}
          onClick={handleClick}
          onPointerEnter={() => interceptMode && setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <coneGeometry args={[0.04, 0.08, 8]} />
          <meshStandardMaterial 
            color={hovered && interceptMode ? '#00ff00' : color} 
            emissive={hovered && interceptMode ? '#00ff00' : color} 
            emissiveIntensity={hovered ? 2 : 1.5} 
          />
        </mesh>
      )}

      {hovered && interceptMode && headPosition && (
        <Html position={headPosition} distanceFactor={8}>
          <div className="bg-emerald-900/95 px-2 py-1 rounded text-[10px] font-mono text-emerald-400 whitespace-nowrap border border-emerald-500 shadow-lg cursor-pointer animate-pulse">
            <div className="flex items-center gap-1">
              <Crosshair className="w-3 h-3" />
              <span>CLICK TO INTERCEPT</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// Interception explosion effect
const InterceptionEffect = ({ position, onComplete }: { position: THREE.Vector3; onComplete: () => void }) => {
  const ref = useRef<THREE.Mesh>(null);
  const [scale, setScale] = useState(0.1);

  useFrame(() => {
    if (ref.current) {
      setScale(prev => {
        const next = prev + 0.05;
        if (next > 1.5) {
          onComplete();
          return prev;
        }
        ref.current!.scale.setScalar(next);
        const mat = ref.current!.material as THREE.MeshBasicMaterial;
        mat.opacity = 1 - (next / 1.5);
        return next;
      });
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshBasicMaterial color="#00ff00" transparent opacity={1} />
    </mesh>
  );
};

const ImpactZone = ({ lat, lng, threatCount }: { lat: number; lng: number; threatCount: number }) => {
  const position = latLngToVector3(lat, lng, 2.01);
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (ringRef.current) {
      const scale = 1 + (time % 2) * 0.5;
      ringRef.current.scale.setScalar(scale);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.5 - (time % 2) * 0.25);
    }
    if (ring2Ref.current) {
      const scale = 1 + ((time + 1) % 2) * 0.5;
      ring2Ref.current.scale.setScalar(scale);
      const mat = ring2Ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.5 - ((time + 1) % 2) * 0.25);
    }
  });

  return (
    <group position={position}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.1, 32]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.1, 32]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const GlobeLoader = () => (
  <mesh>
    <sphereGeometry args={[2, 32, 32]} />
    <meshBasicMaterial color="#0a1628" wireframe />
  </mesh>
);

const Globe3D: React.FC<Globe3DProps> = ({ active = true, userLocation, className }) => {
  const defaultLocation = { lat: 9.0192, lng: 38.7525 };
  const currentLocation = userLocation || defaultLocation;
  
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [selectedAttack, setSelectedAttack] = useState<Attack | null>(null);
  const [interceptMode, setInterceptMode] = useState(false);
  const [interceptionEffects, setInterceptionEffects] = useState<{ id: string; position: THREE.Vector3 }[]>([]);
  const [interceptedCount, setInterceptedCount] = useState(0);

  // Shared threat state for radar sync
  const { setThreats, neutralizeThreat } = useThreatState();

  // Initialize attacks
  useEffect(() => {
    const attackSources: Omit<Attack, 'progress' | 'distance' | 'neutralized'>[] = [
      { id: 'atk-1', originLat: 55.7558, originLng: 37.6173, originName: 'Moscow', originCountry: 'RUSSIA', type: 'missile', threatLevel: 'critical', velocity: 5500, altitude: 35000, eta: 1200 },
      { id: 'atk-2', originLat: 39.9042, originLng: 116.4074, originName: 'Beijing', originCountry: 'CHINA', type: 'drone', threatLevel: 'high', velocity: 450, altitude: 8000, eta: 4800 },
      { id: 'atk-3', originLat: 35.6762, originLng: 51.4241, originName: 'Tehran', originCountry: 'IRAN', type: 'missile', threatLevel: 'critical', velocity: 3200, altitude: 25000, eta: 900 },
      { id: 'atk-4', originLat: 39.0392, originLng: 125.7625, originName: 'Pyongyang', originCountry: 'N.KOREA', type: 'missile', threatLevel: 'high', velocity: 4800, altitude: 40000, eta: 2100 },
      { id: 'atk-5', originLat: 24.7136, originLng: 46.6753, originName: 'Riyadh', originCountry: 'SAUDI', type: 'aircraft', threatLevel: 'medium', velocity: 850, altitude: 12000, eta: 1800 },
      { id: 'atk-6', originLat: 33.8688, originLng: 35.5018, originName: 'Beirut', originCountry: 'LEBANON', type: 'drone', threatLevel: 'medium', velocity: 280, altitude: 3000, eta: 2400 },
      { id: 'atk-7', originLat: 15.3694, originLng: 44.1910, originName: 'Sanaa', originCountry: 'YEMEN', type: 'artillery', threatLevel: 'high', velocity: 1200, altitude: 15000, eta: 600 },
      { id: 'atk-8', originLat: 2.0469, originLng: 45.3182, originName: 'Mogadishu', originCountry: 'SOMALIA', type: 'drone', threatLevel: 'low', velocity: 180, altitude: 2000, eta: 1500 }
    ];

    const initialAttacks: Attack[] = attackSources.map(src => ({
      ...src,
      progress: Math.random() * 0.3 + 0.1,
      distance: haversineDistance(src.originLat, src.originLng, currentLocation.lat, currentLocation.lng),
      neutralized: false
    }));

    setAttacks(initialAttacks);
  }, [currentLocation.lat, currentLocation.lng]);

  // Sync attacks to shared state for radar
  useEffect(() => {
    const sharedThreats: SharedThreat[] = attacks.map(attack => ({
      ...attack,
      neutralized: attack.neutralized || false,
      angle: calculateAngleFromTarget(attack.originLat, attack.originLng, currentLocation.lat, currentLocation.lng)
    }));
    setThreats(sharedThreats);
  }, [attacks, currentLocation, setThreats]);

  // Audio context
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastAlertTimeRef = useRef<number>(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [proximityAlertActive, setProximityAlertActive] = useState(false);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => { audioContextRef.current?.close(); };
  }, []);

  const playProximityAlert = useCallback((threatLevel: 'critical' | 'high' | 'medium' | 'low') => {
    if (!audioEnabled || !audioContextRef.current) return;
    const now = Date.now();
    if (now - lastAlertTimeRef.current < 2000) return;
    lastAlertTimeRef.current = now;
    
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const frequencies = { critical: 880, high: 660, medium: 440, low: 330 };
    
    oscillator.frequency.setValueAtTime(frequencies[threatLevel], ctx.currentTime);
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
    
    setProximityAlertActive(true);
    setTimeout(() => setProximityAlertActive(false), 500);
  }, [audioEnabled]);

  // Play interception sound
  const playInterceptSound = useCallback(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }, []);

  useEffect(() => {
    attacks.filter(a => !a.neutralized).forEach(attack => {
      if (attack.distance < 500 && attack.threatLevel === 'critical') {
        playProximityAlert('critical');
      } else if (attack.distance < 1000 && (attack.threatLevel === 'critical' || attack.threatLevel === 'high')) {
        playProximityAlert(attack.threatLevel);
      }
    });
  }, [attacks, playProximityAlert]);

  // Handle interception
  const handleIntercept = useCallback((attackId: string) => {
    const attack = attacks.find(a => a.id === attackId);
    if (!attack || attack.neutralized) return;

    // Calculate position for effect
    const arcPoints = getArcPoints(
      attack.originLat, attack.originLng,
      currentLocation.lat, currentLocation.lng,
      2, 60, attack.progress, 0.4
    );
    const position = arcPoints[arcPoints.length - 1] || new THREE.Vector3();

    // Add explosion effect
    setInterceptionEffects(prev => [...prev, { id: attackId, position }]);

    // Play sound
    playInterceptSound();

    // Neutralize attack
    setAttacks(prev => prev.map(a => 
      a.id === attackId ? { ...a, neutralized: true } : a
    ));
    neutralizeThreat(attackId);
    setInterceptedCount(prev => prev + 1);
  }, [attacks, currentLocation, playInterceptSound, neutralizeThreat]);

  const removeInterceptionEffect = useCallback((id: string) => {
    setInterceptionEffects(prev => prev.filter(e => e.id !== id));
  }, []);

  // Animate attacks
  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setAttacks(prev => prev.map(attack => {
        if (attack.neutralized) return attack;
        
        let newProgress = attack.progress + 0.003 + (attack.velocity / 100000);
        if (newProgress >= 1) newProgress = 0.05;
        
        const totalDistance = haversineDistance(attack.originLat, attack.originLng, currentLocation.lat, currentLocation.lng);
        const remainingDistance = totalDistance * (1 - newProgress);
        
        return {
          ...attack,
          progress: newProgress,
          distance: remainingDistance,
          eta: Math.round(remainingDistance / (attack.velocity / 3600))
        };
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [active, currentLocation]);

  const threatCounts = useMemo(() => {
    const active = attacks.filter(a => !a.neutralized);
    return {
      critical: active.filter(a => a.threatLevel === 'critical').length,
      high: active.filter(a => a.threatLevel === 'high').length,
      medium: active.filter(a => a.threatLevel === 'medium').length,
      low: active.filter(a => a.threatLevel === 'low').length,
      total: active.length
    };
  }, [attacks]);

  return (
    <div className={`relative w-full h-full min-h-[350px] ${className}`}>
      <Canvas camera={{ position: [0, 2, 5], fov: 45 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#ff4444" />
        <pointLight position={[10, 0, 0]} intensity={0.5} color="#ffffff" />

        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />

        <React.Suspense fallback={<GlobeLoader />}>
          <Earth userLocation={currentLocation} />
        </React.Suspense>

        <ImpactZone lat={currentLocation.lat} lng={currentLocation.lng} threatCount={attacks.length} />

        {attacks.map(attack => (
          <React.Fragment key={attack.id}>
            <AttackOriginMarker attack={attack} />
            <AttackArc 
              attack={attack} 
              targetLat={currentLocation.lat} 
              targetLng={currentLocation.lng}
              onIntercept={handleIntercept}
              interceptMode={interceptMode}
            />
          </React.Fragment>
        ))}

        {interceptionEffects.map(effect => (
          <InterceptionEffect 
            key={effect.id} 
            position={effect.position} 
            onComplete={() => removeInterceptionEffect(effect.id)} 
          />
        ))}

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3}
          maxDistance={12}
          autoRotate={!selectedAttack && !interceptMode}
          autoRotateSpeed={0.3}
        />
      </Canvas>

      {/* Defense Interception Control */}
      <div className="absolute top-2 right-[200px] z-20">
        <button
          onClick={() => setInterceptMode(!interceptMode)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-[11px] transition-all ${
            interceptMode 
              ? 'bg-emerald-500/30 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/30 animate-pulse' 
              : 'bg-black/80 border-border text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-400'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>{interceptMode ? 'INTERCEPT MODE ACTIVE' : 'ENABLE INTERCEPT'}</span>
          {interceptMode && <Zap className="w-3 h-3" />}
        </button>
      </div>

      {/* Intercept Stats */}
      <div className="absolute top-14 right-[200px] bg-black/80 backdrop-blur rounded-lg border border-emerald-500/30 px-3 py-2 z-20">
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-emerald-400" />
            <span className="text-muted-foreground">NEUTRALIZED:</span>
            <span className="text-emerald-400 font-bold">{interceptedCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">ACTIVE:</span>
            <span className="text-red-400 font-bold">{threatCounts.total}</span>
          </div>
        </div>
      </div>

      {/* Threat Level HUD */}
      <div className={`absolute top-2 left-2 bg-black/85 backdrop-blur rounded-lg border p-2 shadow-lg transition-all ${proximityAlertActive ? 'border-red-500 shadow-red-500/50 animate-pulse' : 'border-red-500/30 shadow-red-500/10'}`}>
        <div className="text-[10px] font-display text-red-400 mb-2 flex items-center gap-1.5">
          <span className={`w-2 h-2 bg-red-500 rounded-full ${proximityAlertActive ? 'animate-ping' : 'animate-pulse'}`} />
          INCOMING THREATS
          {proximityAlertActive && <span className="ml-1 text-red-500 font-bold animate-pulse">⚠ PROXIMITY</span>}
        </div>
        <div className="space-y-1 text-[9px] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            <span className="text-muted-foreground w-16">CRITICAL:</span>
            <span className="text-red-500 font-bold">{threatCounts.critical}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-400 rounded-full" />
            <span className="text-muted-foreground w-16">HIGH:</span>
            <span className="text-red-400">{threatCounts.high}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full" />
            <span className="text-muted-foreground w-16">MEDIUM:</span>
            <span className="text-orange-500">{threatCounts.medium}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span className="text-muted-foreground w-16">LOW:</span>
            <span className="text-yellow-500">{threatCounts.low}</span>
          </div>
        </div>
        <button 
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`mt-2 text-[8px] font-mono px-2 py-0.5 rounded border transition-colors ${audioEnabled ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-red-500/50 text-red-400 bg-red-500/10'}`}
        >
          {audioEnabled ? '🔊 AUDIO ON' : '🔇 AUDIO OFF'}
        </button>
      </div>

      {/* Active Threats Panel */}
      <div className="absolute top-2 right-2 bg-black/85 backdrop-blur rounded-lg border border-border p-2 max-h-[200px] overflow-y-auto w-[180px]">
        <div className="text-[10px] font-display text-primary mb-2">ACTIVE THREATS</div>
        <div className="space-y-1.5">
          {attacks.filter(a => !a.neutralized).slice(0, 5).map(attack => (
            <div 
              key={attack.id}
              className={`text-[8px] font-mono p-1.5 rounded border cursor-pointer transition-colors ${
                interceptMode 
                  ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20' 
                  : 'bg-card/50 border-border/50 hover:bg-card/80'
              }`}
              onClick={() => interceptMode ? handleIntercept(attack.id) : setSelectedAttack(attack)}
            >
              <div className="flex items-center justify-between">
                <span 
                  className="font-bold"
                  style={{ color: attack.threatLevel === 'critical' ? '#ff0000' : attack.threatLevel === 'high' ? '#ff4444' : '#ff8800' }}
                >
                  {attack.originCountry}
                </span>
                <span className="text-muted-foreground">{attack.type.toUpperCase()}</span>
              </div>
              <div className="flex justify-between mt-0.5 text-muted-foreground">
                <span>DST: {Math.round(attack.distance)}km</span>
                <span>ETA: {Math.round(attack.eta)}s</span>
              </div>
              {interceptMode && (
                <div className="mt-1 text-emerald-400 text-center text-[7px] font-bold">CLICK TO INTERCEPT</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* User Location Info */}
      <div className="absolute bottom-2 left-2 bg-black/85 backdrop-blur rounded-lg border border-emerald-500/30 p-2">
        <div className="text-[10px] font-display text-emerald-400 mb-1">DEFENSE POSITION</div>
        <div className="text-[9px] font-mono text-muted-foreground">
          <div>LAT: {currentLocation.lat.toFixed(4)}°</div>
          <div>LNG: {currentLocation.lng.toFixed(4)}°</div>
          <div className="text-emerald-400 mt-1">ETHIOPIA • ADDIS ABABA</div>
        </div>
      </div>

      {/* Status */}
      <div className="absolute bottom-2 right-2 flex items-center gap-2 text-[9px] font-mono bg-black/70 px-2 py-1 rounded">
        <span className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-muted-foreground">{active ? 'TRACKING ACTIVE' : 'OFFLINE'}</span>
      </div>

      {/* Selected Attack Detail */}
      {selectedAttack && !interceptMode && (
        <div className="absolute bottom-14 right-2 bg-black/90 backdrop-blur rounded-lg border border-red-500/50 p-3 w-[200px]">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[11px] font-display text-red-400">THREAT DETAIL</div>
            <button onClick={() => setSelectedAttack(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
          </div>
          <div className="space-y-1 text-[9px] font-mono">
            <div className="flex justify-between"><span className="text-muted-foreground">ORIGIN:</span><span className="text-red-400">{selectedAttack.originName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">TYPE:</span><span>{selectedAttack.type.toUpperCase()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">VELOCITY:</span><span>{selectedAttack.velocity} km/h</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">ALTITUDE:</span><span>{selectedAttack.altitude.toLocaleString()}m</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">DISTANCE:</span><span>{Math.round(selectedAttack.distance).toLocaleString()} km</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">ETA:</span><span className="text-red-400">{Math.round(selectedAttack.eta)}s</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Globe3D;
