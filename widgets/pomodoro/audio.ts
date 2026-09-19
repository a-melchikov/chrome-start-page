import { POMODORO_CHIME_DATA_URI } from './chime-data-uri';

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContextClass();
  }

  return sharedAudioContext;
}

export async function playPomodoroChime(): Promise<void> {
  // 1. Primary: HTMLAudioElement with bundled PCM WAV Data URI.
  // Bypasses Chrome autoplay policy restrictions in offscreen documents with AUDIO_PLAYBACK.
  if (typeof Audio !== 'undefined') {
    try {
      const audio = new Audio(POMODORO_CHIME_DATA_URI);
      audio.volume = 1.0;
      await audio.play();
      return;
    } catch (error) {
      console.warn(
        'HTMLAudioElement chime playback failed, attempting Web Audio fallback:',
        error,
      );
    }
  }

  // 2. Fallback: Web Audio API synthesizer for environments where HTMLAudioElement is unavailable
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(587.33, now, 0.4);
    playTone(880, now + 0.18, 0.6);
  } catch (error) {
    console.warn('Pomodoro Web Audio fallback failed:', error);
  }
}
