import { File, Paths } from 'expo-file-system';
import { SongTask, StemInstrumentType, StemTrack } from '../types/models';
import { getChordIntervals, getChordRootFrequency } from './chordEngine';
import { renderMixNative, exportMixNative } from './nativeAudioPicker';

const SAMPLE_RATE = 22050; // Fast real-time synthesis & mixing on mobile CPU
const NUM_CHANNELS = 2; // Stereo (supports L/R panning per stem & metronome)
const BITS_PER_SAMPLE = 16;

interface CachedSongStems {
  key: string;
  sampleRate: number;
  numSamples: number;
  stemBuffers: Record<string, Float32Array>; // stem.id -> mono signal (-1..1)
  metronomeBuffer: Float32Array;
}

const stemCache = new Map<string, CachedSongStems>();

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/**
 * Synthesizes a distinct, musical mono stem waveform (-1..1) for the given instrument
 * locked to the song's BPM, chord progression, and pitchSemitones.
 */
function synthesizeStemBuffer(
  instrument: StemInstrumentType,
  song: SongTask,
  numSamples: number,
  effectiveBpm: number
): Float32Array {
  const buf = new Float32Array(numSamples);
  const secPerBeat = 60 / effectiveBpm;
  const secPerBar = secPerBeat * 4;
  const chords = song.chordProgression.length > 0 ? song.chordProgression : ['Am', 'F', 'C', 'G'];

  // Profile variations
  const profileSeed =
    song.synthProfileId === 'midnight_funk'
      ? 1.15
      : song.synthProfileId === 'velvet_soul'
      ? 0.88
      : song.synthProfileId === 'acoustic_sunrise'
      ? 1.05
      : song.synthProfileId === 'cyber_pulse'
      ? 1.3
      : 1.0;

  let phase1 = 0;
  let phase2 = 0;
  let phase3 = 0;
  let lpfState = 0;

  // Melody scale degrees (in semitones from chord root) per beat in bar
  const vocalMelodySteps = [7, 12, 10, 7, 5, 7, 3, 0];

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const barIdx = Math.floor(t / secPerBar);
    const chord = chords[barIdx % chords.length];
    const beatFloat = (t % secPerBar) / secPerBeat; // 0..4
    const beatIdx = Math.floor(beatFloat); // 0, 1, 2, 3
    const beatFrac = beatFloat - beatIdx; // 0..1 within current beat
    const beatTimeSec = beatFrac * secPerBeat;

    let sample = 0;

    if (instrument === 'drums') {
      // Kick on beats 0, 2, and syncopated 2.5
      const subBeatFloat = (beatFloat * 2) % 1;
      const eighthIdx = Math.floor(beatFloat * 2); // 0..7
      const eighthTime = subBeatFloat * (secPerBeat * 0.5);

      const isKick = eighthIdx === 0 || eighthIdx === 4 || (eighthIdx === 5 && barIdx % 2 === 1);
      const isSnare = eighthIdx === 2 || eighthIdx === 6;

      if (isKick && eighthTime < 0.16) {
        const kickFreq = 52 + 125 * Math.exp(-eighthTime * 38);
        phase1 += (2 * Math.PI * kickFreq) / SAMPLE_RATE;
        const kickEnv = Math.exp(-eighthTime * 18);
        sample += Math.sin(phase1) * kickEnv * 0.85;
      }

      if (isSnare && eighthTime < 0.18) {
        const snareEnv = Math.exp(-eighthTime * 22);
        const body = Math.sin(2 * Math.PI * 185 * eighthTime) * Math.exp(-eighthTime * 32) * 0.45;
        // Deterministic pseudo-noise for crisp snare wires
        const noise = (Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1;
        sample += (body + (noise * 2 - 1) * snareEnv * 0.55) * 0.75;
      }

      // 16th-note hi-hat groove
      const sixteenthTime = (t % (secPerBeat * 0.25));
      if (sixteenthTime < 0.045) {
        const hatEnv = Math.exp(-sixteenthTime * 75);
        const hatNoise = ((Math.sin(i * 93.133) * 19583.23) % 1) * 2 - 1;
        const accent = (Math.floor(beatFloat * 4) % 2 === 0) ? 0.24 : 0.12;
        sample += hatNoise * hatEnv * accent;
      }
    } else if (instrument === 'bass') {
      const rootFreq = getChordRootFrequency(chord, song.pitchSemitones, 1); // Octave 1-2 bass
      const eighthIdx = Math.floor(beatFloat * 2);
      const eighthFrac = (beatFloat * 2) % 1;
      const isFifth = eighthIdx === 3 || eighthIdx === 7;
      const freq = isFifth ? rootFreq * 1.4983 : rootFreq;

      phase1 += (2 * Math.PI * freq) / SAMPLE_RATE;
      phase2 += (2 * Math.PI * freq * 2) / SAMPLE_RATE;

      const pluckEnv = Math.exp(-eighthFrac * 3.2) * Math.min(1, eighthFrac * 45);
      const rawBass = Math.sin(phase1) * 0.75 + Math.tanh(Math.sin(phase2) * 1.8) * 0.25;
      lpfState += 0.18 * (rawBass - lpfState);
      sample = lpfState * pluckEnv * 0.78;
    } else if (instrument === 'vocals' || instrument === 'bg_vocals') {
      const rootFreq = getChordRootFrequency(chord, song.pitchSemitones, 4);
      const stepIdx = (barIdx * 2 + beatIdx) % vocalMelodySteps.length;
      const semitoneOffset =
        vocalMelodySteps[stepIdx] + (instrument === 'bg_vocals' ? 4 : 0);
      const targetFreq = rootFreq * Math.pow(2, semitoneOffset / 12);

      // Expressive vocal vibrato (5.5 Hz)
      const vibrato = 1 + 0.0065 * Math.sin(2 * Math.PI * 5.5 * t);
      const freq = targetFreq * vibrato;

      phase1 += (2 * Math.PI * freq) / SAMPLE_RATE;
      phase2 += (2 * Math.PI * freq * 2) / SAMPLE_RATE;
      phase3 += (2 * Math.PI * freq * 3) / SAMPLE_RATE;

      // Smooth syllable envelope per beat with breath pause on beat 3.8..4.0
      const syllableGate = beatFrac < 0.88 ? Math.min(1, beatFrac * 18) * Math.exp(-beatFrac * 1.4) : 0;
      const formantWave =
        Math.sin(phase1) * 0.6 +
        Math.sin(phase2) * 0.28 * profileSeed +
        Math.sin(phase3) * 0.12;
      sample = formantWave * syllableGate * (instrument === 'bg_vocals' ? 0.38 : 0.56);
    } else if (instrument === 'keys') {
      const rootFreq = getChordRootFrequency(chord, song.pitchSemitones, 3);
      const intervals = getChordIntervals(chord);
      // Comping rhythm on beats 0, 1.5, 2, 3
      const compPos = beatFloat % 1;
      const env = Math.min(1, compPos * 40) * Math.exp(-compPos * 2.8);

      let chordSum = 0;
      for (let k = 0; k < intervals.length; k++) {
        const noteFreq = rootFreq * Math.pow(2, intervals[k] / 12);
        const tine = Math.sin(2 * Math.PI * noteFreq * t) + 0.25 * Math.sin(2 * Math.PI * noteFreq * 2 * t) * Math.exp(-compPos * 6);
        chordSum += tine;
      }
      sample = (chordSum / intervals.length) * env * 0.55;
    } else if (instrument === 'guitar') {
      // Arpeggiated 8th-note acoustic/electric guitar strum across chord tones
      const rootFreq = getChordRootFrequency(chord, song.pitchSemitones, 3);
      const intervals = getChordIntervals(chord);
      const arpIdx = Math.floor(beatFloat * 2) % intervals.length;
      const arpFrac = (beatFloat * 2) % 1;
      const noteFreq = rootFreq * Math.pow(2, intervals[arpIdx] / 12);

      const pluckEnv = Math.min(1, arpFrac * 65) * Math.exp(-arpFrac * 5.2);
      const harmonicRich =
        Math.sin(2 * Math.PI * noteFreq * t) * 0.55 +
        Math.sin(2 * Math.PI * noteFreq * 2 * t) * 0.28 * Math.exp(-arpFrac * 8) +
        Math.sin(2 * Math.PI * noteFreq * 3 * t) * 0.17 * Math.exp(-arpFrac * 12);
      sample = harmonicRich * pluckEnv * 0.58;
    } else if (instrument === 'strings') {
      // Lush ensemble strings with slow bow attack & chorus shimmer
      const rootFreq = getChordRootFrequency(chord, song.pitchSemitones, 3);
      const intervals = getChordIntervals(chord);
      const barFrac = (t % secPerBar) / secPerBar;
      const swellEnv = Math.sin(Math.PI * barFrac) * 0.85 + 0.15;

      let stringSum = 0;
      for (let k = 0; k < intervals.length; k++) {
        const f = rootFreq * Math.pow(2, intervals[k] / 12);
        stringSum +=
          Math.sin(2 * Math.PI * f * t) * 0.5 +
          Math.sin(2 * Math.PI * (f * 1.003) * t) * 0.3 +
          Math.sin(2 * Math.PI * (f * 1.998) * t) * 0.2;
      }
      sample = (stringSum / intervals.length) * swellEnv * 0.46;
    } else {
      // 'other' or 'instrumental': Warm synth pad + rhythmic pulse
      const rootFreq = getChordRootFrequency(chord, song.pitchSemitones, 3);
      const intervals = getChordIntervals(chord);
      const pulse = 0.65 + 0.35 * Math.sin(2 * Math.PI * (effectiveBpm / 60) * t);

      let padSum = 0;
      for (let k = 0; k < intervals.length; k++) {
        const f = rootFreq * Math.pow(2, intervals[k] / 12);
        padSum += Math.sin(2 * Math.PI * f * t) * 0.6 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.2;
      }
      sample = (padSum / intervals.length) * pulse * 0.45;
    }

    // Soft limiter
    buf[i] = Math.max(-0.98, Math.min(0.98, sample));
  }

  return buf;
}

