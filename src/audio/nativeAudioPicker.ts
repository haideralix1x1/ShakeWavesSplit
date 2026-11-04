import { NativeModules, Platform } from 'react-native';

const { NativeAudioPicker } = NativeModules;

export interface PickedAudioResult {
  canceled: boolean;
  uri?: string;
  name?: string;
}

export interface AudioSeparationResult {
  success: boolean;
  durationSec: number;
  bpm: number;
  key: string;
  sampleRate: number;
  stems: Record<string, string>;
}

export interface StemMixParam {
  stemId: string;
  instrument: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  pan: number;
}

export interface MetronomeParam {
  enabled: boolean;
  volume: number;
  pan: number;
  subdivision: number;
}

export interface ExportResult {
  success: boolean;
  uri: string;
  fileName: string;
  sizeBytes: number;
}

export async function pickAudioFileNative(): Promise<PickedAudioResult> {
  if (Platform.OS === 'android' && NativeAudioPicker?.pickAudioFile) {
    try {
      const res: PickedAudioResult = await NativeAudioPicker.pickAudioFile();
      return res;
    } catch (e) {
      console.warn('NativeAudioPicker error:', e);
      return { canceled: true };
    }
  }
  return { canceled: true };
}

export async function decodeAndSeparateAudioNative(
  sourceUri: string,
  songId: string,
  presetId: string
): Promise<AudioSeparationResult | null> {
  if (Platform.OS === 'android' && NativeAudioPicker?.decodeAndSeparateAudio) {
    try {
      const res: AudioSeparationResult = await NativeAudioPicker.decodeAndSeparateAudio(
        sourceUri,
        songId,
        presetId
      );
      return res;
    } catch (e) {
      console.warn('NativeAudioPicker decodeAndSeparateAudio error:', e);
      return null;
    }
  }
  return null;
}

export async function renderMixNative(
  songId: string,
  stems: StemMixParam[],
  speed: number = 1.0,
  pitch: number = 0,
  fileIndex: number = 0,
  metronome?: MetronomeParam
): Promise<string | null> {
  if (Platform.OS === 'android' && NativeAudioPicker?.renderMix) {
    try {
      const stemMixJson = JSON.stringify(stems);
      const metronomeJson = JSON.stringify(metronome || { enabled: false, volume: 0 });
      const uri: string = await NativeAudioPicker.renderMix(
        songId,
        stemMixJson,
        speed,
        pitch,
        fileIndex,
        metronomeJson
      );
      return uri;
    } catch (e) {
      console.warn('NativeAudioPicker renderMix error:', e);
      return null;
    }
  }
  return null;
}

export async function exportMixNative(
  songId: string,
  mode: 'single_stem' | 'audio_mix',
  format: 'MP3' | 'M4A' | 'WAV',
  stemName: string = 'vocals',
  title: string = 'ShakeWavesSplit_Track'
): Promise<ExportResult | null> {
  if (Platform.OS === 'android' && NativeAudioPicker?.exportMixFile) {
    try {
      const res: ExportResult = await NativeAudioPicker.exportMixFile(
        songId,
        mode,
        format,
        stemName,
        title
      );
      return res;
    } catch (e) {
      console.warn('NativeAudioPicker exportMix error:', e);
      return null;
    }
  }
  return null;
}
