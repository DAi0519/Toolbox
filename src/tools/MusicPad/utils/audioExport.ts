import { Mp3Encoder } from '@breezystack/lamejs';
import { playNote, type InstrumentType } from './synthesizer';

export async function exportToMp3(
  activeCells: Set<number>,
  tempo: number,
  instrument: InstrumentType = 'marimba',
  loops = 4,
  gridSize = 12,
  frequencies: number[] = [],
): Promise<Blob> {
  const secondsPerStep = (60 / tempo) / 4;
  const totalDuration = secondsPerStep * gridSize * loops;
  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(1, sampleRate * totalDuration, sampleRate);

  const maxVoices = gridSize === 24 ? 5 : 12;
  const noteDuration = gridSize === 24 ? 0.18 : 0.5;

  for (let loop = 0; loop < loops; loop += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const stepTime = (loop * gridSize + col) * secondsPerStep;
      const activeRows: number[] = [];

      for (let row = 0; row < gridSize; row += 1) {
        const index = row * gridSize + col;
        if (activeCells.has(index) && row < frequencies.length) {
          activeRows.push(row);
        }
      }

      let selectedRows = activeRows;
      if (activeRows.length > maxVoices) {
        selectedRows = [];
        for (let voice = 0; voice < maxVoices; voice += 1) {
          const rowIndex = Math.round((voice * (activeRows.length - 1)) / (maxVoices - 1));
          selectedRows.push(activeRows[rowIndex]);
        }
      }

      const voiceCount = selectedRows.length;
      const baseVolume = gridSize === 24 ? 0.45 : 1;
      const volume = voiceCount > 1 ? baseVolume * Math.min(1, 2.5 / voiceCount) : baseVolume;

      for (const row of selectedRows) {
        playNote(offlineCtx, instrument, frequencies[row], stepTime, noteDuration, volume);
      }
    }
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const float32Data = renderedBuffer.getChannelData(0);
  const int16Data = new Int16Array(float32Data.length);

  for (let index = 0; index < float32Data.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, float32Data[index]));
    int16Data[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  const encoder = new Mp3Encoder(1, sampleRate, 128);
  const chunks: BlobPart[] = [];
  const sampleBlockSize = 1152;

  const toArrayBuffer = (view: Uint8Array): ArrayBuffer => {
    const copy = new Uint8Array(view.byteLength);
    copy.set(view);
    return copy.buffer;
  };

  for (let index = 0; index < int16Data.length; index += sampleBlockSize) {
    const chunk = int16Data.subarray(index, index + sampleBlockSize);
    const buffer = encoder.encodeBuffer(chunk);
    if (buffer.length > 0) {
      chunks.push(toArrayBuffer(buffer));
    }
  }

  const tail = encoder.flush();
  if (tail.length > 0) {
    chunks.push(toArrayBuffer(tail));
  }

  return new Blob(chunks, { type: 'audio/mp3' });
}
