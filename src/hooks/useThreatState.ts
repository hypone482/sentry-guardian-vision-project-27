import { create } from 'zustand';

export interface SharedThreat {
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
  neutralized: boolean;
  angle: number; // For radar display
}

interface ThreatState {
  threats: SharedThreat[];
  setThreats: (threats: SharedThreat[]) => void;
  neutralizeThreat: (id: string) => void;
  updateThreat: (id: string, updates: Partial<SharedThreat>) => void;
}

export const useThreatState = create<ThreatState>((set) => ({
  threats: [],
  setThreats: (threats) => set({ threats }),
  neutralizeThreat: (id) => set((state) => ({
    threats: state.threats.map(t => 
      t.id === id ? { ...t, neutralized: true } : t
    )
  })),
  updateThreat: (id, updates) => set((state) => ({
    threats: state.threats.map(t =>
      t.id === id ? { ...t, ...updates } : t
    )
  }))
}));
