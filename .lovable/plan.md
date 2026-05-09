
## Plan

### 1. Supabase backend for threats
Create two tables via migration:
- `threats` — id, origin_lat, origin_lon, target_lat, target_lon, priority, eta_seconds, status (`active`/`intercepted`/`impacted`), created_at
- `interceptions` — id, threat_id (fk), intercepted_at, intercepted_by

Enable Row Level Security with public read + insert/update policies (no auth in app yet — open policies, flagged for tightening later). Add both tables to `supabase_realtime` publication and set `REPLICA IDENTITY FULL`.

### 2. Threat store rewrite (`src/stores/threatStore.ts`)
- Replace local-only Set with Supabase-backed state
- On mount: `select` all active threats → seed store
- Subscribe to `postgres_changes` on `threats` (INSERT → add to globe/radar; UPDATE status=intercepted → remove)
- `intercept(id)` → `update threats set status='intercepted'` + insert into `interceptions`
- Keeps `globeToRadarMap` for cross-display id sync
- Exposes `interceptedCount` derived from realtime data

### 3. Globe + Radar wiring
- `Globe3D.tsx`: replace local random attack generator with store data; new threats spawned by inserting rows (kept on a timer for demo). Click missile head → `intercept(id)` (DB update flows back via realtime).
- `Radar3DDisplay.tsx`: same — read targets from store, "INTERCEPT TARGET" calls `intercept`.
- HUD counter reads `interceptedCount` from store (already realtime).

### 4. Threat seeder edge function (optional, lightweight)
A small client-side interval that inserts a new `threats` row every ~8s with randomized origin around user GPS. Keeps demo populated; can later be replaced by a real source.

### 5. GLB joystick model (`joystic000000-2.glb`)
- Copy upload → `src/assets/joystick.glb`
- Add `@react-three/fiber` + `@react-three/drei` Canvas inside `JoystickControl.tsx` replacing the current 2D circle plate
- Render `useGLTF('/joystick.glb')` model on a circular base plate
- Tilt model on X/Z axes proportional to drag delta (same maxDistance math); spring back to 0 on release
- Calibration: on `RECALIBRATE`, run a short rotation sweep animation, then re-zero
- Visibility toggle button (eye icon) shows/hides the 3D model, falling back to current 2D UI
- Keep existing X/Y/ANGLE readout, sensitivity slider, status bar untouched

### 6. Cross-component joystick sync
- New tiny Zustand store `src/stores/joystickStore.ts` holding `{ x, y, angle, magnitude, calibrated }`
- `JoystickControl` writes into it on every move
- Other consumers (Globe3D camera nudge, Radar3DDisplay sweep offset, GPSMap pan) subscribe and use the values — wires the joystick into existing panels without changing their logic surface

### Technical notes
- Realtime: `supabase.channel('threats').on('postgres_changes', { event: '*', schema: 'public', table: 'threats' }, …).subscribe()`
- GLB loaded via drei `useGLTF` + `<Suspense>`; preload with `useGLTF.preload('/joystick.glb')`
- GLB placed in `public/joystick.glb` so drei can fetch by URL (smaller bundle than asset import for GLTF)
- RLS: public policies acceptable for this demo; noted as TODO for auth-gated tightening
- No edits to `src/integrations/supabase/{client,types}.ts`
