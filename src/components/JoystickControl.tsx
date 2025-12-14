import React, { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { Crosshair, RotateCcw, Settings, Gauge, Wifi, WifiOff, Circle, Square, Triangle, Gamepad2 } from 'lucide-react';

interface JoystickControlProps {
  active?: boolean;
  className?: string;
  onPositionChange?: (x: number, y: number) => void;
  onButtonPress?: (button: string) => void;
}

// 3D Joystick Model Component
const JoystickModel = ({ 
  position,
  onButtonClick 
}: { 
  position: { x: number; y: number };
  onButtonClick: (button: string) => void;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const stickRef = useRef<THREE.Group>(null);
  
  // Load the GLB model
  const { scene, nodes } = useGLTF('/models/joystick.glb') as any;

  useFrame((state) => {
    if (stickRef.current) {
      // Animate stick based on virtual joystick position
      stickRef.current.rotation.x = -position.y * 0.3;
      stickRef.current.rotation.z = position.x * 0.3;
    }
    if (groupRef.current) {
      // Subtle idle animation
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.5, 0]} scale={2}>
      <primitive object={scene.clone()} ref={stickRef} />
      
      {/* Button indicators - overlaid on model */}
      <Html position={[-0.8, 0.8, 0]} distanceFactor={3}>
        <button 
          onClick={() => onButtonClick('A')}
          className="w-6 h-6 rounded-full bg-emerald-500/80 border border-emerald-400 text-[10px] font-bold text-white hover:bg-emerald-400 transition-colors shadow-lg"
        >
          A
        </button>
      </Html>
      <Html position={[-0.5, 0.6, 0]} distanceFactor={3}>
        <button 
          onClick={() => onButtonClick('B')}
          className="w-6 h-6 rounded-full bg-red-500/80 border border-red-400 text-[10px] font-bold text-white hover:bg-red-400 transition-colors shadow-lg"
        >
          B
        </button>
      </Html>
      <Html position={[0.5, 0.8, 0]} distanceFactor={3}>
        <button 
          onClick={() => onButtonClick('X')}
          className="w-6 h-6 rounded-full bg-blue-500/80 border border-blue-400 text-[10px] font-bold text-white hover:bg-blue-400 transition-colors shadow-lg"
        >
          X
        </button>
      </Html>
      <Html position={[0.8, 0.6, 0]} distanceFactor={3}>
        <button 
          onClick={() => onButtonClick('Y')}
          className="w-6 h-6 rounded-full bg-yellow-500/80 border border-yellow-400 text-[10px] font-bold text-black hover:bg-yellow-400 transition-colors shadow-lg"
        >
          Y
        </button>
      </Html>
      
      {/* Trigger buttons */}
      <Html position={[-1, 1.2, 0]} distanceFactor={3}>
        <button 
          onClick={() => onButtonClick('L1')}
          className="px-2 py-1 rounded bg-gray-600/80 border border-gray-500 text-[8px] font-bold text-white hover:bg-gray-500 transition-colors"
        >
          L1
        </button>
      </Html>
      <Html position={[1, 1.2, 0]} distanceFactor={3}>
        <button 
          onClick={() => onButtonClick('R1')}
          className="px-2 py-1 rounded bg-gray-600/80 border border-gray-500 text-[8px] font-bold text-white hover:bg-gray-500 transition-colors"
        >
          R1
        </button>
      </Html>
    </group>
  );
};

// Fallback joystick when model fails to load
const FallbackJoystick = ({ position }: { position: { x: number; y: number } }) => {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.x = -position.y * 0.3;
      ref.current.rotation.z = position.x * 0.3;
    }
  });

  return (
    <group ref={ref}>
      {/* Base */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.8, 1, 0.3, 32]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Stick */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 16]} />
        <meshStandardMaterial color="#333" metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Top */}
      <mesh position={[0, 0.65, 0]}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial color="#ff783c" emissive="#ff783c" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

const JoystickScene = ({ 
  position, 
  onButtonClick,
  useModel 
}: { 
  position: { x: number; y: number };
  onButtonClick: (button: string) => void;
  useModel: boolean;
}) => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, 5, -5]} intensity={0.4} color="#ff783c" />
      
      <Suspense fallback={<FallbackJoystick position={position} />}>
        {useModel ? (
          <JoystickModel position={position} onButtonClick={onButtonClick} />
        ) : (
          <FallbackJoystick position={position} />
        )}
      </Suspense>
      
      <OrbitControls 
        enablePan={false} 
        enableZoom={false} 
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
};

