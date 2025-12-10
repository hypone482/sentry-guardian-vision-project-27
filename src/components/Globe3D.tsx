import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line } from '@react-three/drei';
import * as THREE from 'three';

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

// Real Earth with texture
const Earth = ({ userLocation }: { userLocation?: { lat: number; lng: number } | null }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  // Create procedural earth colors
  const earthMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      color: '#1a4d2e',
      emissive: '#0a1f12',
      emissiveIntensity: 0.1,
      shininess: 25,
    });
  }, []);

  // Create grid lines for continents effect
  const gridGeometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(2.01, 72, 36);
    return new THREE.WireframeGeometry(geo);
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0008;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group>
      {/* Ocean base */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 32]} />
        <meshPhongMaterial
          color="#0c2d48"
          emissive="#051a2e"
          emissiveIntensity={0.2}
          shininess={50}
        />
      </mesh>

      {/* Land masses (simplified) */}
      <mesh rotation={[0, 0, 0]}>
        <sphereGeometry args={[2.005, 64, 32]} />
        <meshPhongMaterial
          color="#1a4d2e"
          transparent
          opacity={0.7}
          emissive="#0d2818"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Grid overlay */}
      <lineSegments geometry={gridGeometry}>
        <lineBasicMaterial color="#22c55e" transparent opacity={0.15} />
      </lineSegments>

      {/* Latitude lines */}
      {[-60, -30, 0, 30, 60].map((lat) => (
        <LatitudeLine key={lat} latitude={lat} />
      ))}

      {/* Longitude lines */}
      {[0, 30, 60, 90, 120, 150, 180, -30, -60, -90, -120, -150].map((lng) => (
        <LongitudeLine key={lng} longitude={lng} />
      ))}

      {/* Atmosphere */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.15, 64, 32]} />
        <meshStandardMaterial
          color="#3b82f6"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[2.3, 32, 16]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>

      {userLocation && <UserMarker lat={userLocation.lat} lng={userLocation.lng} />}
    </group>
  );
};

const LatitudeLine = ({ latitude }: { latitude: number }) => {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let lng = 0; lng <= 360; lng += 5) {
      pts.push(latLngToVector3(latitude, lng - 180, 2.02));
    }
    return pts;
  }, [latitude]);

  return (
    <Line points={points} color="#22c55e" lineWidth={0.5} transparent opacity={0.3} />
  );
};

const LongitudeLine = ({ longitude }: { longitude: number }) => {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let lat = -90; lat <= 90; lat += 5) {
      pts.push(latLngToVector3(lat, longitude, 2.02));
    }
    return pts;
  }, [longitude]);

  return (
    <Line points={points} color="#22c55e" lineWidth={0.5} transparent opacity={0.3} />
  );
};

const UserMarker = ({ lat, lng }: { lat: number; lng: number }) => {
  const position = latLngToVector3(lat, lng, 2.08);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (pulseRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
      pulseRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.8} />
      </mesh>
      <mesh ref={pulseRef}>
        <ringGeometry args={[0.06, 0.08, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <Html distanceFactor={8}>
        <div className="bg-card/90 px-1.5 py-0.5 rounded text-[9px] font-mono text-blue-400 whitespace-nowrap border border-blue-500/30">
          YOU
        </div>
      </Html>
    </group>
  );
};

const TargetMarker = ({ target }: { target: Target }) => {
  const position = latLngToVector3(target.lat, target.lng, 2 + target.altitude * 0.0003);
  const ref = useRef<THREE.Mesh>(null);
  const color = target.type === 'hostile' ? '#ef4444' : target.type === 'friendly' ? '#22c55e' : '#eab308';

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.02;
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.04]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      <Html distanceFactor={8}>
        <div
          className="bg-card/80 px-1 py-0.5 rounded text-[8px] font-mono whitespace-nowrap border"
          style={{ color, borderColor: color }}
        >
          {target.label}
        </div>
      </Html>
    </group>
  );
};

const TrajectoryLine = ({ target }: { target: Target }) => {
  const color = target.type === 'hostile' ? '#ef4444' : target.type === 'friendly' ? '#22c55e' : '#eab308';

  // Trail points
  const trailPoints = useMemo(() => {
    if (!target.trajectory) return [];
    return target.trajectory.map(p => latLngToVector3(p.lat, p.lng, 2 + p.altitude * 0.0003));
  }, [target.trajectory]);

  // Predicted path
  const predictedPoints = useMemo(() => {
    if (!target.predictedPath) return [];
    const current = latLngToVector3(target.lat, target.lng, 2 + target.altitude * 0.0003);
    return [current, ...target.predictedPath.map(p => latLngToVector3(p.lat, p.lng, 2 + p.altitude * 0.0003))];
  }, [target]);

  return (
    <group>
      {trailPoints.length > 1 && (
        <Line points={trailPoints} color={color} lineWidth={1.5} transparent opacity={0.5} dashed dashSize={0.05} gapSize={0.02} />
      )}
      {predictedPoints.length > 1 && (
        <Line points={predictedPoints} color={color} lineWidth={1} transparent opacity={0.3} dashed dashSize={0.08} gapSize={0.04} />
      )}
    </group>
  );
};

