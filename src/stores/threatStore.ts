import { create } from 'zustand';

/**
 * Shared threat synchronization store for Globe3D ↔ Radar3DDisplay.
 * Inspired by GeoSentinel's centralized threat state pattern.
 *
 * When a threat is intercepted on the Globe (clicking a missile head),
 * its id is added to `interceptedIds` and the matching radar target
 * (mapped via `globeToRadarMap`) is also flagged as intercepted, so it
 * disappears from both displays simultaneously.
 */

interface ThreatStore {
  /** IDs of intercepted threats (both globe attack ids and radar target ids). */
  interceptedIds: Set<string>;
  /** Map globe attack id → radar target id for cross-display sync. */
  globeToRadarMap: Record<string, string>;
  /** Total count of intercepted threats across both displays. */
  interceptedCount: number;

  intercept: (id: string) => void;
  registerMapping: (globeId: string, radarId: string) => void;
  isIntercepted: (id: string) => boolean;
  reset: () => void;
}

export const useThreatStore = create<ThreatStore>((set, get) => ({
  interceptedIds: new Set<string>(),
  globeToRadarMap: {},
  interceptedCount: 0,

  intercept: (id: string) =>
    set((state) => {
      if (state.interceptedIds.has(id)) return state;
      const next = new Set(state.interceptedIds);
      next.add(id);
      // Also intercept the linked radar/globe counterpart if mapped.
      const mapped = state.globeToRadarMap[id];
      if (mapped) next.add(mapped);
      // Reverse lookup: if radar id was passed, mark its globe id too.
      const reverse = Object.entries(state.globeToRadarMap).find(
        ([, radarId]) => radarId === id,
      )?.[0];
      if (reverse) next.add(reverse);
      return {
        interceptedIds: next,
        interceptedCount: next.size,
      };
    }),

  registerMapping: (globeId, radarId) =>
    set((state) => ({
      globeToRadarMap: { ...state.globeToRadarMap, [globeId]: radarId },
    })),

  isIntercepted: (id: string) => get().interceptedIds.has(id),

  reset: () =>
    set({
      interceptedIds: new Set<string>(),
      globeToRadarMap: {},
      interceptedCount: 0,
    }),
}));
