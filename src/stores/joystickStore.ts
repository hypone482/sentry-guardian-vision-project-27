import { create } from 'zustand';

/**
 * Shared joystick state — written by JoystickControl, read by other panels
 * (Globe3D camera nudge, Radar sweep offset, GPSMap pan, etc.) so the
 * GLB joystick stays in sync with every consumer branch.
 */
interface JoystickState {
  x: number; // -1..1
  y: number; // -1..1
  angle: number; // degrees
  magnitude: number; // 0..1
  calibrated: boolean;
  visible: boolean;
  setVector: (x: number, y: number) => void;
  setCalibrated: (v: boolean) => void;
  setVisible: (v: boolean) => void;
}

export const useJoystickStore = create<JoystickState>((set) => ({
  x: 0,
  y: 0,
  angle: 0,
  magnitude: 0,
  calibrated: true,
  visible: true,
  setVector: (x, y) => {
    const magnitude = Math.min(1, Math.sqrt(x * x + y * y));
    const angle = Math.atan2(y, x) * (180 / Math.PI);
    set({ x, y, magnitude, angle });
  },
  setCalibrated: (calibrated) => set({ calibrated }),
  setVisible: (visible) => set({ visible }),
}));
