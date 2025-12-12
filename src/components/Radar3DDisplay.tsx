import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { Plane, Target, AlertTriangle, HelpCircle, Shield, Volume2, VolumeX, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RadarTarget {
  id: string;
  angle: number;
  distance: number;
  altitude: number;
  type: 'hostile' | 'neutral' | 'unknown' | 'friendly';
  velocity: number;
  acceleration: number;
  displacement: number;
  heading: number;
  label?: string;
  trajectory?: { angle: number; distance: number; time: number }[];
  predictedPath?: { x: number; y: number; z: number }[];
  lrfDistance?: number;
  x?: number;
  y?: number;
  z?: number;
}

interface Radar3DDisplayProps {
  targets?: RadarTarget[];
  active?: boolean;
  className?: string;
}

const RANGE_CIRCLES = [100, 250, 500, 1000, 2000, 3000, 4000];
const MAX_RANGE = 4000;
const CLOSE_RANGE_ALERT = 500; // Alert for hostile targets within 500m

// Audio context for alerts
const createAlertSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.warn('Audio alert not available');
  }
};

// 3D Axis component
const Axis = () => {
  return (
    <group>
      {/* X Axis - Red */}
      <Line points={[[0, 0, 0], [6, 0, 0]]} color="#ef4444" lineWidth={2} />
      <Text position={[6.5, 0, 0]} fontSize={0.4} color="#ef4444">X</Text>
      
      {/* Y Axis - Green */}
      <Line points={[[0, 0, 0], [0, 6, 0]]} color="#22c55e" lineWidth={2} />
      <Text position={[0, 6.5, 0]} fontSize={0.4} color="#22c55e">Y (Alt)</Text>
      
      {/* Z Axis - Blue */}
      <Line points={[[0, 0, 0], [0, 0, 6]]} color="#3b82f6" lineWidth={2} />
      <Text position={[0, 0, 6.5]} fontSize={0.4} color="#3b82f6">Z</Text>
    </group>
  );
};

