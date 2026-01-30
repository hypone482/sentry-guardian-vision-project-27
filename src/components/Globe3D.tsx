import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import earthTexture from '@/assets/earth-texture.jpg';
import earthNormal from '@/assets/earth-normal.jpg';
import earthSpecular from '@/assets/earth-specular.jpg';
import earthClouds from '@/assets/earth-clouds.png';

interface Attack {
  id: string;
  originLat: number;
  originLng: number;
  originName: string;
  originCountry: string;
  type: 'missile' | 'drone' | 'aircraft' | 'cyber' | 'artillery';
  threatLevel: 'critical' | 'high' | 'medium' | 'low';
  velocity: number; // km/h
  altitude: number; // meters
  eta: number; // seconds
  progress: number; // 0-1 animation progress
  distance: number; // km from target
}

interface Target {
  id: string;
  lat: number;
  lng: number;
  altitude: number;
  type: 'hostile' | 'friendly' | 'unknown';
  label: string;
  trajectory?: { lat: number; lng: number; altitude: number }[];
  predictedPath?: { lat: number; lng: number; altitude: number }[];
  velocity?: number;
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

// Calculate great circle arc points between two lat/lng coordinates
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
    
    // Spherical interpolation
    const lat = startLat + (endLat - startLat) * t;
    const lng = startLng + (endLng - startLng) * t;
    
    // Add arc height (parabolic curve for missile trajectory)
    const heightMultiplier = Math.sin(t * Math.PI) * arcHeight;
    const currentRadius = radius + heightMultiplier;
    
    points.push(latLngToVector3(lat, lng, currentRadius));
  }
  
  return points;
};

// Calculate distance between two lat/lng points in km
const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Realistic Earth with NASA textures
const Earth = ({ userLocation }: { userLocation: { lat: number; lng: number } }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  // Load NASA textures
  const [colorMap, normalMap, specularMap, cloudsMap] = useLoader(TextureLoader, [
    earthTexture,
    earthNormal,
    earthSpecular,
    earthClouds
  ]);

  // Create grid lines for latitude/longitude overlay
  const gridGeometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(2.015, 72, 36);
    return new THREE.WireframeGeometry(geo);
  }, []);

  useFrame((state) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.0003;
    }
  });

  // Create latitude lines
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

  // Create longitude lines
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
      {/* Main Earth with NASA texture */}
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

      {/* Tactical grid overlay */}
      <lineSegments geometry={gridGeometry}>
        <lineBasicMaterial color="#22c55e" transparent opacity={0.08} />
      </lineSegments>

      {/* Latitude lines */}
      {latitudeLines.map((points, i) => (
        <Line key={`lat-${i}`} points={points} color="#22c55e" lineWidth={0.5} transparent opacity={0.15} />
      ))}

      {/* Longitude lines */}
      {longitudeLines.map((points, i) => (
        <Line key={`lng-${i}`} points={points} color="#22c55e" lineWidth={0.5} transparent opacity={0.15} />
      ))}

      {/* Cloud layer with real texture */}
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

      {/* Atmosphere glow - blue haze */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[2.08, 64, 64]} />
        <meshBasicMaterial
          color="#4da6ff"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Outer glow - blue ring */}
      <mesh>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshBasicMaterial
          color="#1e90ff"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Equator highlight */}
      <Line 
        points={Array.from({ length: 121 }, (_, i) => latLngToVector3(0, i * 3 - 180, 2.02))} 
        color="#ffcc00" 
        lineWidth={1} 
        transparent 
        opacity={0.3} 
      />

      {/* User location marker */}
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
      {/* Defense shield effect */}
      <mesh ref={outerPulseRef}>
        <ringGeometry args={[0.12, 0.15, 32]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Main marker */}
      <mesh>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1} />
      </mesh>
      
      {/* Pulse ring */}
      <mesh ref={pulseRef}>
        <ringGeometry args={[0.07, 0.09, 32]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Vertical beam */}
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

// Attack origin marker
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
  
  const color = threatColors[attack.threatLevel];

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.03;
      const scale = 0.8 + Math.sin(state.clock.elapsedTime * 5) * 0.2;
      ref.current.scale.setScalar(scale);
    }
  });

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