const Globe3D: React.FC<Globe3DProps> = ({ active = true, userLocation, className }) => {
  const [targets, setTargets] = useState<Target[]>([
    {
      id: '1', lat: 51.5074, lng: -0.1278, altitude: 8000, type: 'hostile', label: 'TGT-ALPHA', velocity: 450,
      trajectory: [
        { lat: 50.5, lng: -1.2, altitude: 7500 },
        { lat: 49.5, lng: -2.3, altitude: 7000 },
        { lat: 48.5, lng: -3.4, altitude: 6500 },
      ],
      predictedPath: [
        { lat: 52.5, lng: 0.8, altitude: 8500 },
        { lat: 53.5, lng: 1.9, altitude: 9000 },
        { lat: 54.5, lng: 3.0, altitude: 9500 },
      ]
    },
    {
      id: '2', lat: 35.6762, lng: 139.6503, altitude: 10000, type: 'friendly', label: 'ALLY-01', velocity: 380,
      trajectory: [
        { lat: 34.7, lng: 138.6, altitude: 9500 },
        { lat: 33.8, lng: 137.5, altitude: 9000 },
      ],
      predictedPath: [
        { lat: 36.6, lng: 140.7, altitude: 10500 },
        { lat: 37.5, lng: 141.8, altitude: 11000 },
      ]
    },
    {
      id: '3', lat: -33.8688, lng: 151.2093, altitude: 5000, type: 'unknown', label: 'UNK-03', velocity: 280,
      trajectory: [
        { lat: -34.9, lng: 150.2, altitude: 4500 },
        { lat: -35.9, lng: 149.1, altitude: 4000 },
      ],
      predictedPath: [
        { lat: -32.8, lng: 152.3, altitude: 5500 },
        { lat: -31.7, lng: 153.4, altitude: 6000 },
      ]
    },
    {
      id: '4', lat: 48.8566, lng: 2.3522, altitude: 7000, type: 'hostile', label: 'TGT-BRAVO', velocity: 520,
      trajectory: [
        { lat: 47.9, lng: 1.4, altitude: 6500 },
        { lat: 47.0, lng: 0.5, altitude: 6000 },
      ],
      predictedPath: [
        { lat: 49.8, lng: 3.3, altitude: 7500 },
        { lat: 50.7, lng: 4.4, altitude: 8000 },
      ]
    },
  ]);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setTargets(prev =>
        prev.map(t => {
          const newLat = t.lat + (Math.random() - 0.5) * 0.8;
          const newLng = t.lng + (Math.random() - 0.5) * 0.8;
          const newAlt = Math.max(1000, t.altitude + (Math.random() - 0.5) * 800);

          return {
            ...t,
            trajectory: [
              { lat: t.lat, lng: t.lng, altitude: t.altitude },
              ...(t.trajectory?.slice(0, 2) || [])
            ],
            predictedPath: [
              { lat: newLat + 1, lng: newLng + 1, altitude: newAlt + 500 },
              { lat: newLat + 2, lng: newLng + 2, altitude: newAlt + 1000 },
            ],
            lat: newLat,
            lng: newLng,
            altitude: newAlt,
          };
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className={`relative w-full h-full min-h-[280px] ${className}`}>
      <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <pointLight position={[-10, -10, -10]} intensity={0.4} color="#22c55e" />

        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />

        <Earth userLocation={userLocation} />

        {targets.map(target => (
          <React.Fragment key={target.id}>
            <TrajectoryLine target={target} />
            <TargetMarker target={target} />
          </React.Fragment>
        ))}

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3}
          maxDistance={12}
          autoRotate={false}
        />
      </Canvas>

      {/* HUD */}
      <div className="absolute top-1.5 left-1.5 bg-card/80 backdrop-blur rounded border border-border p-1.5">
        <div className="text-[9px] font-display text-primary mb-1">GLOBAL TRACKING</div>
        <div className="space-y-0.5 text-[8px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            <span className="text-muted-foreground">HOSTILE:</span>
            <span className="text-red-500">{targets.filter(t => t.type === 'hostile').length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span className="text-muted-foreground">FRIENDLY:</span>
            <span className="text-emerald-500">{targets.filter(t => t.type === 'friendly').length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
            <span className="text-muted-foreground">UNKNOWN:</span>
            <span className="text-yellow-500">{targets.filter(t => t.type === 'unknown').length}</span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1.5 text-[8px] font-mono bg-card/60 px-1.5 py-0.5 rounded">
        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-muted-foreground">{active ? 'ACTIVE' : 'OFFLINE'}</span>
      </div>
    </div>
  );
};

export default Globe3D;
