/**
 * Notification sounds using the Web Audio API.
 * No external audio files required — all tones are synthesized.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function createTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine"
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Play a notification sound based on alert type.
 *
 * - emergency: Rapid double-beep at 880 Hz (urgent)
 * - military:  Low two-tone at 220 Hz / 330 Hz
 * - alert:     Rising chime 440 Hz -> 660 Hz
 * - info:      Soft single ping at 440 Hz
 */
export function playAlertSound(
  type: "emergency" | "military" | "alert" | "info"
): void {
  try {
    const ctx = getAudioContext();

    // Resume if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    switch (type) {
      case "emergency": {
        // Rapid double-beep at 880 Hz
        createTone(ctx, 880, now, 0.12, 0.3, "square");
        createTone(ctx, 880, now + 0.18, 0.12, 0.3, "square");
        break;
      }
      case "military": {
        // Low two-tone: 220 Hz then 330 Hz
        createTone(ctx, 220, now, 0.2, 0.2, "sawtooth");
        createTone(ctx, 330, now + 0.25, 0.2, 0.2, "sawtooth");
        break;
      }
      case "alert": {
        // Rising chime: 440 Hz -> 660 Hz
        createTone(ctx, 440, now, 0.15, 0.15, "sine");
        createTone(ctx, 660, now + 0.18, 0.2, 0.15, "sine");
        break;
      }
      case "info": {
        // Soft single ping at 440 Hz
        createTone(ctx, 440, now, 0.25, 0.1, "sine");
        break;
      }
    }
  } catch {
    // Silently ignore — audio may not be available
  }
}
