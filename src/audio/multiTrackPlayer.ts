import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { SongTask } from '../types/models';
import { AppAssets } from '../theme/assets';
import { renderSongMixAsync, renderSongMixToWavUri } from './wavStemEngine';

class MultiTrackStudioPlayer {
  private player: AudioPlayer | null = null;
  private metroClickPlayer: AudioPlayer | null = null;
  private isAudioConfigured = false;
  private currentSongId: string | null = null;
  private fileToggleIndex = 0;

  async ensureAudioConfigured(): Promise<void> {
    if (this.isAudioConfigured) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
      this.isAudioConfigured = true;
    } catch {
      // Ignore on unsupported web/simulator environments
    }
  }

  /**
   * Plays a single authentic metronome click (`metro.wav` extracted from the APK)
   * used during Count-in ("1, 2, 3, 4") before playback starts.
   */
  async playCountInClick(): Promise<void> {
    await this.ensureAudioConfigured();
    try {
      if (!this.metroClickPlayer) {
        this.metroClickPlayer = createAudioPlayer(AppAssets.raw.metroWav);
      }
      await this.metroClickPlayer.seekTo(0);
      this.metroClickPlayer.play();
    } catch {
      // Fallback if audio device busy
    }
  }

  /**
   * Loads or hot-swaps the multi-stem mix for `song` at `targetTimeSec`
   */
  async loadOrUpdateSongMix(
    song: SongTask,
    shouldPlay: boolean,
    targetTimeSec: number = 0
  ): Promise<void> {
    await this.ensureAudioConfigured();
    try {
      this.fileToggleIndex = (this.fileToggleIndex + 1) % 2;
      const wavUri = await renderSongMixAsync(song, this.fileToggleIndex);

      if (!this.player) {
        this.player = createAudioPlayer(wavUri);
      } else {
        this.player.replace(wavUri);
      }

      this.currentSongId = song.id;
      this.player.loop = song.playOnRepeat;

      const clampedTime = Math.max(
        song.trimStartSec || 0,
        Math.min(targetTimeSec, (song.trimEndSec || song.durationSec) - 0.1)
      );

      if (clampedTime > 0) {
        try {
          await this.player.seekTo(clampedTime);
        } catch {
          // Ignore seek errors on initial load
        }
      }

      if (shouldPlay) {
        this.player.play();
      } else {
        this.player.pause();
      }
    } catch (err) {
      console.warn('MultiTrackStudioPlayer loadOrUpdateSongMix error:', err);
    }
  }

  play(): void {
    try {
      this.player?.play();
    } catch {}
  }

  pause(): void {
    try {
      this.player?.pause();
    } catch {}
  }

  async seekTo(seconds: number): Promise<void> {
    try {
      if (this.player) {
        await this.player.seekTo(Math.max(0, seconds));
      }
    } catch {}
  }

  setLoop(loop: boolean): void {
    try {
      if (this.player) {
        this.player.loop = loop;
      }
    } catch {}
  }

  getCurrentTime(): number {
    try {
      return this.player?.currentTime ?? 0;
    } catch {
      return 0;
    }
  }

  isPlaying(): boolean {
    try {
      return this.player?.playing ?? false;
    } catch {
      return false;
    }
  }

  stopAndRelease(): void {
    try {
      if (this.player) {
        this.player.pause();
        this.player.remove();
        this.player = null;
      }
      this.currentSongId = null;
    } catch {}
  }
}

export const studioPlayer = new MultiTrackStudioPlayer();
