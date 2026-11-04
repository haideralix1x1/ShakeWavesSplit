import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { File, Paths } from 'expo-file-system';
import { decodeAndSeparateAudioNative } from '../audio/nativeAudioPicker';
import {
  Playlist,
  SEPARATION_PRESETS,
  SeparationPresetId,
  SkillInstrumentId,
  SongTask,
  StemTrack,
  UserProfile,
} from '../types/models';

const STATE_FILE_NAME = 'shakewavessplit_state_v1.json';

const INITIAL_SONGS: SongTask[] = [
  {
    id: 'song_1',
    title: 'Midnight Electric Groove',
    artist: 'The Rhythm Collective',
    separationId: '5_vocals_drums_bass_piano_other',
    separationLabel: 'Vocals, Drums, Bass, Piano, Other',
    durationSec: 24,
    originalBpm: 120,
    originalKey: 'Am',
    speedMultiplier: 1.0,
    pitchSemitones: 0,
    trimStartSec: 0,
    trimEndSec: 24,
    displayChords: true,
    playOnRepeat: true,
    status: 'available',
    createdAt: '2026-11-01T10:00:00Z',
    synthProfileId: 'midnight_funk',
    chordProgression: ['Am', 'F', 'C', 'G', 'Am', 'Dm7', 'Em7', 'Am'],
    metronome: {
      enabled: false,
      volume: 75,
      pan: 0,
      subdivision: 1,
      countIn: 0,
    },
    stems: [
      { id: 's1_vocals', instrument: 'vocals', label: 'Vocals', volume: 85, muted: false, solo: false, pan: 0 },
      { id: 's1_drums', instrument: 'drums', label: 'Drums', volume: 82, muted: false, solo: false, pan: 0 },
      { id: 's1_bass', instrument: 'bass', label: 'Bass', volume: 80, muted: false, solo: false, pan: 0 },
      { id: 's1_keys', instrument: 'keys', label: 'Piano', volume: 78, muted: false, solo: false, pan: -15 },
      { id: 's1_other', instrument: 'other', label: 'Other', volume: 72, muted: false, solo: false, pan: 15 },
    ],
  },
  {
    id: 'song_2',
    title: 'Sunset Boulevard Acoustic',
    artist: 'Sierra & The Waves',
    separationId: '5_vocals_drums_bass_guitar_other',
    separationLabel: 'Vocals, Drums, Bass, Guitar, Other',
    durationSec: 24,
    originalBpm: 108,
    originalKey: 'G',
    speedMultiplier: 1.0,
    pitchSemitones: 0,
    trimStartSec: 0,
    trimEndSec: 24,
    displayChords: true,
    playOnRepeat: true,
    status: 'available',
    createdAt: '2026-11-02T14:20:00Z',
    synthProfileId: 'acoustic_sunrise',
    chordProgression: ['G', 'D', 'Em7', 'C', 'G', 'D', 'C', 'G'],
    metronome: {
      enabled: false,
      volume: 75,
      pan: 0,
      subdivision: 1,
      countIn: 0,
    },
    stems: [
      { id: 's2_vocals', instrument: 'vocals', label: 'Vocals', volume: 84, muted: false, solo: false, pan: 0 },
      { id: 's2_drums', instrument: 'drums', label: 'Drums', volume: 78, muted: false, solo: false, pan: 0 },
      { id: 's2_bass', instrument: 'bass', label: 'Bass', volume: 80, muted: false, solo: false, pan: 0 },
      { id: 's2_guitar', instrument: 'guitar', label: 'Guitar', volume: 88, muted: false, solo: false, pan: -20 },
      { id: 's2_other', instrument: 'other', label: 'Other', volume: 70, muted: false, solo: false, pan: 20 },
    ],
  },
  {
    id: 'song_3',
    title: 'Velvet City Lights',
    artist: 'Nova Soul Ensemble',
    separationId: '4_vocals_drums_bass_other',
    separationLabel: 'Vocals, Drums, Bass, Other',
    durationSec: 24,
    originalBpm: 96,
    originalKey: 'Fm',
    speedMultiplier: 1.0,
    pitchSemitones: 0,
    trimStartSec: 0,
    trimEndSec: 24,
    displayChords: true,
    playOnRepeat: true,
    status: 'available',
    createdAt: '2026-11-03T09:15:00Z',
    synthProfileId: 'velvet_soul',
    chordProgression: ['Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Bbm7', 'C7', 'Fm'],
    metronome: {
      enabled: false,
      volume: 75,
      pan: 0,
      subdivision: 1,
      countIn: 0,
    },
    stems: [
      { id: 's3_vocals', instrument: 'vocals', label: 'Vocals', volume: 86, muted: false, solo: false, pan: 0 },
      { id: 's3_drums', instrument: 'drums', label: 'Drums', volume: 82, muted: false, solo: false, pan: 0 },
      { id: 's3_bass', instrument: 'bass', label: 'Bass', volume: 84, muted: false, solo: false, pan: 0 },
      { id: 's3_other', instrument: 'other', label: 'Other', volume: 76, muted: false, solo: false, pan: 0 },
    ],
  },
  {
    id: 'song_4',
    title: 'Symphonic Horizon (Orchestral Mix)',
    artist: 'Aether Strings',
    separationId: '5_vocals_drums_bass_strings_other',
    separationLabel: 'Vocals, Drums, Bass, Strings, Other',
    durationSec: 24,
    originalBpm: 128,
    originalKey: 'C#m',
    speedMultiplier: 1.0,
    pitchSemitones: 0,
    trimStartSec: 0,
    trimEndSec: 24,
    displayChords: true,
    playOnRepeat: true,
    status: 'available',
    createdAt: '2026-11-03T18:45:00Z',
    synthProfileId: 'cyber_pulse',
    chordProgression: ['C#m', 'A', 'E', 'B', 'C#m', 'F#m', 'G#m', 'C#m'],
    metronome: {
      enabled: false,
      volume: 75,
      pan: 0,
      subdivision: 1,
      countIn: 0,
    },
    stems: [
      { id: 's4_vocals', instrument: 'vocals', label: 'Vocals', volume: 82, muted: false, solo: false, pan: 0 },
      { id: 's4_drums', instrument: 'drums', label: 'Drums', volume: 80, muted: false, solo: false, pan: 0 },
      { id: 's4_bass', instrument: 'bass', label: 'Bass', volume: 80, muted: false, solo: false, pan: 0 },
      { id: 's4_strings', instrument: 'strings', label: 'Strings', volume: 86, muted: false, solo: false, pan: -10 },
      { id: 's4_other', instrument: 'other', label: 'Other', volume: 74, muted: false, solo: false, pan: 10 },
    ],
  },
  {
    id: 'song_5',
    title: 'Starlight Harmony Session',
    artist: 'Luna & The Echoes',
    separationId: '3_vocals_bg_instrumental',
    separationLabel: 'Vocals, Background vocals, Instrumental',
    durationSec: 24,
    originalBpm: 114,
    originalKey: 'Eb',
    speedMultiplier: 1.0,
    pitchSemitones: 0,
    trimStartSec: 0,
    trimEndSec: 24,
    displayChords: true,
    playOnRepeat: true,
    status: 'available',
    createdAt: '2026-11-04T06:00:00Z',
    synthProfileId: 'neon_horizon',
    chordProgression: ['Eb', 'Cm', 'Ab', 'Bb', 'Eb', 'Gm', 'Ab', 'Bb'],
    metronome: {
      enabled: false,
      volume: 75,
      pan: 0,
      subdivision: 1,
      countIn: 0,
    },
    stems: [
      { id: 's5_vocals', instrument: 'vocals', label: 'Vocals', volume: 85, muted: false, solo: false, pan: 0 },
      { id: 's5_bg', instrument: 'bg_vocals', label: 'Background vocals', volume: 78, muted: false, solo: false, pan: -25 },
      { id: 's5_inst', instrument: 'instrumental', label: 'Instrumental', volume: 80, muted: false, solo: false, pan: 0 },
    ],
  },
];

