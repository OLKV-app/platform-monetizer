// A short, synthesized notification chime (no external audio file needed).
// Browsers refuse to play audio until the user has interacted with the page
// at least once, so `primeNotificationSound` should be wired up to the
// earliest possible user gesture (click/keydown/touch) to "warm up" the
// AudioContext ahead of the first real notification.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

export function primeNotificationSound() {
  const c = getContext();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export function playNotificationSound() {
  const c = getContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}