// Attack trajectory arc with prediction lines
const AttackArc = ({ attack, targetLat, targetLng, showPrediction = true }: { attack: Attack; targetLat: number; targetLng: number; showPrediction?: boolean }) => {
  const headRef = useRef<THREE.Mesh>(null);
  
  const threatColors = {
    critical: '#ff0000',
    high: '#ff4444',
    medium: '#ff8800',
    low: '#ffcc00'
  };
  
  const color = threatColors[attack.threatLevel];
  
  // Get arc points for the current trajectory
  const arcPoints = useMemo(() => {
    return getArcPoints(
      attack.originLat, attack.originLng,
      targetLat, targetLng,
      2,
      60,
      attack.progress,
      0.4 + (attack.altitude / 50000) * 0.3
    );
  }, [attack, targetLat, targetLng]);

  // Get FULL trajectory prediction path (from current position to target)
  const predictionPoints = useMemo(() => {
    return getArcPoints(
      attack.originLat, attack.originLng,
      targetLat, targetLng,
      2,
      60,
      1, // Full path to target
      0.4 + (attack.altitude / 50000) * 0.3
    );
  }, [attack.originLat, attack.originLng, attack.altitude, targetLat, targetLng]);

  // Calculate future prediction points (from current position forward)
  const futurePoints = useMemo(() => {
    const currentIndex = Math.floor(predictionPoints.length * attack.progress);
    return predictionPoints.slice(currentIndex);
  }, [predictionPoints, attack.progress]);

  // Missile head position
  const headPosition = arcPoints.length > 0 ? arcPoints[arcPoints.length - 1] : null;

  useFrame((state) => {
    if (headRef.current && headPosition) {
      headRef.current.rotation.y += 0.1;
      const scale = 0.8 + Math.sin(state.clock.elapsedTime * 10) * 0.3;
      headRef.current.scale.setScalar(scale);
    }
  });

  if (arcPoints.length < 2) return null;

  return (
    <group>
      {/* Prediction/future trajectory line (dashed effect via lower opacity) */}
      {showPrediction && futurePoints.length > 1 && (
        <>
          <Line 
            points={futurePoints} 
            color={color} 
            lineWidth={1} 
            transparent 
            opacity={0.25}
            dashed
            dashSize={0.05}
            gapSize={0.03}
          />
          {/* Impact prediction marker at target */}
          <mesh position={predictionPoints[predictionPoints.length - 1]}>
            <ringGeometry args={[0.02, 0.03, 16]} />
            <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
      
      {/* Main trajectory arc (traveled path) */}
      <Line 
        points={arcPoints} 
        color={color} 
        lineWidth={2} 
        transparent 
        opacity={0.8}
      />
      
      {/* Glowing trail effect */}
      <Line 
        points={arcPoints} 
        color={color} 
        lineWidth={4} 
        transparent 
        opacity={0.3}
      />
      
      {/* Missile/threat head */}
      {headPosition && (
        <mesh ref={headRef} position={headPosition}>
          <coneGeometry args={[0.03, 0.06, 8]} />
          <meshStandardMaterial 
            color={color} 
            emissive={color} 
            emissiveIntensity={1.5} 
          />
        </mesh>
      )}
    </group>
  );
};

// Impact zone indicator
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

// Loading component for texture loading
const GlobeLoader = () => (
  <mesh>
    <sphereGeometry args={[2, 32, 32]} />
    <meshBasicMaterial color="#0a1628" wireframe />
  </mesh>
);

const Globe3D: React.FC<Globe3DProps> = ({ active = true, userLocation, className }) => {
  // Default to Ethiopia if no GPS location
  const defaultLocation = { lat: 9.0192, lng: 38.7525 }; // Addis Ababa, Ethiopia
  const currentLocation = userLocation || defaultLocation;
  
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [selectedAttack, setSelectedAttack] = useState<Attack | null>(null);
  const [showPrediction, setShowPrediction] = useState(true);
  const [showMissionBriefing, setShowMissionBriefing] = useState(true);

  // Initialize attacks from various global locations
  useEffect(() => {
    const attackSources: Omit<Attack, 'progress' | 'distance'>[] = [
      {
        id: 'atk-1',
        originLat: 55.7558,
        originLng: 37.6173,
        originName: 'Moscow',
        originCountry: 'RUSSIA',
        type: 'missile',
        threatLevel: 'critical',
        velocity: 5500,
        altitude: 35000,
        eta: 1200
      },
      {
        id: 'atk-2',
        originLat: 39.9042,
        originLng: 116.4074,
        originName: 'Beijing',
        originCountry: 'CHINA',
        type: 'drone',
        threatLevel: 'high',
        velocity: 450,
        altitude: 8000,
        eta: 4800
      },
      {
        id: 'atk-3',
        originLat: 35.6762,
        originLng: 51.4241,
        originName: 'Tehran',
        originCountry: 'IRAN',
        type: 'missile',
        threatLevel: 'critical',
        velocity: 3200,
        altitude: 25000,
        eta: 900
      },
      {
        id: 'atk-4',
        originLat: 39.0392,
        originLng: 125.7625,
        originName: 'Pyongyang',
        originCountry: 'N.KOREA',
        type: 'missile',
        threatLevel: 'high',
        velocity: 4800,
        altitude: 40000,
        eta: 2100
      },
      {
        id: 'atk-5',
        originLat: 24.7136,
        originLng: 46.6753,
        originName: 'Riyadh',
        originCountry: 'SAUDI',
        type: 'aircraft',
        threatLevel: 'medium',
        velocity: 850,
        altitude: 12000,
        eta: 1800
      },
      {
        id: 'atk-6',
        originLat: 33.8688,
        originLng: 35.5018,
        originName: 'Beirut',
        originCountry: 'LEBANON',
        type: 'drone',
        threatLevel: 'medium',
        velocity: 280,
        altitude: 3000,
        eta: 2400
      },
      {
        id: 'atk-7',
        originLat: 15.3694,
        originLng: 44.1910,
        originName: 'Sanaa',
        originCountry: 'YEMEN',
        type: 'artillery',
        threatLevel: 'high',
        velocity: 1200,
        altitude: 15000,
        eta: 600
      },
      {
        id: 'atk-8',
        originLat: 2.0469,
        originLng: 45.3182,
        originName: 'Mogadishu',
        originCountry: 'SOMALIA',
        type: 'drone',
        threatLevel: 'low',
        velocity: 180,
        altitude: 2000,
        eta: 1500
      }
    ];

    const initialAttacks: Attack[] = attackSources.map(src => ({
      ...src,
      progress: Math.random() * 0.3 + 0.1, // Random initial progress
      distance: haversineDistance(src.originLat, src.originLng, currentLocation.lat, currentLocation.lng)
    }));

    setAttacks(initialAttacks);
  }, [currentLocation.lat, currentLocation.lng]);

  // Audio context for proximity alerts
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastAlertTimeRef = useRef<number>(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [proximityAlertActive, setProximityAlertActive] = useState(false);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Play proximity alert sound
  const playProximityAlert = useCallback((threatLevel: 'critical' | 'high' | 'medium' | 'low') => {
    if (!audioEnabled || !audioContextRef.current) return;
    
    const now = Date.now();
    if (now - lastAlertTimeRef.current < 2000) return; // 2 second cooldown
    lastAlertTimeRef.current = now;
    
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Create oscillator for alert sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Different frequencies for different threat levels
    const frequencies = {
      critical: 880, // High A - urgent
      high: 660,     // High E
      medium: 440,   // A4
      low: 330       // E4
    };
    
    oscillator.frequency.setValueAtTime(frequencies[threatLevel], ctx.currentTime);
    oscillator.type = 'square';
    
    // Pulse pattern for alert
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.35);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
    
    setProximityAlertActive(true);
    setTimeout(() => setProximityAlertActive(false), 500);
  }, [audioEnabled]);

  // Check for proximity threats
  useEffect(() => {
    const proximityThreshold = 1000; // 1000km proximity alert
    const criticalThreshold = 500;   // 500km critical alert
    
    attacks.forEach(attack => {
      if (attack.distance < criticalThreshold && attack.threatLevel === 'critical') {
        playProximityAlert('critical');
      } else if (attack.distance < proximityThreshold && (attack.threatLevel === 'critical' || attack.threatLevel === 'high')) {
        playProximityAlert(attack.threatLevel);
      }
    });
  }, [attacks, playProximityAlert]);

  // Animate attack progress
  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setAttacks(prev => prev.map(attack => {
        let newProgress = attack.progress + 0.003 + (attack.velocity / 100000);
        
        // Reset when reaching target
        if (newProgress >= 1) {
          newProgress = 0.05;
        }
        
        // Update distance based on progress
        const totalDistance = haversineDistance(
          attack.originLat, attack.originLng,
          currentLocation.lat, currentLocation.lng
        );
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

  const threatCounts = useMemo(() => ({
    critical: attacks.filter(a => a.threatLevel === 'critical').length,
    high: attacks.filter(a => a.threatLevel === 'high').length,
    medium: attacks.filter(a => a.threatLevel === 'medium').length,
    low: attacks.filter(a => a.threatLevel === 'low').length
  }), [attacks]);

  return (
    <div className={`relative w-full h-full min-h-[350px] ${className}`}>
      <Canvas 
        camera={{ position: [0, 2, 5], fov: 45 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#ff4444" />
        <pointLight position={[10, 0, 0]} intensity={0.5} color="#ffffff" />

        <Stars 
          radius={100} 
          depth={50} 
          count={3000} 
          factor={4} 
          saturation={0} 
          fade 
          speed={0.5} 
        />

        <React.Suspense fallback={<GlobeLoader />}>
          <Earth userLocation={currentLocation} />
        </React.Suspense>

        {/* Impact zone at user location */}
        <ImpactZone 
          lat={currentLocation.lat} 
          lng={currentLocation.lng} 
          threatCount={attacks.length} 
        />

        {/* Render all attack arcs and origin markers */}
        {attacks.map(attack => (
          <React.Fragment key={attack.id}>
            <AttackOriginMarker attack={attack} />
            <AttackArc 
              attack={attack} 
              targetLat={currentLocation.lat} 
              targetLng={currentLocation.lng}
              showPrediction={showPrediction}
            />
          </React.Fragment>
        ))}

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3}
          maxDistance={12}
          autoRotate={!selectedAttack}
          autoRotateSpeed={0.3}
        />
      </Canvas>

      {/* Threat Level HUD */}
      <div className={`absolute top-2 left-2 bg-black/85 backdrop-blur rounded-lg border p-2 shadow-lg transition-all ${proximityAlertActive ? 'border-red-500 shadow-red-500/50 animate-pulse' : 'border-red-500/30 shadow-red-500/10'}`}>
        <div className="text-[10px] font-display text-red-400 mb-2 flex items-center gap-1.5">
          <span className={`w-2 h-2 bg-red-500 rounded-full ${proximityAlertActive ? 'animate-ping' : 'animate-pulse'}`} />
          INCOMING THREATS
          {proximityAlertActive && (
            <span className="ml-1 text-red-500 font-bold animate-pulse">⚠ PROXIMITY</span>
          )}
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
        {/* Audio toggle */}
        <div className="flex gap-1 mt-2">
          <button 
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`text-[8px] font-mono px-2 py-0.5 rounded border transition-colors ${audioEnabled ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-red-500/50 text-red-400 bg-red-500/10'}`}
          >
            {audioEnabled ? '🔊' : '🔇'}
          </button>
          <button 
            onClick={() => setShowPrediction(!showPrediction)}
            className={`text-[8px] font-mono px-2 py-0.5 rounded border transition-colors ${showPrediction ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10' : 'border-muted text-muted-foreground bg-muted/10'}`}
          >
            {showPrediction ? '📍 PRED' : '📍 OFF'}
          </button>
        </div>
      </div>

      {/* Active Threats Panel */}
      <div className="absolute top-2 right-2 bg-black/85 backdrop-blur rounded-lg border border-border p-2 max-h-[200px] overflow-y-auto w-[180px]">
        <div className="text-[10px] font-display text-primary mb-2">ACTIVE THREATS</div>
        <div className="space-y-1.5">
          {attacks.slice(0, 5).map(attack => (
            <div 
              key={attack.id}
              className="text-[8px] font-mono p-1.5 rounded bg-card/50 border border-border/50 cursor-pointer hover:bg-card/80 transition-colors"
              onClick={() => setSelectedAttack(attack)}
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
              <div className="w-full bg-muted/30 h-1 rounded mt-1">
                <div 
                  className="h-full rounded transition-all"
                  style={{ 
                    width: `${attack.progress * 100}%`,
                    backgroundColor: attack.threatLevel === 'critical' ? '#ff0000' : attack.threatLevel === 'high' ? '#ff4444' : '#ff8800'
                  }}
                />
              </div>
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

      {/* Mission Briefing Panel */}
      {showMissionBriefing && (
        <div className="absolute top-[220px] right-2 bg-black/90 backdrop-blur rounded-lg border border-cyan-500/40 p-2 w-[180px] shadow-lg shadow-cyan-500/10">
          <div className="flex justify-between items-center mb-2">
            <div className="text-[10px] font-display text-cyan-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              MISSION BRIEFING
            </div>
            <button 
              onClick={() => setShowMissionBriefing(false)}
              className="text-muted-foreground hover:text-foreground text-[10px]"
            >
              ✕
            </button>
          </div>
          
          {/* Threat Analysis */}
          <div className="mb-2">
            <div className="text-[8px] text-muted-foreground uppercase mb-1">THREAT ANALYSIS</div>
            <div className="text-[9px] font-mono space-y-0.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Inbound:</span>
                <span className="text-red-400 font-bold">{attacks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Velocity:</span>
                <span>{Math.round(attacks.reduce((a, b) => a + b.velocity, 0) / attacks.length)} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nearest ETA:</span>
                <span className="text-red-400">{Math.round(Math.min(...attacks.map(a => a.eta)))}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Closest Threat:</span>
                <span className="text-orange-400">{Math.round(Math.min(...attacks.map(a => a.distance)))} km</span>
              </div>
            </div>
          </div>

          {/* Defense Priorities */}
          <div className="mb-2">
            <div className="text-[8px] text-muted-foreground uppercase mb-1">DEFENSE PRIORITIES</div>
            <div className="space-y-1">
              {attacks
                .sort((a, b) => {
                  // Priority: critical first, then by ETA
                  const levelOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                  if (levelOrder[a.threatLevel] !== levelOrder[b.threatLevel]) {
                    return levelOrder[a.threatLevel] - levelOrder[b.threatLevel];
                  }
                  return a.eta - b.eta;
                })
                .slice(0, 3)
                .map((attack, i) => (
                  <div 
                    key={attack.id}
                    className="text-[8px] font-mono flex items-center gap-1 p-1 rounded bg-card/30 border border-border/30"
                  >
                    <span className={`font-bold ${i === 0 ? 'text-red-500' : i === 1 ? 'text-orange-400' : 'text-yellow-400'}`}>
                      P{i + 1}
                    </span>
                    <span className="text-muted-foreground">{attack.originCountry}</span>
                    <span className="ml-auto text-cyan-400">{attack.type}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Recommended Action */}
          <div>
            <div className="text-[8px] text-muted-foreground uppercase mb-1">RECOMMENDED ACTION</div>
            <div className="text-[9px] font-mono p-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-300">
              {threatCounts.critical > 0 
                ? '⚠ ENGAGE CRITICAL THREATS - Activate all defense systems'
                : threatCounts.high > 1
                ? '🎯 PRIORITIZE HIGH THREATS - Deploy interceptors'
                : '📡 MONITOR & TRACK - Maintain surveillance'}
            </div>
          </div>
        </div>
      )}

      {/* Mission Briefing Toggle (when closed) */}
      {!showMissionBriefing && (
        <button
          onClick={() => setShowMissionBriefing(true)}
          className="absolute top-[220px] right-2 bg-black/80 backdrop-blur rounded border border-cyan-500/40 px-2 py-1 text-[9px] font-mono text-cyan-400 hover:bg-cyan-500/10 transition-colors"
        >
          📋 BRIEFING
        </button>
      )}

      {/* Selected Attack Detail */}
      {selectedAttack && (
        <div className="absolute bottom-14 right-2 bg-black/90 backdrop-blur rounded-lg border border-red-500/50 p-3 w-[200px]">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[11px] font-display text-red-400">THREAT DETAIL</div>
            <button 
              onClick={() => setSelectedAttack(null)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 text-[9px] font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ORIGIN:</span>
              <span className="text-red-400">{selectedAttack.originName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">TYPE:</span>
              <span>{selectedAttack.type.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VELOCITY:</span>
              <span>{selectedAttack.velocity} km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ALTITUDE:</span>
              <span>{selectedAttack.altitude.toLocaleString()}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DISTANCE:</span>
              <span>{Math.round(selectedAttack.distance).toLocaleString()} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ETA:</span>
              <span className="text-red-400">{Math.round(selectedAttack.eta)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">THREAT:</span>
              <span 
                className="font-bold uppercase"
                style={{ color: selectedAttack.threatLevel === 'critical' ? '#ff0000' : '#ff4444' }}
              >
                {selectedAttack.threatLevel}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Globe3D;