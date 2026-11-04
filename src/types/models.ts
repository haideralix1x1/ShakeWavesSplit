export type SeparationPresetId =
  | '2_vocals_instrumental'
  | '2_guitar_other'
  | '3_vocals_bg_instrumental'
  | '4_vocals_drums_bass_other'
  | '5_vocals_drums_bass_piano_other'
  | '5_vocals_drums_bass_guitar_other'
  | '5_vocals_drums_bass_strings_other';

export type StemInstrumentType =
  | 'vocals'
  | 'bg_vocals'
  | 'instrumental'
  | 'drums'
  | 'bass'
  | 'keys'
  | 'guitar'
  | 'strings'
  | 'other';

export type SkillInstrumentId =
  | 'vocals'
  | 'guitar'
  | 'drums'
  | 'bass'
  | 'keys'
  | 'strings'
  | 'ukulele'
  | 'woodwind_or_brass'
  | 'beat_machine'
  | 'audio_editor'
  | 'turntable'
  | 'other';

export interface SeparationPreset {
  id: SeparationPresetId;
  trackCount: 2 | 3 | 4 | 5;
  title: string;
  subtitle: string;
  stems: {
    instrument: StemInstrumentType;
    label: string;
  }[];
  isNewGen?: boolean;
}

export interface StemTrack {
  id: string;
  instrument: StemInstrumentType;
  label: string;
  volume: number; // 0 to 100
  muted: boolean;
  solo: boolean;
  pan: number; // -100 (L) to +100 (R)
  uri?: string;
}

export interface MetronomeSettings {
  enabled: boolean;
  volume: number; // 0 to 100
  pan: number; // -100 to +100
  subdivision: 0.5 | 1 | 2;
  countIn: 0 | 1 | 2 | 4; // 0 = Off, 1, 2, 4 bars
}

export interface ChordBeatSlot {
  index: number;
  timeSec: number;
  bar: number;
  beatInBar: number; // 1..4
  baseChord: string; // e.g., 'Am', 'F', 'C', 'G', or '' for beat subdivision bar
}

export interface SongTask {
  id: string;
  title: string;
  artist: string;
  separationId: SeparationPresetId;
  separationLabel: string;
  durationSec: number;
  originalBpm: number;
  originalKey: string;
  speedMultiplier: number; // 0.5 to 2.0
  pitchSemitones: number; // -12 to +12
  trimStartSec: number;
  trimEndSec: number;
  displayChords: boolean;
  playOnRepeat: boolean;
  status: 'available' | 'processing' | 'queued' | 'offloaded';
  progress?: number;
  createdAt: string;
  stems: StemTrack[];
  metronome: MetronomeSettings;
  chordProgression: string[]; // Base chords per bar (4 beats each)
  synthProfileId: 'neon_horizon' | 'midnight_funk' | 'velvet_soul' | 'acoustic_sunrise' | 'cyber_pulse' | 'custom_import';
  sourceUrl?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  songIds: string[];
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  authMethod: 'Google' | 'Facebook' | 'Email' | 'Studio Pass';
  isLoggedIn: boolean;
  isPremium: boolean;
  skills: SkillInstrumentId[];
  skillLevel: 'Beginner' | 'Intermediate' | 'Pro';
  goals: string[];
  defaultSeparation: SeparationPresetId | 'always_ask';
  autoDownload: boolean;
  autoplaySong: boolean;
  defaultDisplayChords: boolean;
  defaultPlayOnRepeat: boolean;
  smartCacheLimitGb: number;
  notifyActivity: boolean;
  notifyMarketing: boolean;
  hasCompletedOnboarding: boolean;
}

