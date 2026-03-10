export type InstrumentType = 'piano' | 'marimba' | 'guitar';

export function playNote(
  ctx: BaseAudioContext,
  instrument: InstrumentType,
  frequency: number,
  startTime: number,
  duration: number,
  volume = 1,
) {
  const time = startTime;
  const safeVolume = Math.max(0, Math.min(1, volume));
  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  switch (instrument) {
    case 'piano': {
      const carrier = ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.value = frequency;

      const modulator = ctx.createOscillator();
      modulator.type = 'sine';
      modulator.frequency.value = frequency * 4;

      const modGain = ctx.createGain();
      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(gain);

      modGain.gain.setValueAtTime(frequency * 0.5, time);
      modGain.gain.exponentialRampToValueAtTime(0.01, time + Math.min(0.4, duration));

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.3 * safeVolume, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, time + duration + 0.1);

      carrier.start(time);
      carrier.stop(time + duration + 0.1);
      modulator.start(time);
      modulator.stop(time + duration + 0.1);
      return;
    }

    case 'marimba': {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);

      const decayTime = Math.min(0.3, duration);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.4 * safeVolume, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, time + decayTime);

      oscillator.start(time);
      oscillator.stop(time + decayTime);
      return;
    }

    case 'guitar': {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.frequency.value = frequency;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 1;

      oscillator.connect(filter);
      filter.connect(gain);

      filter.frequency.setValueAtTime(3000, time);
      filter.frequency.exponentialRampToValueAtTime(100, time + Math.min(0.2, duration));

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.2 * safeVolume, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

      oscillator.start(time);
      oscillator.stop(time + duration);
      return;
    }
  }
}
