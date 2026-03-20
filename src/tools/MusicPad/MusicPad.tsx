import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEventHandler } from 'react';
import { exportToMp3 } from './utils/audioExport';
import { mapImageToGrid } from './utils/imageToGrid';
import { playNote, type InstrumentType } from './utils/synthesizer';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const GRID_OPTIONS = [12, 24] as const;
type GridSizeOption = (typeof GRID_OPTIONS)[number];

const GRID_COL_CLASSES: Record<GridSizeOption, string> = {
  12: 'grid-cols-12',
  24: 'grid-cols-[repeat(24,1fr)]',
};

const INSTRUMENTS: InstrumentType[] = ['marimba', 'piano', 'guitar'];
const ACCENT = '#cf3a17';

type DrawMode = 'add' | 'remove' | null;

function generateFrequencies(rows: number): number[] {
  const pentatonicSemitones = [0, 2, 4, 7, 9];
  const allNotes: number[] = [];

  for (let octave = 2; octave <= 6; octave += 1) {
    for (const semitone of pentatonicSemitones) {
      const midiNote = (octave + 1) * 12 + semitone;
      const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
      if (frequency >= 65 && frequency <= 1400) {
        allNotes.push(frequency);
      }
    }
  }

  const unique = [...new Set(allNotes)].sort((left, right) => left - right);
  const selected: number[] = [];

  for (let index = 0; index < rows; index += 1) {
    const noteIndex = Math.round((index / (rows - 1)) * (unique.length - 1));
    selected.push(unique[noteIndex]);
  }

  return selected.reverse();
}