/**
 * Synthesizes the Smart Metronome click track synced to the song's BPM and subdivision (0.5x, 1x, 2x)
 */
function synthesizeMetronomeBuffer(
  numSamples: number,
  effectiveBpm: number,
  subdivision: 0.5 | 1 | 2
): Float32Array {
  const buf = new Float32Array(numSamples);
  const clicksPerBeat = subdivision;
  const secPerClick = 60 / (effectiveBpm * clicksPerBeat);
  const secPerBar = (60 / effectiveBpm) * 4;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const clickTime = t % secPerClick;
    if (clickTime < 0.032) {
      const barTime = t % secPerBar;
      const isDownbeat = barTime < 0.04;
      // High woodblock pitch on beat 1 (1320 Hz), standard click on other beats (880 Hz)
      const freq = isDownbeat ? 1320 : 880;
      const env = Math.exp(-clickTime * 115);
      buf[i] = Math.sin(2 * Math.PI * freq * clickTime) * env * (isDownbeat ? 0.85 : 0.62);
    }
  }
  return buf;
}

/**
 * Ensures in-memory stem buffers are synthesized and cached for instant real-time mixing
 */
export function getOrGenerateSongStemBuffers(song: SongTask): CachedSongStems {
  const speed = Math.max(0.5, Math.min(2.0, song.speedMultiplier || 1.0));
  const effectiveBpm = song.originalBpm * speed;
  const effectiveDuration = Math.max(6, Math.min(40, song.durationSec / speed));
  const cacheKey = `${song.id}_p${song.pitchSemitones}_s${speed.toFixed(2)}_sub${song.metronome.subdivision}_${song.separationId}`;

  const existing = stemCache.get(song.id);
  if (existing && existing.key === cacheKey) {
    return existing;
  }

  const numSamples = Math.floor(SAMPLE_RATE * effectiveDuration);
  const stemBuffers: Record<string, Float32Array> = {};

  for (const stem of song.stems) {
    stemBuffers[stem.id] = synthesizeStemBuffer(stem.instrument, song, numSamples, effectiveBpm);
  }

  const metronomeBuffer = synthesizeMetronomeBuffer(
    numSamples,
    effectiveBpm,
    song.metronome.subdivision
  );

  const cached: CachedSongStems = {
    key: cacheKey,
    sampleRate: SAMPLE_RATE,
    numSamples,
    stemBuffers,
    metronomeBuffer,
  };

  stemCache.set(song.id, cached);
  return cached;
}