const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: 'pl_1',
    title: 'Live Band Practice',
    description: '5-stem separated tracks for rehearsal, bass & drum lock-in.',
    songIds: ['song_1', 'song_2', 'song_4'],
    createdAt: '2026-11-02T12:00:00Z',
  },
  {
    id: 'pl_2',
    title: 'Vocal & Karaoke Studio',
    description: 'Isolated lead vocals, harmonies, and backing instrumentals.',
    songIds: ['song_3', 'song_5'],
    createdAt: '2026-11-03T15:30:00Z',
  },
];

const INITIAL_PROFILE: UserProfile = {
  id: 'SW-PRO-98412-UNLIMITED',
  name: 'Alex Producer',
  email: 'alex@shakewavessplit.studio',
  authMethod: 'Studio Pass',
  isLoggedIn: true,
  isPremium: true, // 100% Free & Unlocked
  skills: ['vocals', 'guitar', 'keys', 'audio_editor'],
  skillLevel: 'Pro',
  goals: ['Practice', 'Produce', 'Perform Live', 'Remix'],
  defaultSeparation: 'always_ask',
  autoDownload: true,
  autoplaySong: true,
  defaultDisplayChords: true,
  defaultPlayOnRepeat: true,
  smartCacheLimitGb: 8,
  notifyActivity: true,
  notifyMarketing: false,
  hasCompletedOnboarding: true,
};