// Range circles in 3D
const RangeCircles3D = () => {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {RANGE_CIRCLES.map((range, idx) => {
        const radius = (range / MAX_RANGE) * 5;
        const isMax = idx === RANGE_CIRCLES.length - 1;
        return (
          <mesh key={range} position={[0, 0, 0]}>
            <ringGeometry args={[radius - 0.02, radius, 64]} />
            <meshBasicMaterial 
              color={isMax ? '#ff3c3c' : '#ff783c'} 
              transparent 
              opacity={isMax ? 0.6 : 0.3} 
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// Grid floor
const GridFloor = () => {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <gridHelper args={[12, 24, '#ff783c', '#1a1a2e']} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  );
};

// Sweep beam in 3D
const SweepBeam = ({ angle }: { angle: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y = -angle * (Math.PI / 180);
    }
  });

  return (
    <mesh ref={ref} position={[0, 0.1, 0]} rotation={[0, 0, 0]}>
      <planeGeometry args={[0.1, 6]} />
      <meshBasicMaterial color="#ff3c3c" transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Target marker in 3D
const TargetMarker3D = ({ 
  target, 
  isVisible, 
  onClick,
  isSelected
}: { 
  target: RadarTarget; 
  isVisible: boolean; 
  onClick: () => void;
  isSelected: boolean;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const normalizedDist = (target.distance / MAX_RANGE) * 5;
  const radians = (target.angle - 90) * (Math.PI / 180);
  const x = normalizedDist * Math.cos(radians);
  const z = normalizedDist * Math.sin(radians);
  const y = (target.altitude / 2000) * 2; // Scale altitude

  const getColor = () => {
    switch (target.type) {
      case 'hostile': return '#ef4444';
      case 'neutral': return '#facc15';
      case 'friendly': return '#34d399';
      case 'unknown': return '#22d3ee';
    }
  };

  useFrame((state) => {
    if (meshRef.current && isVisible) {
      meshRef.current.rotation.y += 0.02;
      if (target.type === 'hostile') {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.2;
        meshRef.current.scale.setScalar(scale);
      }
    }
  });

  if (!isVisible) return null;

  return (
    <group position={[x, y, z]}>
      {/* Vertical line to ground */}
      <Line 
        points={[[0, 0, 0], [0, -y, 0]]} 
        color={getColor()} 
        lineWidth={1} 
        dashed 
        dashSize={0.1} 
        gapSize={0.05} 
      />
      
      {/* Target marker */}
      <mesh ref={meshRef} onClick={onClick}>
        {target.type === 'hostile' ? (
          <octahedronGeometry args={[0.2]} />
        ) : target.type === 'friendly' ? (
          <boxGeometry args={[0.25, 0.25, 0.25]} />
        ) : (
          <sphereGeometry args={[0.15, 16, 16]} />
        )}
        <meshStandardMaterial 
          color={getColor()} 
          emissive={getColor()} 
          emissiveIntensity={isSelected ? 1 : 0.5} 
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.35, 32]} />
          <meshBasicMaterial color={getColor()} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Target label */}
      <Text 
        position={[0.3, 0.3, 0]} 
        fontSize={0.15} 
        color={getColor()}
        anchorX="left"
      >
        {target.label}
      </Text>
    </group>
  );
};

// 3D Scene
const Radar3DScene = ({ 
  targets, 
  sweepAngle, 
  visibleTargets, 
  selectedTarget, 
  setSelectedTarget,
  typeFilters
}: {
  targets: RadarTarget[];
  sweepAngle: number;
  visibleTargets: Set<string>;
  selectedTarget: RadarTarget | null;
  setSelectedTarget: (t: RadarTarget | null) => void;
  typeFilters: Record<string, boolean>;
}) => {
  const filteredTargets = targets.filter(t => typeFilters[t.type]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, 10, -10]} intensity={0.4} />
      
      <Axis />
      <GridFloor />
      <RangeCircles3D />
      <SweepBeam angle={sweepAngle} />
      
      {filteredTargets.map(target => (
        <TargetMarker3D
          key={target.id}
          target={target}
          isVisible={visibleTargets.has(target.id)}
          isSelected={selectedTarget?.id === target.id}
          onClick={() => setSelectedTarget(selectedTarget?.id === target.id ? null : target)}
        />
      ))}
      
      <OrbitControls 
        enablePan={true} 
        enableZoom={true} 
        enableRotate={true}
        minDistance={3}
        maxDistance={15}
        target={[0, 0, 0]}
      />
    </>
  );
};