export default function MusicPad() {
  const [gridSize, setGridSize] = useState<GridSizeOption>(12);
  const [activeCells, setActiveCells] = useState<Set<number>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [instrument, setInstrument] = useState<InstrumentType>('marimba');
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const totalCells = gridSize * gridSize;
  const frequencies = useMemo(() => generateFrequencies(gridSize), [gridSize]);

  const activeCellsRef = useRef(activeCells);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stepRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const drawModeRef = useRef<DrawMode>(null);

  useEffect(() => {
    activeCellsRef.current = activeCells;
  }, [activeCells]);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('This browser does not support Web Audio.');
      }
      audioCtxRef.current = new AudioContextClass();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback(
    (frequency: number, volume = 1, duration = 0.5) => {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      playNote(ctx, instrument, frequency, ctx.currentTime, duration, volume);
    },
    [getAudioCtx, instrument],
  );

  const step = useCallback(() => {
    const current = stepRef.current;
    const nextCells = activeCellsRef.current;
    setCurrentStep(current);

    const activeRows: number[] = [];
    for (let row = 0; row < gridSize; row += 1) {
      const index = row * gridSize + current;
      if (nextCells.has(index) && row < frequencies.length) {
        activeRows.push(row);
      }
    }

    const maxVoices = gridSize === 24 ? 5 : 12;
    let selectedRows = activeRows;
    if (activeRows.length > maxVoices) {
      selectedRows = [];
      for (let voice = 0; voice < maxVoices; voice += 1) {
        const rowIndex = Math.round((voice * (activeRows.length - 1)) / (maxVoices - 1));
        selectedRows.push(activeRows[rowIndex]);
      }
    }

    const noteDuration = gridSize === 24 ? 0.18 : 0.5;
    const voiceCount = selectedRows.length;
    const baseVolume = gridSize === 24 ? 0.45 : 1;
    const volume = voiceCount > 1 ? baseVolume * Math.min(1, 2.5 / voiceCount) : baseVolume;

    for (const row of selectedRows) {
      playTone(frequencies[row], volume, noteDuration);
    }

    stepRef.current = (current + 1) % gridSize;
  }, [frequencies, gridSize, playTone]);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCurrentStep(null);
      stepRef.current = 0;
      return;
    }

    void getAudioCtx().resume();
    const interval = (60 / tempo / 4) * 1000;
    timerRef.current = window.setInterval(step, interval);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [getAudioCtx, isPlaying, step, tempo]);

  useEffect(() => {
    const handlePointerUp = () => {
      drawModeRef.current = null;
    };

    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
      }
    };
  }, []);

  const applyCellState = useCallback((index: number, mode: Exclude<DrawMode, null>) => {
    setActiveCells((prev) => {
      const next = new Set(prev);
      if (mode === 'add') {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  }, []);

  const handleCellPointerDown = useCallback(
    (index: number) => {
      const mode: Exclude<DrawMode, null> = activeCellsRef.current.has(index) ? 'remove' : 'add';
      drawModeRef.current = mode;
      applyCellState(index, mode);
    },
    [applyCellState],
  );

  const handleCellPointerEnter = useCallback(
    (index: number) => {
      const mode = drawModeRef.current;
      if (!mode) return;
      applyCellState(index, mode);
    },
    [applyCellState],
  );

  const resetTransport = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(null);
    stepRef.current = 0;
  }, []);

  const handleClear = useCallback(() => {
    setActiveCells(new Set());
    resetTransport();
  }, [resetTransport]);

  const cycleInstrument = useCallback(() => {
    setInstrument((current) => {
      const index = INSTRUMENTS.indexOf(current);
      return INSTRUMENTS[(index + 1) % INSTRUMENTS.length];
    });
  }, []);

  const cycleGridSize = useCallback(() => {
    setGridSize((current) => {
      const index = GRID_OPTIONS.indexOf(current);
      return GRID_OPTIONS[(index + 1) % GRID_OPTIONS.length];
    });
    setActiveCells(new Set());
    resetTransport();
  }, [resetTransport]);

  const handleDownload = useCallback(async () => {
    if (activeCellsRef.current.size === 0) return;

    setIsExporting(true);
    try {
      const blob = await exportToMp3(activeCellsRef.current, tempo, instrument, 4, gridSize, frequencies);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `sonic-canvas-${Date.now()}.mp3`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Music Pad export failed:', error);
      window.alert(`MP3 export failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExporting(false);
    }
  }, [frequencies, gridSize, instrument, tempo]);

  const handleImageUpload: ChangeEventHandler<HTMLInputElement> = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const imageGridSize: GridSizeOption = 24;
        const mappedCells = await mapImageToGrid(file, imageGridSize);
        setGridSize(imageGridSize);
        setActiveCells(mappedCells);
        resetTransport();
      } catch (error) {
        console.error('Music Pad image parsing failed:', error);
        window.alert(`Image parsing failed: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsImporting(false);
        event.target.value = '';
      }
    },
    [resetTransport],
  );

  return (
    <div
      className="flex h-full overflow-y-auto bg-[#e5e5e5] px-3 py-3 font-sans text-black sm:px-4 sm:py-4"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}
      onPointerLeave={() => {
        drawModeRef.current = null;
      }}
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      <div className="mx-auto my-auto w-full max-w-[520px] border-4 border-black bg-[#f2f2f2]">
        <div className="flex items-end justify-between border-b-4 border-black bg-[#f2f2f2] p-4 sm:p-6">
          <h1 className="text-[2.5rem] font-black uppercase leading-[0.82] tracking-tighter sm:text-5xl md:text-6xl">
            Sonic
            <br />
            Canvas
          </h1>
        </div>

        <div className="grid grid-cols-2 border-b-4 border-black bg-white">
          <div className="border-r-4 border-black p-3">
            <div className="mb-1 text-[10px] font-bold uppercase text-gray-500">Project</div>
            <div className="text-sm font-black uppercase tracking-tight">Music Pad 2026</div>
          </div>
          <div className="flex flex-col justify-center p-3">
            <div className="mb-1 text-[10px] font-bold uppercase text-gray-500">Status</div>
            <div className="flex items-center gap-2 text-sm font-black uppercase">
              <span
                className={`h-2 w-2 rounded-full border border-black ${isPlaying ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: isPlaying ? ACCENT : '#000000' }}
              />
              {isPlaying ? 'Live' : 'Ready'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center border-b-4 border-black bg-white p-3 sm:p-4 md:p-6">
          <div className="relative aspect-square w-full max-w-[420px] border-2 border-black bg-[#f2f2f2] p-1">
            <div
              className={`grid h-full w-full select-none gap-px touch-none ${GRID_COL_CLASSES[gridSize]}`}
              style={{ gridTemplateRows: `repeat(${gridSize}, 1fr)` }}
            >
              {Array.from({ length: totalCells }).map((_, index) => {
                const isActive = activeCells.has(index);
                const column = index % gridSize;
                const isPlayingColumn = currentStep === column;

                return (
                  <div
                    key={index}
                    className={`cursor-crosshair border border-gray-200 transition-colors duration-75 ${
                      isActive ? 'bg-black' : 'bg-white'
                    } ${isPlayingColumn ? 'z-10 ring-1 ring-inset ring-[#d43900]' : ''}`}
                    onPointerDown={() => handleCellPointerDown(index)}
                    onPointerEnter={() => handleCellPointerEnter(index)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[76px_1fr] grid-rows-[76px_auto] bg-[#f2f2f2] min-[360px]:grid-cols-[88px_1fr] sm:h-28 sm:grid-cols-[auto_1fr] sm:grid-rows-[1fr_1fr]">
          <button
            type="button"
            aria-label={isPlaying ? 'Stop playback' : 'Start playback'}
            onClick={() => setIsPlaying((value) => !value)}
            className={`flex h-full items-center justify-center border-r-4 border-b-4 border-black transition-all sm:row-span-2 sm:border-b-0 sm:aspect-square ${
              isPlaying ? 'bg-white text-black hover:bg-gray-100' : 'text-white'
            }`}
            style={{ backgroundColor: isPlaying ? '#ffffff' : ACCENT }}
          >
            {isPlaying ? (
              <svg className="h-12 w-12 sm:h-16 sm:w-16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            ) : (
              <svg className="h-12 w-12 sm:h-16 sm:w-16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="flex flex-col justify-center border-b-4 border-black p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-tight">Tempo Control</span>
              <span className="text-xs font-black">{tempo} BPM</span>
            </div>
            <input
              type="range"
              min="60"
              max="240"
              value={tempo}
              onChange={(event) => setTempo(Number(event.target.value))}
              className="h-3 w-full appearance-none border border-black bg-gray-300 outline-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-black"
            />
          </div>

          <div className="col-span-2 grid grid-cols-2 sm:col-span-1 sm:grid-cols-5">
            <button
              type="button"
              onClick={handleClear}
              className="group flex min-h-[52px] items-center justify-between border-r-4 border-b-4 border-black px-3 py-2 text-left text-[10px] font-black uppercase transition-colors hover:bg-black hover:text-white sm:min-h-0 sm:border-b-0"
            >
              <span className="tracking-tight">Reset</span>
              <span className="transition-transform group-hover:rotate-180">↺</span>
            </button>

            <button
              type="button"
              onClick={cycleInstrument}
              className="group flex min-h-[52px] items-center justify-between border-b-4 border-black px-3 py-2 text-left text-[10px] font-black uppercase transition-colors hover:bg-black hover:text-white sm:min-h-0 sm:border-r-4 sm:border-b-0"
            >
              <span className="tracking-tight">{instrument}</span>
              <span className="transition-transform group-hover:scale-110">♪</span>
            </button>

            <button
              type="button"
              onClick={cycleGridSize}
              className="group flex min-h-[52px] items-center justify-between border-r-4 border-b-4 border-black px-3 py-2 text-left text-[10px] font-black uppercase transition-colors hover:bg-black hover:text-white sm:min-h-0 sm:border-b-0"
            >
              <span className="tracking-tight">
                {gridSize}x{gridSize}
              </span>
              <span className="transition-transform group-hover:scale-110">⊞</span>
            </button>

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isImporting}
              className="group flex min-h-[52px] items-center justify-between border-b-4 border-black px-3 py-2 text-left text-[10px] font-black uppercase transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:border-r-4 sm:border-b-0"
            >
              <span className="tracking-tight">{isImporting ? '...' : 'Image'}</span>
              <span className="transition-transform group-hover:scale-110">⌂</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting || activeCells.size === 0}
              className="group col-span-2 flex min-h-[52px] items-center justify-between px-3 py-2 text-left text-[10px] font-black uppercase transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1 sm:min-h-0"
            >
              <span className="tracking-tight">{isExporting ? '...' : 'MP3'}</span>
              <span className="transition-transform group-hover:translate-y-1">↓</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
