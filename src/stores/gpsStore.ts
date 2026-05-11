import { create } from 'zustand';

/**
 * Shared GPS telemetry — written by GPSMap (live navigator.geolocation watch),
 * consumed by Globe3D (user marker, heading arrow, accuracy ring) and any
 * other panel that needs the operator's real-time position.
 */
export interface GPSState {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number; // meters
  heading: number; // degrees, 0=N
  speed: number; // m/s
  hasFix: boolean;
  lastFix: number | null;
  setFix: (data: Partial<Omit<GPSState, 'setFix' | 'hasFix' | 'lastFix'>>) => void;
}

export const useGPSStore = create<GPSState>((set) => ({
  latitude: 9.0192,
  longitude: 38.7525,
  altitude: 0,
  accuracy: 0,
  heading: 0,
  speed: 0,
  hasFix: false,
  lastFix: null,
  setFix: (data) =>
    set((s) => ({
      ...s,
      ...data,
      hasFix: true,
      lastFix: Date.now(),
    })),
}));