const Radar3DDisplay: React.FC<Radar3DDisplayProps> = ({
  targets: externalTargets,
  active = true,
  className
}) => {
  const [sweepAngle, setSweepAngle] = useState(0);
  const [internalTargets, setInternalTargets] = useState<RadarTarget[]>([]);
  const [visibleTargets, setVisibleTargets] = useState<Set<string>>(new Set());
  const [selectedTarget, setSelectedTarget] = useState<RadarTarget | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilters, setTypeFilters] = useState({
    hostile: true,
    neutral: true,
    unknown: true,
    friendly: true
  });
  const lastAlertTime = useRef(0);

  // Generate targets
  useEffect(() => {
    if (!active) {
      setInternalTargets([]);
      setVisibleTargets(new Set());
      return;
    }

    const generateTargets = () => {
      const count = Math.floor(Math.random() * 5) + 3;
      const newTargets: RadarTarget[] = [];
      const types: RadarTarget['type'][] = ['hostile', 'neutral', 'unknown', 'friendly'];

      for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const baseAngle = Math.random() * 360;
        const baseDistance = 100 + Math.random() * 3900;
        const velocity = 50 + Math.random() * 450;
        const acceleration = -5 + Math.random() * 10;
        const altitude = 50 + Math.random() * 2000;

        const trajectory: { angle: number; distance: number; time: number }[] = [];
        let prevDist = baseDistance;
        for (let j = 0; j < 6; j++) {
          prevDist = Math.max(100, prevDist - velocity * 0.5 + Math.random() * 50);
          trajectory.push({
            angle: baseAngle - j * (velocity * 0.02) + Math.random() * 2,
            distance: prevDist,
            time: Date.now() - j * 500
          });
        }

        const displacement = trajectory.length > 1 
          ? Math.sqrt(
              Math.pow(baseDistance - trajectory[trajectory.length - 1].distance, 2) +
              Math.pow((baseAngle - trajectory[trajectory.length - 1].angle) * (baseDistance / 57.3), 2)
            )
          : 0;

        // Calculate 3D coordinates
        const normalizedDist = (baseDistance / MAX_RANGE) * 5;
        const radians = (baseAngle - 90) * (Math.PI / 180);
        const x = normalizedDist * Math.cos(radians);
        const z = normalizedDist * Math.sin(radians);
        const y = (altitude / 2000) * 2;

        newTargets.push({
          id: `target-${Date.now()}-${i}`,
          angle: baseAngle,
          distance: baseDistance,
          altitude,
          type,
          velocity,
          acceleration,
          displacement,
          heading: (baseAngle + 180 + Math.random() * 30 - 15) % 360,
          label: `TGT-${String(i + 1).padStart(2, '0')}`,
          trajectory,
          lrfDistance: baseDistance + Math.random() * 10 - 5,
          x, y, z
        });
      }

      setInternalTargets(newTargets);
    };

    generateTargets();
    
    const moveInterval = setInterval(() => {
      setInternalTargets(prev => prev.map(target => {
        const newDistance = Math.max(100, Math.min(MAX_RANGE, 
          target.distance + (Math.random() - 0.5) * 50
        ));
        const newAngle = (target.angle + (Math.random() - 0.5) * 2 + 360) % 360;
        const newVelocity = Math.max(0, target.velocity + target.acceleration * 0.1);
        
        const normalizedDist = (newDistance / MAX_RANGE) * 5;
        const radians = (newAngle - 90) * (Math.PI / 180);
        
        return {
          ...target,
          distance: newDistance,
          angle: newAngle,
          velocity: newVelocity,
          lrfDistance: newDistance + Math.random() * 10 - 5,
          displacement: target.displacement + Math.abs(target.distance - newDistance),
          x: normalizedDist * Math.cos(radians),
          z: normalizedDist * Math.sin(radians)
        };
      }));
    }, 500);

    const regenerateInterval = setInterval(generateTargets, 15000);
    
    return () => {
      clearInterval(moveInterval);
      clearInterval(regenerateInterval);
    };
  }, [active]);

  // Sweep animation
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setSweepAngle(prev => (prev + 1.5) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [active]);

  // Reveal targets and audio alerts
  useEffect(() => {
    const targets = externalTargets || internalTargets;
    targets.forEach(target => {
      const angleDiff = Math.abs(sweepAngle - target.angle);
      if (angleDiff < 8 || angleDiff > 352) {
        setVisibleTargets(prev => new Set(prev).add(target.id));
        
        // Audio alert for close-range hostile targets
        if (
          audioEnabled && 
          target.type === 'hostile' && 
          target.distance <= CLOSE_RANGE_ALERT &&
          Date.now() - lastAlertTime.current > 2000
        ) {
          createAlertSound();
          lastAlertTime.current = Date.now();
        }
        
        setTimeout(() => {
          setVisibleTargets(prev => {
            const next = new Set(prev);
            next.delete(target.id);
            return next;
          });
        }, 6000);
      }
    });
  }, [sweepAngle, externalTargets, internalTargets, audioEnabled]);

  const targets = externalTargets || internalTargets;

  const formatDistance = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)}km`;
    return `${Math.round(meters)}m`;
  };

  const getTargetColor = (type: RadarTarget['type']) => {
    switch (type) {
      case 'hostile': return 'text-red-500';
      case 'neutral': return 'text-yellow-400';
      case 'friendly': return 'text-emerald-400';
      case 'unknown': return 'text-cyan-400';
    }
  };

  const toggleFilter = (type: keyof typeof typeFilters) => {
    setTypeFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const visibleFilteredTargets = targets.filter(t => 
    visibleTargets.has(t.id) && typeFilters[t.type]
  );

  return (
    <div className={cn("relative h-full min-h-[400px]", className)}>
      {/* 3D Canvas */}
      <div className="absolute inset-0 rounded bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <Canvas camera={{ position: [8, 6, 8], fov: 50 }}>
          <Suspense fallback={null}>
            <Radar3DScene
              targets={targets}
              sweepAngle={sweepAngle}
              visibleTargets={visibleTargets}
              selectedTarget={selectedTarget}
              setSelectedTarget={setSelectedTarget}
              typeFilters={typeFilters}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Controls overlay */}
      <div className="absolute top-2 left-2 flex flex-col gap-2 z-10">
        <div className="flex items-center gap-1 text-[9px] font-mono bg-black/60 px-2 py-1 rounded">
          <span className="text-muted-foreground">RADAR 3D</span>
          <span className={cn("px-1 rounded text-black", active ? "bg-emerald-500" : "bg-muted")}>
            {active ? 'ACTIVE' : 'OFF'}
          </span>
        </div>
        
        {/* Audio toggle */}
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[9px] bg-black/60 border-border"
          onClick={() => setAudioEnabled(!audioEnabled)}
        >
          {audioEnabled ? (
            <Volume2 className="w-3 h-3 text-emerald-400 mr-1" />
          ) : (
            <VolumeX className="w-3 h-3 text-red-400 mr-1" />
          )}
          ALERT
        </Button>

        {/* Filter toggle */}
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[9px] bg-black/60 border-border"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-3 h-3 mr-1" />
          FILTER
        </Button>

        {/* Filter options */}
        {showFilters && (
          <div className="bg-black/80 border border-border rounded p-2 text-[8px] font-mono">
            {(['hostile', 'neutral', 'unknown', 'friendly'] as const).map(type => (
              <label key={type} className="flex items-center gap-2 cursor-pointer py-0.5">
                <input
                  type="checkbox"
                  checked={typeFilters[type]}
                  onChange={() => toggleFilter(type)}
                  className="w-3 h-3"
                />
                <span className={getTargetColor(type)}>{type.toUpperCase()}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Axis legend */}
      <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-[8px] font-mono z-10">
        <div className="text-muted-foreground mb-1">3D AXES</div>
        <div className="text-red-500">X: Horizontal</div>
        <div className="text-emerald-400">Y: Altitude</div>
        <div className="text-blue-400">Z: Depth</div>
        <div className="text-orange-400 mt-1">MAX: 4.0km</div>
        <div className="text-muted-foreground">LRF: ACTIVE</div>
      </div>

      {/* Bearing */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xl font-display text-orange-500 font-bold bg-black/40 px-3 py-1 rounded z-10">
        {String(Math.round(sweepAngle)).padStart(3, '0')}°
      </div>

      {/* Legend */}
      <div className="absolute bottom-14 left-2 flex items-center gap-2 text-[7px] font-mono bg-black/60 px-2 py-1 rounded z-10">
        <div className="flex items-center gap-0.5">
          <AlertTriangle className="w-3 h-3 text-red-500" />
          <span className="text-red-400">HST</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Shield className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400">FRD</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Plane className="w-3 h-3 text-yellow-400" />
          <span className="text-yellow-400">NTL</span>
        </div>
        <div className="flex items-center gap-0.5">
          <HelpCircle className="w-3 h-3 text-cyan-400" />
          <span className="text-cyan-400">UNK</span>
        </div>
      </div>

      {/* Selected target panel */}
      {selectedTarget && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur border border-border rounded-lg p-3 min-w-[280px] z-30 shadow-lg">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
            <span className={cn("font-display text-sm", getTargetColor(selectedTarget.type))}>{selectedTarget.label}</span>
            <span className={cn(
              "text-[10px] uppercase px-1.5 py-0.5 rounded font-bold",
              selectedTarget.type === 'hostile' ? 'bg-red-500 text-black' :
              selectedTarget.type === 'neutral' ? 'bg-yellow-400 text-black' :
              selectedTarget.type === 'friendly' ? 'bg-emerald-400 text-black' :
              'bg-cyan-400 text-black'
            )}>
              {selectedTarget.type}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-mono">
            {/* 3D Coordinates */}
            <div className="col-span-2 bg-blue-500/10 rounded px-2 py-1 mb-1">
              <div className="flex justify-between">
                <span className="text-blue-400">3D POSITION (X,Y,Z):</span>
                <span className="text-blue-300 font-bold">
                  ({selectedTarget.x?.toFixed(1)}, {selectedTarget.y?.toFixed(1)}, {selectedTarget.z?.toFixed(1)})
                </span>
              </div>
            </div>

            {/* LRF Distance */}
            <div className="col-span-2 bg-orange-500/10 rounded px-2 py-1 mb-1">
              <div className="flex justify-between">
                <span className="text-orange-400">LRF DISTANCE:</span>
                <span className="text-orange-300 font-bold">{formatDistance(selectedTarget.lrfDistance || selectedTarget.distance)}</span>
              </div>
            </div>
            
            <span className="text-muted-foreground">BEARING:</span>
            <span>{selectedTarget.angle.toFixed(1)}°</span>
            
            <span className="text-muted-foreground">ELEVATION:</span>
            <span className="text-cyan-400">{Math.round(selectedTarget.altitude)}m ASL</span>
            
            <span className="text-muted-foreground">VELOCITY:</span>
            <span className="text-emerald-400">{selectedTarget.velocity.toFixed(1)} m/s</span>
            
            <span className="text-muted-foreground">ACCELERATION:</span>
            <span className={selectedTarget.acceleration >= 0 ? "text-emerald-400" : "text-red-400"}>
              {selectedTarget.acceleration >= 0 ? '+' : ''}{selectedTarget.acceleration.toFixed(2)} m/s²
            </span>
            
            <span className="text-muted-foreground">DISPLACEMENT:</span>
            <span className="text-yellow-400">{formatDistance(selectedTarget.displacement)}</span>
            
            <span className="text-muted-foreground">HEADING:</span>
            <span>{selectedTarget.heading.toFixed(1)}°</span>
            
            <span className="text-muted-foreground">TRAJECTORY PTS:</span>
            <span>{selectedTarget.trajectory?.length || 0}</span>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-card/90 backdrop-blur border-t border-border p-1.5 z-10">
        <div className="flex items-center justify-between text-[9px] font-mono">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-muted-foreground">HOSTILE:</span>
              <span className="text-red-500 font-bold">
                {visibleFilteredTargets.filter(t => t.type === 'hostile').length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3 text-emerald-400" />
              <span className="text-muted-foreground">TRACKED:</span>
              <span className="text-emerald-400 font-bold">{visibleFilteredTargets.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">TOTAL:</span>
              <span className="text-primary font-bold">{targets.length}</span>
            </div>
            {audioEnabled && (
              <div className="flex items-center gap-1 text-orange-400">
                <Volume2 className="w-3 h-3" />
                <span>ALERT &lt;{CLOSE_RANGE_ALERT}m</span>
              </div>
            )}
          </div>
          <div className="text-orange-400">
            SWEEP: {String(Math.round(sweepAngle)).padStart(3, '0')}°
          </div>
        </div>
      </div>
    </div>
  );
};

export default Radar3DDisplay;