interface PendingUploadDraft {
  title: string;
  artist: string;
  sourceType: 'files' | 'gallery' | 'url';
  sourceUrl?: string;
}

interface AppContextValue {
  songs: SongTask[];
  playlists: Playlist[];
  profile: UserProfile;
  recentSearches: string[];
  pendingUpload: PendingUploadDraft | null;
  setPendingUpload: (draft: PendingUploadDraft | null) => void;
  uploadAndSeparateSong: (
    draft: PendingUploadDraft,
    separationId: SeparationPresetId,
    setAsDefault: boolean
  ) => Promise<SongTask>;
  changeSongSeparation: (songId: string, separationId: SeparationPresetId) => void;
  updateStemVolume: (songId: string, stemId: string, volume: number) => void;
  toggleStemMute: (songId: string, stemId: string) => void;
  toggleStemSolo: (songId: string, stemId: string) => void;
  updateStemPan: (songId: string, stemId: string, pan: number) => void;
  resetSongMixer: (songId: string) => void;
  updateMetronome: (
    songId: string,
    patch: Partial<SongTask['metronome']>
  ) => void;
  updateSongSpeed: (songId: string, speedMultiplier: number) => void;
  updateSongPitch: (songId: string, pitchSemitones: number) => void;
  updateSongTrim: (songId: string, startSec: number, endSec: number) => void;
  updateSongSettings: (
    songId: string,
    patch: Partial<Pick<SongTask, 'displayChords' | 'playOnRepeat' | 'title' | 'artist'>>
  ) => void;
  offloadSong: (songId: string) => void;
  restoreOffloadedSong: (songId: string) => void;
  deleteSongs: (songIds: string[]) => void;
  createPlaylist: (title: string, description: string) => Playlist;
  updatePlaylist: (playlistId: string, title: string, description: string) => void;
  deletePlaylist: (playlistId: string) => void;
  addSongToPlaylist: (playlistId: string, songId: string) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  loginWithEmail: (email: string, password: string, name?: string) => void;
  signUpWithEmail: (name: string, email: string, password: string) => void;
  loginWithGoogle: (name?: string, email?: string) => void;
  loginAsGuest: () => void;
  signOut: () => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  clearSmartCache: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<SongTask[]>(INITIAL_SONGS);
  const [playlists, setPlaylists] = useState<Playlist[]>(INITIAL_PLAYLISTS);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Midnight Electric',
    'Vocals',
    'Acoustic',
  ]);
  const [pendingUpload, setPendingUpload] = useState<PendingUploadDraft | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state from disk on startup
  useEffect(() => {
    try {
      const file = new File(Paths.document, STATE_FILE_NAME);
      if (file.exists) {
        const raw = file.textSync();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.songs) && parsed.songs.length > 0) {
          setSongs(parsed.songs);
        }
        if (Array.isArray(parsed.playlists)) {
          setPlaylists(parsed.playlists);
        }
        if (parsed.profile) {
          setProfile({ ...INITIAL_PROFILE, ...parsed.profile, isPremium: true });
        }
        if (Array.isArray(parsed.recentSearches)) {
          setRecentSearches(parsed.recentSearches);
        }
      }
    } catch {
      // Fallback to initial state
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist state on change
  useEffect(() => {
    if (!hydrated) return;
    try {
      const file = new File(Paths.document, STATE_FILE_NAME);
      file.write(
        JSON.stringify({
          songs,
          playlists,
          profile,
          recentSearches,
        })
      );
    } catch {}
  }, [songs, playlists, profile, recentSearches, hydrated]);

  const uploadAndSeparateSong = useCallback(
    async (
      draft: PendingUploadDraft,
      separationId: SeparationPresetId,
      setAsDefault: boolean
    ): Promise<SongTask> => {
      const preset =
        SEPARATION_PRESETS.find((p) => p.id === separationId) || SEPARATION_PRESETS[0];

      if (setAsDefault) {
        setProfile((prev) => ({ ...prev, defaultSeparation: separationId }));
      }

      const id = `song_${Date.now()}`;
      const keys = ['Am', 'C', 'Em', 'G', 'Dm', 'F#m', 'Bm'];
      const bpms = [100, 112, 120, 124, 128, 95];
      const progressions = [
        ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm7', 'E7'],
        ['Em', 'C', 'G', 'D', 'Em', 'Am7', 'C', 'B7'],
        ['Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Fm7', 'G7', 'Cm'],
        ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'],
      ];

      const seed = draft.title.length;
      let durationSec = 24;
      let originalBpm = bpms[seed % bpms.length];
      let originalKey = keys[seed % keys.length];
      let stemUris: Record<string, string> = {};

      // If user uploaded a real audio file, decode and separate via native Android DSP
      if (draft.sourceUrl) {
        try {
          const sepResult = await decodeAndSeparateAudioNative(draft.sourceUrl, id, preset.id);
          if (sepResult && sepResult.success) {
            durationSec = Math.max(5, Math.round(sepResult.durationSec));
            originalBpm = sepResult.bpm || originalBpm;
            originalKey = sepResult.key || originalKey;
            stemUris = sepResult.stems || {};
          }
        } catch (e) {
          console.warn('Native separation failed, using fallback:', e);
        }
      }

      const stems: StemTrack[] = preset.stems.map((s, idx) => ({
        id: `${id}_stem_${idx}`,
        instrument: s.instrument,
        label: s.label,
        volume: 82,
        muted: false,
        solo: false,
        pan: 0,
        uri: stemUris[s.instrument] || stemUris.other,
      }));

      const newSong: SongTask = {
        id,
        title: draft.title.trim() || 'Untitled Studio Track',
        artist: draft.artist.trim() || 'Device Audio',
        separationId: preset.id,
        separationLabel: preset.title,
        durationSec,
        originalBpm,
        originalKey,
        speedMultiplier: 1.0,
        pitchSemitones: 0,
        trimStartSec: 0,
        trimEndSec: durationSec,
        displayChords: profile.defaultDisplayChords,
        playOnRepeat: profile.defaultPlayOnRepeat,
        status: 'available',
        createdAt: new Date().toISOString(),
        synthProfileId: draft.sourceUrl ? 'custom_import' : 'midnight_funk',
        chordProgression: progressions[seed % progressions.length],
        sourceUrl: draft.sourceUrl,
        metronome: {
          enabled: false,
          volume: 75,
          pan: 0,
          subdivision: 1,
          countIn: 0,
        },
        stems,
      };

      setSongs((prev) => [newSong, ...prev]);
      setPendingUpload(null);
      return newSong;
    },
    [profile.defaultDisplayChords, profile.defaultPlayOnRepeat]
  );

  const changeSongSeparation = useCallback(
    (songId: string, separationId: SeparationPresetId) => {
      const preset = SEPARATION_PRESETS.find((p) => p.id === separationId);
      if (!preset) return;
      setSongs((prev) =>
        prev.map((song) => {
          if (song.id !== songId) return song;
          const newStems: StemTrack[] = preset.stems.map((s, idx) => {
            const existing = song.stems.find((old) => old.instrument === s.instrument);
            return {
              id: `${song.id}_${separationId}_${idx}`,
              instrument: s.instrument,
              label: s.label,
              volume: existing ? existing.volume : 82,
              muted: existing ? existing.muted : false,
              solo: false,
              pan: existing ? existing.pan : 0,
              uri: existing?.uri || song.stems.find((old) => old.instrument === 'other')?.uri,
            };
          });
          return {
            ...song,
            separationId: preset.id,
            separationLabel: preset.title,
            stems: newStems,
          };
        })
      );
    },
    []
  );

  const updateStemVolume = useCallback((songId: string, stemId: string, volume: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    setSongs((prev) =>
      prev.map((song) =>
        song.id !== songId
          ? song
          : {
              ...song,
              stems: song.stems.map((s) =>
                s.id === stemId ? { ...s, volume: clamped, muted: clamped === 0 } : s
              ),
            }
      )
    );
  }, []);

  const toggleStemMute = useCallback((songId: string, stemId: string) => {
    setSongs((prev) =>
      prev.map((song) =>
        song.id !== songId
          ? song
          : {
              ...song,
              stems: song.stems.map((s) =>
                s.id === stemId
                  ? {
                      ...s,
                      muted: !s.muted,
                      volume: !s.muted ? s.volume : Math.max(s.volume, 75),
                    }
                  : s
              ),
            }
      )
    );
  }, []);

  const toggleStemSolo = useCallback((songId: string, stemId: string) => {
    setSongs((prev) =>
      prev.map((song) => {
        if (song.id !== songId) return song;
        return {
          ...song,
          stems: song.stems.map((s) =>
            s.id === stemId ? { ...s, solo: !s.solo, muted: false } : s
          ),
        };
      })
    );
  }, []);

  const updateStemPan = useCallback((songId: string, stemId: string, pan: number) => {
    const clamped = Math.max(-100, Math.min(100, Math.round(pan)));
    setSongs((prev) =>
      prev.map((song) =>
        song.id !== songId
          ? song
          : {
              ...song,
              stems: song.stems.map((s) => (s.id === stemId ? { ...s, pan: clamped } : s)),
            }
      )
    );
  }, []);

  const resetSongMixer = useCallback((songId: string) => {
    setSongs((prev) =>
      prev.map((song) =>
        song.id !== songId
          ? song
          : {
              ...song,
              speedMultiplier: 1.0,
              pitchSemitones: 0,
              trimStartSec: 0,
              trimEndSec: song.durationSec,
              metronome: {
                ...song.metronome,
                enabled: false,
                volume: 75,
                pan: 0,
                subdivision: 1,
              },
              stems: song.stems.map((s) => ({
                ...s,
                volume: 82,
                muted: false,
                solo: false,
                pan: 0,
              })),
            }
      )
    );
  }, []);

  const updateMetronome = useCallback(
    (songId: string, patch: Partial<SongTask['metronome']>) => {
      setSongs((prev) =>
        prev.map((song) =>
          song.id !== songId
            ? song
            : { ...song, metronome: { ...song.metronome, ...patch } }
        )
      );
    },
    []
  );

  const updateSongSpeed = useCallback((songId: string, speedMultiplier: number) => {
    const clamped = Math.max(0.5, Math.min(2.0, Number(speedMultiplier.toFixed(2))));
    setSongs((prev) =>
      prev.map((song) => (song.id !== songId ? song : { ...song, speedMultiplier: clamped }))
    );
  }, []);

  const updateSongPitch = useCallback((songId: string, pitchSemitones: number) => {
    const clamped = Math.max(-12, Math.min(12, Math.round(pitchSemitones)));
    setSongs((prev) =>
      prev.map((song) => (song.id !== songId ? song : { ...song, pitchSemitones: clamped }))
    );
  }, []);

  const updateSongTrim = useCallback((songId: string, startSec: number, endSec: number) => {
    setSongs((prev) =>
      prev.map((song) => {
        if (song.id !== songId) return song;
        const s = Math.max(0, Math.min(startSec, song.durationSec - 2));
        const e = Math.max(s + 2, Math.min(endSec, song.durationSec));
        return { ...song, trimStartSec: s, trimEndSec: e };
      })
    );
  }, []);

  const updateSongSettings = useCallback(
    (
      songId: string,
      patch: Partial<Pick<SongTask, 'displayChords' | 'playOnRepeat' | 'title' | 'artist'>>
    ) => {
      setSongs((prev) =>
        prev.map((song) => (song.id !== songId ? song : { ...song, ...patch }))
      );
    },
    []
  );

  const offloadSong = useCallback((songId: string) => {
    setSongs((prev) =>
      prev.map((song) => (song.id !== songId ? song : { ...song, status: 'offloaded' }))
    );
  }, []);

  const restoreOffloadedSong = useCallback((songId: string) => {
    setSongs((prev) =>
      prev.map((song) => (song.id !== songId ? song : { ...song, status: 'available' }))
    );
  }, []);

  const deleteSongs = useCallback((songIds: string[]) => {
    const idSet = new Set(songIds);
    setSongs((prev) => prev.filter((s) => !idSet.has(s.id)));
    setPlaylists((prev) =>
      prev.map((pl) => ({
        ...pl,
        songIds: pl.songIds.filter((id) => !idSet.has(id)),
      }))
    );
  }, []);

  const createPlaylist = useCallback((title: string, description: string): Playlist => {
    const newPl: Playlist = {
      id: `pl_${Date.now()}`,
      title: title.trim() || 'New Playlist',
      description: description.trim(),
      songIds: [],
      createdAt: new Date().toISOString(),
    };
    setPlaylists((prev) => [newPl, ...prev]);
    return newPl;
  }, []);

  const updatePlaylist = useCallback(
    (playlistId: string, title: string, description: string) => {
      setPlaylists((prev) =>
        prev.map((pl) =>
          pl.id !== playlistId
            ? pl
            : { ...pl, title: title.trim() || pl.title, description: description.trim() }
        )
      );
    },
    []
  );

  const deletePlaylist = useCallback((playlistId: string) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
  }, []);

  const addSongToPlaylist = useCallback((playlistId: string, songId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.songIds.includes(songId)) return pl;
        return { ...pl, songIds: [...pl.songIds, songId] };
      })
    );
  }, []);

  const removeSongFromPlaylist = useCallback((playlistId: string, songId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id !== playlistId
          ? pl
          : { ...pl, songIds: pl.songIds.filter((id) => id !== songId) }
      )
    );
  }, []);

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...patch, isPremium: true }));
  }, []);

  const loginWithEmail = useCallback((email: string, password: string, name?: string) => {
    const cleanEmail = email.trim();
    const cleanName = name?.trim() || cleanEmail.split('@')[0] || 'Studio Artist';
    setProfile((prev) => ({
      ...prev,
      name: cleanName,
      email: cleanEmail,
      authMethod: 'Email',
      isLoggedIn: true,
      isPremium: true,
    }));
  }, []);

  const signUpWithEmail = useCallback((name: string, email: string, password: string) => {
    const cleanName = name.trim() || 'Studio Producer';
    const cleanEmail = email.trim() || 'producer@shakewavessplit.app';
    setProfile((prev) => ({
      ...prev,
      name: cleanName,
      email: cleanEmail,
      authMethod: 'Email',
      isLoggedIn: true,
      isPremium: true,
    }));
  }, []);

  const loginWithGoogle = useCallback((name?: string, email?: string) => {
    setProfile((prev) => ({
      ...prev,
      name: name?.trim() || 'Google User',
      email: email?.trim() || 'user@gmail.com',
      authMethod: 'Google',
      isLoggedIn: true,
      isPremium: true,
    }));
  }, []);

  const loginAsGuest = useCallback(() => {
    setProfile((prev) => ({
      ...prev,
      name: 'Guest Producer',
      email: 'guest@shakewavessplit.app',
      authMethod: 'Studio Pass',
      isLoggedIn: true,
      isPremium: true,
    }));
  }, []);

  const signOut = useCallback(() => {
    setProfile((prev) => ({
      ...prev,
      isLoggedIn: false,
      name: 'Guest',
      email: 'Sign in to sync your library',
      authMethod: 'Studio Pass',
    }));
  }, []);

  const addRecentSearch = useCallback((query: string) => {
    const clean = query.trim();
    if (!clean) return;
    setRecentSearches((prev) => [clean, ...prev.filter((q) => q !== clean)].slice(0, 8));
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  const clearSmartCache = useCallback(() => {
    // Re-syncs available statuses
    setSongs((prev) => prev.map((s) => ({ ...s })));
  }, []);

  return (
    <AppContext.Provider
      value={{
        songs,
        playlists,
        profile,
        recentSearches,
        pendingUpload,
        setPendingUpload,
        uploadAndSeparateSong,
        changeSongSeparation,
        updateStemVolume,
        toggleStemMute,
        toggleStemSolo,
        updateStemPan,
        resetSongMixer,
        updateMetronome,
        updateSongSpeed,
        updateSongPitch,
        updateSongTrim,
        updateSongSettings,
        offloadSong,
        restoreOffloadedSong,
        deleteSongs,
        createPlaylist,
        updatePlaylist,
        deletePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        updateProfile,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        loginAsGuest,
        signOut,
        addRecentSearch,
        clearRecentSearches,
        clearSmartCache,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
