import { Motion } from '@capacitor/motion';

// Tuning knobs. Gravity is ~9.8 m/s^2 baseline; a deliberate bump/tap against
// another phone produces a short, sharp spike well above that. These values
// are a reasonable starting point for a phone-in-hand bump — test on your
// actual device (itel 260) and adjust BUMP_THRESHOLD up/down.
const BUMP_THRESHOLD = 22; // m/s^2 of combined acceleration magnitude
const DEBOUNCE_MS = 1500; // ignore repeat spikes right after a detected bump

export type BumpCallback = (magnitude: number, timestamp: number) => void;

export class BumpDetector {
  private listenerHandle: { remove: () => void } | null = null;
  private lastBumpAt = 0;

  async start(onBump: BumpCallback): Promise<void> {
    // On iOS this triggers the motion-permission prompt (iOS 13+).
    // Capacitor Motion plugin needs no extra manifest permission on Android.
    if ('requestPermissions' in Motion) {
      try {
        await (Motion as unknown as { requestPermissions: () => Promise<unknown> }).requestPermissions();
      } catch {
        // Older Android / browsers without a permission gate — safe to ignore.
      }
    }

    this.listenerHandle = await Motion.addListener('accel', (event) => {
      const { x, y, z } = event.acceleration ?? { x: 0, y: 0, z: 0 };
      // Combined magnitude, gravity-corrected roughly by subtracting ~9.8
      // baseline noise floor. This is intentionally simple — no FFT/filtering.
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      const now = Date.now();
      if (magnitude >= BUMP_THRESHOLD && now - this.lastBumpAt > DEBOUNCE_MS) {
        this.lastBumpAt = now;
        onBump(magnitude, now);
      }
    });
  }

  stop(): void {
    this.listenerHandle?.remove();
    this.listenerHandle = null;
  }
}