const JoystickControl: React.FC<JoystickControlProps> = ({ 
  active = true, 
  className,
  onPositionChange,
  onButtonPress
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [calibrated, setCalibrated] = useState(true);
  const [sensitivity, setSensitivity] = useState(1);
  const [connected, setConnected] = useState(false);
  const [lastButtonPressed, setLastButtonPressed] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(true);
  const [showCalibration, setShowCalibration] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const gamepadRef = useRef<Gamepad | null>(null);

  const maxDistance = 40;

  // Button mappings
  const buttonFunctions: Record<string, string> = {
    'A': 'FIRE / SELECT',
    'B': 'CANCEL / BACK',
    'X': 'SECONDARY ACTION',
    'Y': 'MENU / MAP',
    'L1': 'LEFT TRIGGER',
    'R1': 'RIGHT TRIGGER',
    'L2': 'AIM DOWN SIGHTS',
    'R2': 'ZOOM',
    'START': 'PAUSE MENU',
    'SELECT': 'QUICK MENU',
    'D-UP': 'ITEM 1',
    'D-DOWN': 'ITEM 2',
    'D-LEFT': 'ITEM 3',
    'D-RIGHT': 'ITEM 4'
  };

  // Check for gamepad connection
  useEffect(() => {
    const handleGamepadConnected = (e: GamepadEvent) => {
      console.log('Gamepad connected:', e.gamepad.id);
      setConnected(true);
      gamepadRef.current = e.gamepad;
    };

    const handleGamepadDisconnected = () => {
      console.log('Gamepad disconnected');
      setConnected(false);
      gamepadRef.current = null;
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    // Check if gamepad is already connected
    const gamepads = navigator.getGamepads();
    for (const gamepad of gamepads) {
      if (gamepad) {
        setConnected(true);
        gamepadRef.current = gamepad;
        break;
      }
    }

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
    };
  }, []);

  // Poll gamepad state
  useEffect(() => {
    if (!connected || !active) return;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gamepad = gamepads[0];
      
      if (gamepad) {
        // Get joystick axes
        const x = gamepad.axes[0] * maxDistance * sensitivity;
        const y = gamepad.axes[1] * maxDistance * sensitivity;
        
        if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
          setPosition({ x, y });
          onPositionChange?.(x / maxDistance, y / maxDistance);
        }

        // Check button presses
        gamepad.buttons.forEach((button, index) => {
          if (button.pressed) {
            const buttonNames = ['A', 'B', 'X', 'Y', 'L1', 'R1', 'L2', 'R2', 'SELECT', 'START'];
            if (buttonNames[index]) {
              handleButtonPress(buttonNames[index]);
            }
          }
        });
      }
    };

    const interval = setInterval(pollGamepad, 16); // ~60fps
    return () => clearInterval(interval);
  }, [connected, active, sensitivity, onPositionChange]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!active) return;
    setIsDragging(true);
  }, [active]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = (clientX - centerX) * sensitivity;
    let deltaY = (clientY - centerY) * sensitivity;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > maxDistance) {
      const scale = maxDistance / distance;
      deltaX *= scale;
      deltaY *= scale;
    }

    setPosition({ x: deltaX, y: deltaY });
    onPositionChange?.(deltaX / maxDistance, deltaY / maxDistance);
  }, [isDragging, sensitivity, onPositionChange]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    onPositionChange?.(0, 0);
  }, [onPositionChange]);

  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => isDragging && handleEnd();

  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };
  const onTouchEnd = () => handleEnd();

  const handleButtonPress = (button: string) => {
    setLastButtonPressed(button);
    onButtonPress?.(button);
    setTimeout(() => setLastButtonPressed(null), 200);
  };

  const calibrate = () => {
    setShowCalibration(true);
    setCalibrationStep(0);
    setCalibrated(false);
    
    // Calibration sequence
    const steps = [
      { step: 1, message: 'Move joystick to CENTER' },
      { step: 2, message: 'Move joystick to FULL UP' },
      { step: 3, message: 'Move joystick to FULL DOWN' },
      { step: 4, message: 'Move joystick to FULL LEFT' },
      { step: 5, message: 'Move joystick to FULL RIGHT' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setCalibrationStep(currentStep);
      if (currentStep >= steps.length) {
        clearInterval(interval);
        setCalibrated(true);
        setShowCalibration(false);
        setPosition({ x: 0, y: 0 });
      }
    }, 1000);
  };

  const angle = Math.atan2(position.y, position.x) * (180 / Math.PI);
  const magnitude = Math.sqrt(position.x * position.x + position.y * position.y) / maxDistance * 100;

  return (
    <div className={cn("relative h-full min-h-[300px] flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-primary" />
          <span className="text-xs font-display text-primary">3D JOYSTICK</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded",
            connected ? "bg-emerald-500/20 text-emerald-400" : "bg-muted/20 text-muted-foreground"
          )}>
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connected ? 'CONNECTED' : 'NO DEVICE'}
          </span>
          <span className={cn(
            "w-2 h-2 rounded-full",
            calibrated ? "bg-emerald-500" : "bg-yellow-500 animate-pulse"
          )} />
        </div>
      </div>

      {/* 3D Joystick View */}
      <div className="flex-1 min-h-[150px] bg-card/30 rounded-lg border border-border/50 overflow-hidden relative">
        <Canvas camera={{ position: [0, 2, 3], fov: 45 }}>
          <JoystickScene 
            position={position} 
            onButtonClick={handleButtonPress}
            useModel={modelLoaded}
          />
        </Canvas>

        {/* Calibration Overlay */}
        {showCalibration && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center">
              <div className="text-emerald-400 font-display text-lg mb-2">CALIBRATING...</div>
              <div className="text-muted-foreground font-mono text-sm">
                Step {calibrationStep + 1}/5
              </div>
              <div className="mt-3 w-32 h-1 bg-muted/30 rounded overflow-hidden mx-auto">
                <div 
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${((calibrationStep + 1) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Virtual Joystick Pad */}
      <div className="flex gap-2 mt-2">
        <div 
          ref={containerRef}
          className="relative w-24 h-24 rounded-full bg-card border-2 border-border flex-shrink-0"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <svg className="absolute inset-0 w-full h-full">
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.2" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.2" />
          </svg>

          <div
            className={cn(
              "absolute w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-primary shadow-lg cursor-grab",
              isDragging && "cursor-grabbing shadow-primary/50",
              !calibrated && "opacity-50"
            )}
            style={{
              left: `calc(50% + ${position.x}px - 16px)`,
              top: `calc(50% + ${position.y}px - 16px)`,
              transition: isDragging ? 'none' : 'all 0.2s ease-out',
            }}
          >
            <div className="absolute inset-1 rounded-full bg-card/50 flex items-center justify-center">
              <Crosshair className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Button Grid */}
        <div className="flex-1 grid grid-cols-4 gap-1">
          {['A', 'B', 'X', 'Y', 'L1', 'R1', 'L2', 'R2'].map(btn => (
            <button
              key={btn}
              onClick={() => handleButtonPress(btn)}
              className={cn(
                "rounded text-[9px] font-bold transition-all border",
                lastButtonPressed === btn 
                  ? "bg-primary text-primary-foreground border-primary scale-95" 
                  : "bg-card/50 text-muted-foreground border-border/50 hover:bg-card hover:text-foreground"
              )}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>

      {/* Data Display */}
      <div className="grid grid-cols-4 gap-1 mt-2 text-[8px]">
        <div className="bg-card/50 rounded border border-border/50 p-1.5">
          <div className="text-muted-foreground font-mono">X</div>
          <div className="font-mono text-primary">{(position.x / maxDistance * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-card/50 rounded border border-border/50 p-1.5">
          <div className="text-muted-foreground font-mono">Y</div>
          <div className="font-mono text-cyan-400">{(-position.y / maxDistance * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-card/50 rounded border border-border/50 p-1.5">
          <div className="text-muted-foreground font-mono">MAG</div>
          <div className="font-mono text-yellow-400">{magnitude.toFixed(0)}%</div>
        </div>
        <div className="bg-card/50 rounded border border-border/50 p-1.5">
          <div className="text-muted-foreground font-mono">ANG</div>
          <div className="font-mono text-emerald-400">{magnitude > 5 ? `${angle.toFixed(0)}°` : '--'}</div>
        </div>
      </div>

      {/* Last Button & Function */}
      {lastButtonPressed && (
        <div className="mt-1 text-center text-[9px] font-mono bg-primary/20 rounded py-1">
          <span className="text-primary font-bold">{lastButtonPressed}</span>
          <span className="text-muted-foreground ml-2">{buttonFunctions[lastButtonPressed]}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={calibrate}
          disabled={!calibrated}
          className={cn(
            "flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-colors",
            calibrated 
              ? "bg-accent/20 text-accent border border-accent/40 hover:bg-accent/30" 
              : "bg-muted/20 text-muted-foreground border border-border cursor-not-allowed"
          )}
        >
          <RotateCcw className="w-3 h-3" />
          CALIBRATE
        </button>
        
        <div className="flex-1 flex items-center gap-1 px-2 py-1 bg-card/50 rounded border border-border/50">
          <Gauge className="w-3 h-3 text-muted-foreground" />
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-primary"
          />
          <span className="text-[9px] font-mono text-muted-foreground w-6">{sensitivity.toFixed(1)}x</span>
        </div>
      </div>

      {/* Button Functions Reference */}
      <div className="mt-2 p-2 bg-card/30 rounded border border-border/30">
        <div className="text-[8px] font-mono text-muted-foreground mb-1">BUTTON FUNCTIONS:</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[7px] font-mono">
          {Object.entries(buttonFunctions).slice(0, 8).map(([btn, func]) => (
            <div key={btn} className="flex justify-between">
              <span className="text-primary">{btn}:</span>
              <span className="text-muted-foreground">{func}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30 text-[9px] font-mono">
        <div className="flex items-center gap-1">
          <span className={cn(
            "w-2 h-2 rounded-full",
            active ? "bg-emerald-500 animate-pulse" : "bg-red-500"
          )} />
          <span className="text-muted-foreground">{active ? 'ACTIVE' : 'OFFLINE'}</span>
        </div>
        <div className="text-muted-foreground">
          {connected ? 'HARDWARE DETECTED' : 'VIRTUAL MODE'}
        </div>
      </div>
    </div>
  );
};

// Preload the model
useGLTF.preload('/models/joystick.glb');

export default JoystickControl;