export const SEPARATION_PRESETS: SeparationPreset[] = [
  {
    id: '4_vocals_drums_bass_other',
    trackCount: 4,
    title: 'Vocals, Drums, Bass, Other',
    subtitle: '4 tracks • High-definition stem isolation',
    stems: [
      { instrument: 'vocals', label: 'Vocals' },
      { instrument: 'drums', label: 'Drums' },
      { instrument: 'bass', label: 'Bass' },
      { instrument: 'other', label: 'Other' },
    ],
  },
  {
    id: '2_vocals_instrumental',
    trackCount: 2,
    title: 'Vocals, Instrumental',
    subtitle: '2 tracks • Karaoke & Acapella',
    stems: [
      { instrument: 'vocals', label: 'Vocals' },
      { instrument: 'instrumental', label: 'Instrumental' },
    ],
  },
  {
    id: '5_vocals_drums_bass_piano_other',
    trackCount: 5,
    title: 'Vocals, Drums, Bass, Piano, Other',
    subtitle: '5 tracks • New Generation AI Algorithm (Unlocked)',
    isNewGen: true,
    stems: [
      { instrument: 'vocals', label: 'Vocals' },
      { instrument: 'drums', label: 'Drums' },
      { instrument: 'bass', label: 'Bass' },
      { instrument: 'keys', label: 'Piano' },
      { instrument: 'other', label: 'Other' },
    ],
  },
  {
    id: '5_vocals_drums_bass_guitar_other',
    trackCount: 5,
    title: 'Vocals, Drums, Bass, Guitar, Other',
    subtitle: '5 tracks • New Generation AI Algorithm (Unlocked)',
    isNewGen: true,
    stems: [
      { instrument: 'vocals', label: 'Vocals' },
      { instrument: 'drums', label: 'Drums' },
      { instrument: 'bass', label: 'Bass' },
      { instrument: 'guitar', label: 'Guitar' },
      { instrument: 'other', label: 'Other' },
    ],
  },
  {
    id: '5_vocals_drums_bass_strings_other',
    trackCount: 5,
    title: 'Vocals, Drums, Bass, Strings, Other',
    subtitle: '5 tracks • New Generation AI Algorithm (Unlocked)',
    isNewGen: true,
    stems: [
      { instrument: 'vocals', label: 'Vocals' },
      { instrument: 'drums', label: 'Drums' },
      { instrument: 'bass', label: 'Bass' },
      { instrument: 'strings', label: 'Strings' },
      { instrument: 'other', label: 'Other' },
    ],
  },
  {
    id: '3_vocals_bg_instrumental',
    trackCount: 3,
    title: 'Vocals, Background vocals, Instrumental',
    subtitle: '3 tracks • Lead & Harmony separation',
    isNewGen: true,
    stems: [
      { instrument: 'vocals', label: 'Vocals' },
      { instrument: 'bg_vocals', label: 'Background vocals' },
      { instrument: 'instrumental', label: 'Instrumental' },
    ],
  },
  {
    id: '2_guitar_other',
    trackCount: 2,
    title: 'Guitar, Other',
    subtitle: '2 tracks • Isolated guitar & backing track',
    isNewGen: true,
    stems: [
      { instrument: 'guitar', label: 'Guitar' },
      { instrument: 'other', label: 'Other' },
    ],
  },
];

export const SKILL_ITEMS: { id: SkillInstrumentId; label: string }[] = [
  { id: 'vocals', label: 'Vocals' },
  { id: 'guitar', label: 'Guitar' },
  { id: 'drums', label: 'Drums / Percussion' },
  { id: 'bass', label: 'Bass' },
  { id: 'keys', label: 'Keys' },
  { id: 'strings', label: 'Strings' },
  { id: 'ukulele', label: 'Ukulele' },
  { id: 'woodwind_or_brass', label: 'Woodwind or Brass' },
  { id: 'beat_machine', label: 'Beat Machine' },
  { id: 'audio_editor', label: 'Audio Editor (DAW)' },
  { id: 'turntable', label: 'Turntable' },
  { id: 'other', label: 'Others' },
];

export const GOAL_ITEMS: string[] = [
  'Practice',
  'Learn',
  'Karaoke',
  'Produce',
  'Perform Live',
  'Teach',
  'Remix',
  'Songwriting',
  'Play for fun',
  'Social Media Content',
  'Just curious',
];
