import { ChordBeatSlot } from '../types/models';

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_TO_INDEX: Record<string, number> = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

/**
 * Transposes a single note or chord symbol (e.g. "Am", "F#m7", "G/B", "Eb") by `semitones` (-12..+12)
 */
export function transposeChord(chord: string, semitones: number): string {
  if (!chord || chord === '|' || semitones === 0) return chord;

  // Handle slash chords like "G/B" or "Am/G"
  if (chord.includes('/')) {
    const [main, bass] = chord.split('/');
    return `${transposeChord(main, semitones)}/${transposeChord(bass, semitones)}`;
  }

  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;

  const [, root, suffix] = match;
  const rootIndex = NOTE_TO_INDEX[root];
  if (rootIndex === undefined) return chord;

  const preferFlats = root.includes('b') || ['F', 'Dm', 'Gm', 'Cm', 'Fm', 'Bb', 'Eb', 'Ab'].includes(chord);
  const targetIndex = ((rootIndex + semitones) % 12 + 12) % 12;
  const scale = preferFlats ? FLAT_NOTES : SHARP_NOTES;
  return `${scale[targetIndex]}${suffix}`;
}

/**
 * Returns the frequency in Hz for a chord root note in octave 3 or 4, shifted by pitchSemitones
 */
export function getChordRootFrequency(chord: string, pitchSemitones: number = 0, octave: number = 3): number {
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  const root = match ? match[1] : 'A';
  const rootIdx = NOTE_TO_INDEX[root] ?? 9; // Default A
  // MIDI note: C3 = 48, A3 = 57 (220 Hz), A4 = 69 (440 Hz)
  const midi = (octave + 1) * 12 + rootIdx + pitchSemitones;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Returns the intervals (in semitones above root) for a chord symbol (minor, major, 7th, etc.)
 */
export function getChordIntervals(chord: string): number[] {
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  const suffix = match ? match[2] : '';
  const isMinor = suffix.startsWith('m') && !suffix.startsWith('maj');
  const isSeventh = suffix.includes('7');
  const isSus4 = suffix.includes('sus4');

  const third = isSus4 ? 5 : isMinor ? 3 : 4;
  const fifth = 7;
  if (isSeventh) {
    const seventh = suffix.includes('maj7') ? 11 : 10;
    return [0, third, fifth, seventh];
  }
  return [0, third, fifth, 12];
}

/**
 * Generates the beat-by-beat chord timeline for the synchronized ChordsView carousel.
 * In the APK's ChordsView (`view_chords.xml`), each bar has 4 beats:
 * Beat 1 displays the chord symbol (e.g. "Am"), Beats 2-4 display beat subdivision bars "|"
 */
export function generateChordTimeline(
  chordProgression: string[],
  originalBpm: number,
  durationSec: number,
  pitchSemitones: number = 0
): ChordBeatSlot[] {
  const safeBpm = Math.max(40, Math.min(240, originalBpm || 120));
  const secPerBeat = 60 / safeBpm;
  const totalBeats = Math.max(16, Math.ceil(durationSec / secPerBeat));
  const progression = chordProgression.length > 0 ? chordProgression : ['Am', 'F', 'C', 'G'];

  const slots: ChordBeatSlot[] = [];
  for (let i = 0; i < totalBeats; i++) {
    const bar = Math.floor(i / 4);
    const beatInBar = (i % 4) + 1;
    const rawChord = progression[bar % progression.length];
    const transposed = transposeChord(rawChord, pitchSemitones);

    slots.push({
      index: i,
      timeSec: i * secPerBeat,
      bar,
      beatInBar,
      baseChord: transposed,
    });
  }
  return slots;
}