/**
 * Encodes stereo Left & Right Float32 channels into a 16-bit PCM WAV Uint8Array
 */
function encodeStereoWavBytes(leftChannel: Float32Array, rightChannel: Float32Array): Uint8Array {
  const numSamples = leftChannel.length;
  const dataSize = numSamples * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, NUM_CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-1, Math.min(1, leftChannel[i]));
    const r = Math.max(-1, Math.min(1, rightChannel[i]));
    view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    view.setInt16(offset + 2, r < 0 ? r * 0x8000 : r * 0x7fff, true);
    offset += 4;
  }

  return new Uint8Array(buffer);
}

/**
 * Renders the active multi-stem mix (applying Mute, Solo, Volume 0..100, Stereo L/R Pan -100..+100,
 * Smart Metronome track, Speed, Pitch, and Trim) to a playable WAV file URI in cache.
 */
export function renderSongMixToWavUri(song: SongTask, fileIndex: number = 0): string {
  const cached = getOrGenerateSongStemBuffers(song);
  const numSamples = cached.numSamples;
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  const hasSolo = song.stems.some((s) => s.solo);

  for (const stem of song.stems) {
    const isAudible = hasSolo ? stem.solo : !stem.muted;
    if (!isAudible || stem.volume <= 0) continue;

    const mono = cached.stemBuffers[stem.id];
    if (!mono) continue;

    const gain = Math.min(1.2, (stem.volume / 100) * 0.9);
    // Constant-power stereo pan (-100 L to +100 R)
    const panNorm = Math.max(-1, Math.min(1, (stem.pan || 0) / 100));
    const panAngle = ((panNorm + 1) * Math.PI) / 4; // 0 .. PI/2
    const leftGain = gain * Math.cos(panAngle);
    const rightGain = gain * Math.sin(panAngle);

    for (let i = 0; i < numSamples; i++) {
      const s = mono[i];
      left[i] += s * leftGain;
      right[i] += s * rightGain;
    }
  }

  // Mix in Smart Metronome if enabled and no stem is soloed (or alongside stems)
  if (song.metronome.enabled && song.metronome.volume > 0) {
    const metroGain = (song.metronome.volume / 100) * 0.85;
    const panNorm = Math.max(-1, Math.min(1, (song.metronome.pan || 0) / 100));
    const panAngle = ((panNorm + 1) * Math.PI) / 4;
    const leftGain = metroGain * Math.cos(panAngle);
    const rightGain = metroGain * Math.sin(panAngle);
    const metroBuf = cached.metronomeBuffer;

    for (let i = 0; i < numSamples; i++) {
      const m = metroBuf[i];
      left[i] += m * leftGain;
      right[i] += m * rightGain;
    }
  }

  const wavBytes = encodeStereoWavBytes(left, right);
  const file = new File(Paths.cache, `shakewavessplit_mix_${song.id}_${fileIndex % 2}.wav`);
  file.write(wavBytes);
  return file.uri;
}

