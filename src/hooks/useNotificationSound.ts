import { useCallback, useRef, useEffect } from "react";

/**
 * Custom hook for playing notification sounds using Web Audio API
 * Generates pleasant notification sounds without external audio files
 */

type SoundType = "notification" | "message" | "success" | "warning" | "error";

// Audio context singleton to prevent multiple contexts
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Resume audio context on user interaction (required by browsers)
function ensureAudioContextResumed() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

/**
 * Play a pleasant notification chime sound
 * Two-tone ascending chime (like iOS notification)
 */
function playNotificationSound(ctx: AudioContext, volume: number = 0.3) {
  const now = ctx.currentTime;
  
  // First chime note - E5
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(659.25, now); // E5
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(volume, now + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.3);

  // Second chime note - G5 (higher, pleasant interval)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(783.99, now + 0.12); // G5
  gain2.gain.setValueAtTime(0, now + 0.12);
  gain2.gain.linearRampToValueAtTime(volume * 0.8, now + 0.14);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.12);
  osc2.stop(now + 0.5);

  // Soft harmonic overlay
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = "triangle";
  osc3.frequency.setValueAtTime(1318.51, now); // E6 harmonic
  gain3.gain.setValueAtTime(0, now);
  gain3.gain.linearRampToValueAtTime(volume * 0.15, now + 0.02);
  gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
  osc3.connect(gain3);
  gain3.connect(ctx.destination);
  osc3.start(now);
  osc3.stop(now + 0.25);
}

/**
 * Play a chat message received sound
 * Quick, soft pop sound (like WhatsApp/Telegram)
 */
function playMessageSound(ctx: AudioContext, volume: number = 0.25) {
  const now = ctx.currentTime;

  // Pop sound - quick frequency sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now); // A5
  osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.08); // D5
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);

  // Soft resonance
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(1174.66, now); // D6
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(volume * 0.3, now + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now);
  osc2.stop(now + 0.1);
}

/**
 * Play a success sound
 * Ascending three-tone chime (task complete feel)
 */
function playSuccessSound(ctx: AudioContext, volume: number = 0.25) {
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 (major chord)

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + i * 0.1;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume * (1 - i * 0.15), startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.35);
  });
}

/**
 * Play a warning sound
 * Two quick identical tones
 */
function playWarningSound(ctx: AudioContext, volume: number = 0.2) {
  const now = ctx.currentTime;

  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + i * 0.18;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(740, startTime); // F#5
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.12);
  }
}

/**
 * Play an error sound
 * Descending two-tone (alert feel)
 */
function playErrorSound(ctx: AudioContext, volume: number = 0.2) {
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "square";
  osc1.frequency.setValueAtTime(440, now); // A4
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(volume * 0.5, now + 0.01);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.15);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "square";
  osc2.frequency.setValueAtTime(349.23, now + 0.15); // F4
  gain2.gain.setValueAtTime(0, now + 0.15);
  gain2.gain.linearRampToValueAtTime(volume * 0.5, now + 0.16);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.15);
  osc2.stop(now + 0.35);
}

const soundPlayers: Record<SoundType, (ctx: AudioContext, vol: number) => void> = {
  notification: playNotificationSound,
  message: playMessageSound,
  success: playSuccessSound,
  warning: playWarningSound,
  error: playErrorSound,
};

export function useNotificationSound() {
  const lastPlayedRef = useRef<Record<string, number>>({});
  const isEnabledRef = useRef<boolean>(true);

  // Load sound preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("plantiq_sound_enabled");
    if (saved !== null) {
      isEnabledRef.current = saved === "true";
    }
  }, []);

  /**
   * Play a notification sound
   * @param type - Type of sound to play
   * @param debounceMs - Minimum interval between same sound type (prevents spam)
   */
  const playSound = useCallback((type: SoundType = "notification", debounceMs: number = 1000) => {
    if (!isEnabledRef.current) return;

    // Debounce: prevent same sound from playing too frequently
    const now = Date.now();
    const lastPlayed = lastPlayedRef.current[type] || 0;
    if (now - lastPlayed < debounceMs) return;
    lastPlayedRef.current[type] = now;

    try {
      const ctx = ensureAudioContextResumed();
      const player = soundPlayers[type];
      if (player) {
        player(ctx, 0.3);
      }
    } catch (error) {
      console.warn("Could not play notification sound:", error);
    }
  }, []);

  /**
   * Toggle sound on/off
   */
  const toggleSound = useCallback(() => {
    isEnabledRef.current = !isEnabledRef.current;
    localStorage.setItem("plantiq_sound_enabled", String(isEnabledRef.current));
    return isEnabledRef.current;
  }, []);

  /**
   * Check if sound is enabled
   */
  const isSoundEnabled = useCallback(() => {
    return isEnabledRef.current;
  }, []);

  /**
   * Set sound enabled/disabled
   */
  const setSoundEnabled = useCallback((enabled: boolean) => {
    isEnabledRef.current = enabled;
    localStorage.setItem("plantiq_sound_enabled", String(enabled));
  }, []);

  return {
    playSound,
    toggleSound,
    isSoundEnabled,
    setSoundEnabled,
  };
}

// Export standalone function for use outside React components
export function playNotificationSoundStandalone(type: SoundType = "notification") {
  const saved = localStorage.getItem("plantiq_sound_enabled");
  if (saved === "false") return;

  try {
    const ctx = ensureAudioContextResumed();
    const player = soundPlayers[type];
    if (player) {
      player(ctx, 0.3);
    }
  } catch (error) {
    console.warn("Could not play notification sound:", error);
  }
}
