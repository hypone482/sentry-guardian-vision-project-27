import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';

interface Target {
  id: string;
  lat: number;
  lng: number;
  altitude: number;
  type: 'hostile' | 'friendly' | 'unknown';
  label: string;
}

interface Globe3DProps {
  active?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
}

// Convert lat/lng to 3D position on sphere
const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
};

const Earth = ({ userLocation }: { userLocation?: { lat: number; lng: number } | null }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const gridRef = useRef<THREE.LineSegments>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
    if (gridRef.current) {
      gridRef.current.rotation.y += 0.001;
    }
  });

  // Create wireframe grid sphere
  const gridGeometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(2, 36, 18);
    return new THREE.WireframeGeometry(geo);
  }, []);

  return (
    <group>
      {/* Core sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.98, 64, 32]} />
        <meshStandardMaterial
          color="#0a1628"
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Wireframe grid */}
      <lineSegments ref={gridRef} geometry={gridGeometry}>
        <lineBasicMaterial color="#22c55e" transparent opacity={0.3} />
      </lineSegments>

      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[2.1, 64, 32]} />
        <meshStandardMaterial
          color="#22c55e"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>

      {/* User location marker */}
      {userLocation && (
        <UserMarker lat={userLocation.lat} lng={userLocation.lng} />
      )}
    </group>
  );
};

const UserMarker = ({ lat, lng }: { lat: number; lng: number }) => {
  const position = latLngToVector3(lat, lng, 2.05);
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
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
      </mesh>
      <mesh ref={pulseRef}>
        <ringGeometry args={[0.06, 0.08, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <Html distanceFactor={10}>
        <div className="bg-card/90 px-2 py-1 rounded text-[10px] font-mono text-primary whitespace-nowrap border border-primary/30">
          YOUR LOCATION
        </div>
      </Html>
    </group>
  );
};

const TargetMarker = ({ target }: { target: Target }) => {
  const position = latLngToVector3(target.lat, target.lng, 2 + target.altitude * 0.001);
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
      <Html distanceFactor={10}>
        <div className="bg-card/80 px-1 py-0.5 rounded text-[8px] font-mono whitespace-nowrap border" 
             style={{ color, borderColor: color }}>
          {target.label}
        </div>
      </Html>
    </group>
  );
};

const Targets = ({ targets }: { targets: Target[] }) => {
  return (
    <>
      {targets.map(target => (
        <TargetMarker key={target.id} target={target} />
      ))}
    </>
  );
};

const Globe3D: React.FC<Globe3DProps> = ({ active = true, userLocation, className }) => {
  const [targets, setTargets] = useState<Target[]>([
    { id: '1', lat: 51.5074, lng: -0.1278, altitude: 5000, type: 'hostile', label: 'TGT-ALPHA' },
    { id: '2', lat: 35.6762, lng: 139.6503, altitude: 8000, type: 'friendly', label: 'ALLY-01' },
    { id: '3', lat: -33.8688, lng: 151.2093, altitude: 3000, type: 'unknown', label: 'UNK-03' },
    { id: '4', lat: 48.8566, lng: 2.3522, altitude: 6000, type: 'hostile', label: 'TGT-BRAVO' },
  ]);

  // Simulate target movement
  useEffect(() => {
    if (!active) return;
    
    const interval = setInterval(() => {
      setTargets(prev => prev.map(t => ({
        ...t,
        lat: t.lat + (Math.random() - 0.5) * 0.5,
        lng: t.lng + (Math.random() - 0.5) * 0.5,
        altitude: Math.max(1000, t.altitude + (Math.random() - 0.5) * 500),
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className={`relative w-full h-full min-h-[350px] ${className}`}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#22c55e" />
        
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        
        <Earth userLocation={userLocation} />
        <Targets targets={targets} />
        
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          minDistance={3}
          maxDistance={10}
          autoRotate={false}
        />
      </Canvas>

      {/* HUD Overlay */}
      <div className="absolute top-2 left-2 bg-card/80 backdrop-blur rounded border border-border p-2">
        <div className="text-[10px] font-display text-primary mb-1">GLOBAL TRACKING</div>
        <div className="space-y-0.5 text-[9px] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-muted-foreground">HOSTILE:</span>
            <span className="text-red-500">{targets.filter(t => t.type === 'hostile').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-muted-foreground">FRIENDLY:</span>
            <span className="text-emerald-500">{targets.filter(t => t.type === 'friendly').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span className="text-muted-foreground">UNKNOWN:</span>
            <span className="text-yellow-500">{targets.filter(t => t.type === 'unknown').length}</span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="absolute bottom-2 right-2 flex items-center gap-2 text-[9px] font-mono">
        <span className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-muted-foreground">{active ? 'TRACKING ACTIVE' : 'OFFLINE'}</span>
      </div>
    </div>
  );
};

export default Globe3D;