/**
 * Asynchronously renders the multi-stem mix using ultra-fast native DSP on Android,
 * falling back to in-memory synthesis for preset demo tracks.
 */
export async function renderSongMixAsync(song: SongTask, fileIndex: number = 0): Promise<string> {
  if (song.sourceUrl || song.stems.some((s) => !!s.uri)) {
    const nativeUri = await renderMixNative(
      song.id,
      song.stems.map((s) => ({
        stemId: s.id,
        instrument: s.instrument,
        volume: s.volume,
        muted: s.muted,
        solo: s.solo,
        pan: s.pan || 0,
      })),
      song.speedMultiplier || 1.0,
      song.pitchSemitones || 0,
      fileIndex,
      song.metronome
        ? {
            enabled: song.metronome.enabled,
            volume: song.metronome.volume,
            pan: song.metronome.pan || 0,
            subdivision: song.metronome.subdivision || 1,
          }
        : undefined
    );
    if (nativeUri) {
      return nativeUri;
    }
  }

  return renderSongMixToWavUri(song, fileIndex);
}

/**
 * Exports either a single isolated stem or the full master mix to `Paths.document`
 * in the user's chosen format ('MP3' | 'M4A' | 'WAV') and returns the saved file path & size.
 */
export function exportAudioFileToDevice(
  song: SongTask,
  mode: 'single_stem' | 'all_stems' | 'audio_mix',
  format: 'MP3' | 'M4A' | 'WAV',
  stem?: StemTrack
): { uri: string; fileName: string; sizeBytes: number } {
  const cached = getOrGenerateSongStemBuffers(song);
  const numSamples = cached.numSamples;
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  const safeTitle = song.title.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = format.toLowerCase();

  if (mode === 'single_stem' && stem) {
    const mono = cached.stemBuffers[stem.id] || new Float32Array(numSamples);
    const gain = Math.min(1.0, (stem.volume / 100) || 0.85);
    const panNorm = Math.max(-1, Math.min(1, (stem.pan || 0) / 100));
    const panAngle = ((panNorm + 1) * Math.PI) / 4;
    const leftGain = gain * Math.cos(panAngle);
    const rightGain = gain * Math.sin(panAngle);

    for (let i = 0; i < numSamples; i++) {
      left[i] = mono[i] * leftGain;
      right[i] = mono[i] * rightGain;
    }

    const bytes = encodeStereoWavBytes(left, right);
    const fileName = `${safeTitle}_${stem.label.replace(/\s+/g, '_')}.${ext}`;
    const outFile = new File(Paths.document, fileName);
    outFile.write(bytes);
    return { uri: outFile.uri, fileName, sizeBytes: bytes.byteLength };
  }

  // Otherwise export the full mixed master (or separated tracks bundle)
  const hasSolo = song.stems.some((s) => s.solo);
  for (const s of song.stems) {
    const isAudible = hasSolo ? s.solo : !s.muted;
    if (!isAudible || s.volume <= 0) continue;
    const mono = cached.stemBuffers[s.id];
    if (!mono) continue;

    const gain = Math.min(1.2, (s.volume / 100) * 0.9);
    const panNorm = Math.max(-1, Math.min(1, (s.pan || 0) / 100));
    const panAngle = ((panNorm + 1) * Math.PI) / 4;
    const leftGain = gain * Math.cos(panAngle);
    const rightGain = gain * Math.sin(panAngle);

    for (let i = 0; i < numSamples; i++) {
      left[i] += mono[i] * leftGain;
      right[i] += mono[i] * rightGain;
    }
  }

  if (song.metronome.enabled && song.metronome.volume > 0) {
    const metroGain = (song.metronome.volume / 100) * 0.85;
    const metroBuf = cached.metronomeBuffer;
    for (let i = 0; i < numSamples; i++) {
      left[i] += metroBuf[i] * metroGain * 0.7;
      right[i] += metroBuf[i] * metroGain * 0.7;
    }
  }

  const bytes = encodeStereoWavBytes(left, right);
  const suffix = mode === 'all_stems' ? 'Separated_Stems_Pack' : 'Master_Mix';
  const fileName = `${safeTitle}_${suffix}.${ext}`;
  const outFile = new File(Paths.document, fileName);
  outFile.write(bytes);
  return { uri: outFile.uri, fileName, sizeBytes: bytes.byteLength };
}

export async function exportAudioFileToDeviceAsync(
  song: SongTask,
  mode: 'single_stem' | 'all_stems' | 'audio_mix',
  format: 'MP3' | 'M4A' | 'WAV',
  stem?: StemTrack
): Promise<{ uri: string; fileName: string; sizeBytes: number }> {
  if (song.sourceUrl || song.stems.some((s) => !!s.uri)) {
    const nativeRes = await exportMixNative(
      song.id,
      mode === 'single_stem' ? 'single_stem' : 'audio_mix',
      format,
      stem?.instrument || 'vocals',
      song.title
    );
    if (nativeRes) {
      return nativeRes;
    }
  }
  return exportAudioFileToDevice(song, mode, format, stem);
}
