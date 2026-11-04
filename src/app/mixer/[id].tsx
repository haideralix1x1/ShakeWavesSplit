import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Switch,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';
import { Colors, Fonts } from '../../theme/colors';
import { AppAssets } from '../../theme/assets';
import { SEPARATION_PRESETS, StemTrack } from '../../types/models';
import { TrackControlRow } from '../../components/VolumeSelector';
import { ChordsBar } from '../../components/ChordsBar';
import {
  formatTimeMMSS,
  MoisesPlayerControl,
} from '../../components/MoisesPlayerControl';
import { studioPlayer } from '../../audio/multiTrackPlayer';
import { exportAudioFileToDevice, exportAudioFileToDeviceAsync } from '../../audio/wavStemEngine';
import { transposeChord } from '../../audio/chordEngine';

const SPEED_STEPS = [
  0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2, 1.25,
  1.35, 1.5, 1.75, 2.0,
];

const PITCH_STEPS = [
  -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8,
  9, 10, 11, 12,
];

export default function MixerStudioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    songs,
    profile,
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
    changeSongSeparation,
  } = useApp();

  const song = songs.find((s) => s.id === id) || songs[0];
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(16, insets.top);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [countInRemaining, setCountInRemaining] = useState<number | null>(null);
  const [ratedQuality, setRatedQuality] = useState<'up' | 'down' | null>(null);

  // Active Bottom Sheets
  const [activePanStem, setActivePanStem] = useState<StemTrack | null>(null);
  const [showMetronomeSpeedSheet, setShowMetronomeSpeedSheet] = useState(false);
  const [showPitchKeySheet, setShowPitchKeySheet] = useState(false);
  const [showSongSettingsSheet, setShowSongSettingsSheet] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTrimModal, setShowTrimModal] = useState(false);
  const [showChangeSepModal, setShowChangeSepModal] = useState(false);

  // Export Modal State
  const [exportType, setExportType] = useState<'separated_tracks' | 'audio_mix'>(
    'audio_mix'
  );
  const [exportFormat, setExportFormat] = useState<'MP3' | 'M4A' | 'WAV'>('WAV');

  // Trim Draft State
  const [draftTrimStart, setDraftTrimStart] = useState(0);
  const [draftTrimEnd, setDraftTrimEnd] = useState(24);

  const isPlayingRef = useRef(false);
  const currentTimeRef = useRef(0);
  const mixDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load of song into multi-track player
  useEffect(() => {
    if (!song) return;
    setDraftTrimStart(song.trimStartSec || 0);
    setDraftTrimEnd(song.trimEndSec || song.durationSec);

    const shouldAutoPlay = profile.autoplaySong;
    isPlayingRef.current = shouldAutoPlay;
    setIsPlaying(shouldAutoPlay);
    setCurrentTimeSec(song.trimStartSec || 0);
    currentTimeRef.current = song.trimStartSec || 0;

    studioPlayer.loadOrUpdateSongMix(
      song,
      shouldAutoPlay,
      song.trimStartSec || 0
    );

    return () => {
      studioPlayer.stopAndRelease();
    };
  }, [song?.id]);

  // Hot-swap the active stereo mix whenever stem volumes, mutes, solo, pan, metronome, speed, or pitch change
  const mixSignature = song
    ? JSON.stringify({
        stems: song.stems.map((s) => [s.volume, s.muted, s.solo, s.pan]),
        metro: song.metronome,
        speed: song.speedMultiplier,
        pitch: song.pitchSemitones,
        repeat: song.playOnRepeat,
      })
    : '';

  useEffect(() => {
    if (!song) return;
    if (mixDebounceRef.current) {
      clearTimeout(mixDebounceRef.current);
    }
    mixDebounceRef.current = setTimeout(() => {
      studioPlayer.loadOrUpdateSongMix(
        song,
        isPlayingRef.current,
        currentTimeRef.current
      );
    }, 65);

    return () => {
      if (mixDebounceRef.current) clearTimeout(mixDebounceRef.current);
    };
  }, [mixSignature]);

  // Playback position polling & Trim boundary loop enforcement
  useEffect(() => {
    if (!song) return;
    const interval = setInterval(() => {
      if (!isPlayingRef.current) return;
      const pos = studioPlayer.getCurrentTime();
      const effectiveDuration = song.durationSec / Math.max(0.5, song.speedMultiplier);
      const trimEnd = Math.min(
        effectiveDuration,
        (song.trimEndSec || song.durationSec) / Math.max(0.5, song.speedMultiplier)
      );
      const trimStart =
        (song.trimStartSec || 0) / Math.max(0.5, song.speedMultiplier);

      if (pos >= trimEnd - 0.12) {
        if (song.playOnRepeat) {
          studioPlayer.seekTo(trimStart);
          setCurrentTimeSec(trimStart);
          currentTimeRef.current = trimStart;
        } else {
          studioPlayer.pause();
          isPlayingRef.current = false;
          setIsPlaying(false);
          studioPlayer.seekTo(trimStart);
          setCurrentTimeSec(trimStart);
          currentTimeRef.current = trimStart;
        }
      } else {
        setCurrentTimeSec(pos);
        currentTimeRef.current = pos;
      }
    }, 90);

    return () => clearInterval(interval);
  }, [
    song?.id,
    song?.durationSec,
    song?.speedMultiplier,
    song?.trimStartSec,
    song?.trimEndSec,
    song?.playOnRepeat,
  ]);

  if (!song) {
    return null;
  }

  const effectiveDuration =
    song.durationSec / Math.max(0.5, song.speedMultiplier || 1.0);
  const hasAnySolo = song.stems.some((s) => s.solo);
  const currentActivePanStem = activePanStem
    ? song.stems.find((s) => s.id === activePanStem.id) || activePanStem
    : null;

  const handleTogglePlay = () => {
    if (isPlaying) {
      studioPlayer.pause();
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }

    // Check if Count-In is enabled (`1`, `2`, or `4` bars) when starting from near the beginning
    if (song.metronome.countIn > 0 && currentTimeSec <= (song.trimStartSec || 0) + 1.0) {
      const totalClicks = song.metronome.countIn * 4;
      const effectiveBpm = song.originalBpm * song.speedMultiplier;
      const msPerClick = Math.max(220, Math.round((60 / effectiveBpm) * 1000));
      let remaining = totalClicks;
      setCountInRemaining(remaining);
      studioPlayer.playCountInClick();

      const timer = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          setCountInRemaining(remaining);
          studioPlayer.playCountInClick();
        } else {
          clearInterval(timer);
          setCountInRemaining(null);
          studioPlayer.play();
          isPlayingRef.current = true;
          setIsPlaying(true);
        }
      }, msPerClick);
      return;
    }

    studioPlayer.play();
    isPlayingRef.current = true;
    setIsPlaying(true);
  };

  const handleSeek = (targetSec: number) => {
    const clamped = Math.max(0, Math.min(effectiveDuration, targetSec));
    setCurrentTimeSec(clamped);
    currentTimeRef.current = clamped;
    studioPlayer.seekTo(clamped);
  };

  const handleExportConfirm = async (action: 'save' | 'share', singleStem?: StemTrack) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
      const mode = singleStem
        ? 'single_stem'
        : exportType === 'separated_tracks'
        ? 'all_stems'
        : 'audio_mix';
      const result = await exportAudioFileToDeviceAsync(
        song,
        mode,
        exportFormat,
        singleStem
      );
      setShowExportModal(false);
      setActivePanStem(null);

      if (action === 'share') {
        Share.share({
          title: result.fileName,
          message: `Exported "${result.fileName}" (${Math.round(
            result.sizeBytes / 1024
          )} KB) from ShakeWavesSplit Studio!\nFile URI: ${result.uri}`,
        }).catch(() => {});
      } else {
        Alert.alert(
          'Saved to Device',
          `"${result.fileName}" (${Math.round(
            result.sizeBytes / 1024
          )} KB) has been written to device storage.\n\nPath: ${result.uri}`
        );
      }
    } catch {
      Alert.alert('Export Complete', 'Audio file exported to studio folder.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }]} edges={['top', 'bottom']}>
      {/* Top Toolbar (`fragment_mixer_host.xml`) */}
      <View style={styles.topToolbar}>
        <TouchableOpacity
          onPress={() => {
            studioPlayer.stopAndRelease();
            router.back();
          }}
          style={styles.toolbarIconBtn}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.toolbarTitleCol}>
          <Text numberOfLines={1} style={styles.songTitleText}>
            {song.title}
          </Text>
          <Text numberOfLines={1} style={styles.songSubText}>
            {song.artist} • {song.stems.length} Tracks
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowExportModal(true)}
          style={styles.toolbarExportQuickBtn}
        >
          <Ionicons name="download-outline" size={18} color={Colors.acqua} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowSongSettingsSheet(true)}
          style={styles.toolbarIconBtn}
        >
          <Image
            source={AppAssets.images.more}
            style={{ width: 20, height: 20, tintColor: Colors.white }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* AI Chords Carousel (`view_chords.xml` - 100% Unlocked!) */}
      <ChordsBar
        chordProgression={song.chordProgression}
        originalBpm={song.originalBpm}
        durationSec={song.durationSec}
        pitchSemitones={song.pitchSemitones}
        currentTimeSec={currentTimeSec}
        speedMultiplier={song.speedMultiplier}
        visible={song.displayChords}
      />

      {/* Count-In Visual Overlay when active */}
      {countInRemaining !== null && (
        <View style={styles.countInBanner}>
          <Ionicons name="timer-outline" size={18} color={Colors.primaryButtonText} />
          <Text style={styles.countInBannerText}>
            Count-in: {countInRemaining}...
          </Text>
        </View>
      )}

      {/* Multi-Track Stem Mixer Scroll Area (`fragment_mixer.xml`) */}
      <ScrollView
        style={styles.tracksScroll}
        contentContainerStyle={styles.tracksScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stem Track Rows (`track_controls_item.xml`) */}
        {song.stems.map((stem) => (
          <TrackControlRow
            key={stem.id}
            label={stem.label}
            instrument={stem.instrument}
            volume={stem.volume}
            muted={stem.muted}
            solo={stem.solo}
            hasAnySolo={hasAnySolo}
            pan={stem.pan}
            onVolumeChange={(val) => updateStemVolume(song.id, stem.id, val)}
            onToggleMute={() => toggleStemMute(song.id, stem.id)}
            onToggleSolo={() => toggleStemSolo(song.id, stem.id)}
            onOpenOptions={() => setActivePanStem(stem)}
          />
        ))}

        {/* Smart Metronome Track Row */}
        <TrackControlRow
          label="Smart Metronome"
          instrument="metronome"
          volume={song.metronome.volume}
          muted={!song.metronome.enabled}
          pan={song.metronome.pan}
          subdivisionLabel={`${song.metronome.subdivision}x`}
          onVolumeChange={(val) =>
            updateMetronome(song.id, { volume: val, enabled: val > 0 })
          }
          onToggleMute={() =>
            updateMetronome(song.id, { enabled: !song.metronome.enabled })
          }
          onOpenOptions={() => setShowMetronomeSpeedSheet(true)}
        />

        {/* Export & Reset Action Buttons (`fragment_mixer.xml`) */}
        <View style={styles.mixerActionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowExportModal(true)}
            style={styles.exportMainBtn}
          >
            <Image
              source={AppAssets.images.download}
              style={{ width: 16, height: 16, tintColor: Colors.primaryButtonText }}
              resizeMode="contain"
            />
            <Text style={styles.exportMainBtnText}>Export</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              resetSongMixer(song.id);
            }}
            style={styles.resetMainBtn}
          >
            <Ionicons name="refresh" size={16} color={Colors.white} />
            <Text style={styles.resetMainBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Audio Quality Rating Card (`fragment_mixer.xml`: `ic_positive_thumb.png` / `ic_negative_thumb.png`) */}
        <View style={styles.rateCard}>
          <Text style={styles.rateQuestionText}>
            {ratedQuality
              ? 'Thank you for your feedback!'
              : 'How is the audio separation quality?'}
          </Text>
          <View style={styles.rateThumbsRow}>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setRatedQuality('up');
              }}
              style={[
                styles.thumbBtn,
                ratedQuality === 'up' && styles.thumbBtnUpActive,
              ]}
            >
              <Image
                source={AppAssets.images.positiveThumb}
                style={{ width: 20, height: 20 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setRatedQuality('down');
              }}
              style={[
                styles.thumbBtn,
                ratedQuality === 'down' && styles.thumbBtnDownActive,
              ]}
            >
              <Image
                source={AppAssets.images.negativeThumb}
                style={{ width: 20, height: 20 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Transport, SeekBar, Speed/Metronome & Pitch/Key Controls (`view_moises_player_control.xml`) */}
      <MoisesPlayerControl
        currentTimeSec={currentTimeSec}
        durationSec={effectiveDuration}
        trimStartSec={song.trimStartSec / Math.max(0.5, song.speedMultiplier)}
        trimEndSec={
          (song.trimEndSec || song.durationSec) /
          Math.max(0.5, song.speedMultiplier)
        }
        isPlaying={isPlaying}
        originalBpm={song.originalBpm}
        speedMultiplier={song.speedMultiplier}
        originalKey={song.originalKey}
        pitchSemitones={song.pitchSemitones}
        metronomeEnabled={song.metronome.enabled}
        onSeek={handleSeek}
        onTogglePlay={handleTogglePlay}
        onSkipBackward={() => handleSeek(Math.max(0, currentTimeSec - 4))}
        onSkipForward={() =>
          handleSeek(Math.min(effectiveDuration - 0.2, currentTimeSec + 4))
        }
        onOpenMetronomeSpeed={() => setShowMetronomeSpeedSheet(true)}
        onOpenPitchKey={() => setShowPitchKeySheet(true)}
      />

      {/* ===================================================================== */}
      {/* 1. Track Options & Stereo Pan ('L & R') Sheet (`fragment_track_pan.xml`) */}
      {/* ===================================================================== */}
      <Modal
        visible={!!currentActivePanStem}
        transparent
        animationType="slide"
        onRequestClose={() => setActivePanStem(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setActivePanStem(null)}
          style={styles.sheetBackdrop}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            {currentActivePanStem && (
              <>
                <View style={styles.sheetTitleRow}>
                  <Text style={styles.sheetTitle}>
                    {currentActivePanStem.label} • Track Options
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      updateStemPan(song.id, currentActivePanStem.id, 0)
                    }
                  >
                    <Text style={styles.resetLinkText}>Reset</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionSubTitle}>
                  STEREO PANNING (L & R BALANCE)
                </Text>

                <View style={styles.panControlCard}>
                  <View style={styles.panHeadphonesRow}>
                    <View style={styles.panSideLabel}>
                      <Image
                        source={AppAssets.images.headphonesLeft}
                        style={{ width: 22, height: 22, tintColor: Colors.cloud }}
                        resizeMode="contain"
                      />
                      <Text style={styles.panSideText}>Left (L)</Text>
                    </View>
                    <Text style={styles.panCurrentValue}>
                      {currentActivePanStem.pan === 0
                        ? 'Center (0)'
                        : currentActivePanStem.pan < 0
                        ? `${Math.abs(currentActivePanStem.pan)}% Left`
                        : `${currentActivePanStem.pan}% Right`}
                    </Text>
                    <View style={styles.panSideLabel}>
                      <Text style={styles.panSideText}>Right (R)</Text>
                      <Image
                        source={AppAssets.images.headphonesRight}
                        style={{ width: 22, height: 22, tintColor: Colors.cloud }}
                        resizeMode="contain"
                      />
                    </View>
                  </View>

                  {/* Pan Quick Steps (-100 L .. 0 .. +100 R) */}
                  <View style={styles.panPresetsRow}>
                    {[-100, -60, -30, 0, 30, 60, 100].map((val) => {
                      const active = currentActivePanStem.pan === val;
                      return (
                        <TouchableOpacity
                          key={val}
                          onPress={() => {
                            Haptics.selectionAsync().catch(() => {});
                            updateStemPan(song.id, currentActivePanStem.id, val);
                          }}
                          style={[
                            styles.panStepPill,
                            active && styles.panStepPillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.panStepPillText,
                              active && styles.panStepPillTextActive,
                            ]}
                          >
                            {val === 0
                              ? 'C'
                              : val < 0
                              ? `${Math.abs(val)}L`
                              : `${val}R`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Individual Track Export (`fragment_track_export.xml`) */}
                <Text style={styles.sectionSubTitle}>
                  EXPORT ISOLATED "{currentActivePanStem.label.toUpperCase()}" TRACK
                </Text>
                <View style={styles.singleExportButtonsRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setExportFormat('MP3');
                      handleExportConfirm('save', currentActivePanStem);
                    }}
                    style={styles.singleExportBtn}
                  >
                    <Image
                      source={AppAssets.images.downloadTrack}
                      style={{ width: 20, height: 20, tintColor: Colors.acqua }}
                      resizeMode="contain"
                    />
                    <Text style={styles.singleExportBtnText}>Save MP3</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setExportFormat('WAV');
                      handleExportConfirm('save', currentActivePanStem);
                    }}
                    style={styles.singleExportBtn}
                  >
                    <Image
                      source={AppAssets.images.downloadWav}
                      style={{ width: 20, height: 20, tintColor: Colors.acqua }}
                      resizeMode="contain"
                    />
                    <Text style={styles.singleExportBtnText}>Save WAV</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setExportFormat('WAV');
                      handleExportConfirm('share', currentActivePanStem);
                    }}
                    style={styles.singleExportBtn}
                  >
                    <Image
                      source={AppAssets.images.share}
                      style={{ width: 20, height: 20, tintColor: Colors.acqua }}
                      resizeMode="contain"
                    />
                    <Text style={styles.singleExportBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ===================================================================== */}
      {/* 2. Smart Metronome & Playback Speed Sheet (`fragment_metronome_speed_controls.xml`) */}
      {/* ===================================================================== */}
      <Modal
        visible={showMetronomeSpeedSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMetronomeSpeedSheet(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowMetronomeSpeedSheet(false)}
          style={styles.sheetBackdrop}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>Metronome & Playback Speed</Text>
              <TouchableOpacity
                onPress={() => {
                  updateSongSpeed(song.id, 1.0);
                  updateMetronome(song.id, { subdivision: 1, pan: 0 });
                }}
              >
                <Text style={styles.resetLinkText}>Reset</Text>
              </TouchableOpacity>
            </View>

            {/* Smart Metronome Subdivision (`0.5x`, `1x`, `2x`) */}
            <View style={styles.metroHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image
                  source={AppAssets.images.metronome}
                  style={{ width: 22, height: 22 }}
                  resizeMode="contain"
                />
                <Text style={styles.controlGroupTitle}>Smart Metronome</Text>
              </View>
              <Switch
                value={song.metronome.enabled}
                onValueChange={(val) => updateMetronome(song.id, { enabled: val })}
                trackColor={{ false: '#333333', true: Colors.acqua }}
                thumbColor={Colors.white}
              />
            </View>

            <View style={styles.subdivisionRow}>
              {([0.5, 1, 2] as const).map((sub) => {
                const active = song.metronome.subdivision === sub;
                return (
                  <TouchableOpacity
                    key={sub}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      updateMetronome(song.id, { subdivision: sub, enabled: true });
                    }}
                    style={[
                      styles.subdivisionBtn,
                      active && styles.subdivisionBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.subdivisionBtnText,
                        active && styles.subdivisionBtnTextActive,
                      ]}
                    >
                      {sub}x Speed
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Playback Speed WheelSelector (`0.5x` .. `2.0x`) */}
            <View style={[styles.metroHeaderRow, { marginTop: 14 }]}>
              <Text style={styles.controlGroupTitle}>Playback Speed</Text>
              <Text style={styles.highlightValueText}>
                {song.speedMultiplier.toFixed(2)}x ({Math.round(
                  song.originalBpm * song.speedMultiplier
                )}{' '}
                BPM)
              </Text>
            </View>

            <View style={styles.stepperControlRow}>
              <TouchableOpacity
                onPress={() =>
                  updateSongSpeed(song.id, song.speedMultiplier - 0.05)
                }
                style={styles.roundStepBtn}
              >
                <Ionicons name="remove" size={22} color={Colors.white} />
              </TouchableOpacity>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.wheelScrollContent}
              >
                {SPEED_STEPS.map((sp) => {
                  const active = Math.abs(song.speedMultiplier - sp) < 0.02;
                  return (
                    <TouchableOpacity
                      key={sp}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        updateSongSpeed(song.id, sp);
                      }}
                      style={[
                        styles.wheelPill,
                        active && styles.wheelPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.wheelPillText,
                          active && styles.wheelPillTextActive,
                        ]}
                      >
                        {sp}x
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                onPress={() =>
                  updateSongSpeed(song.id, song.speedMultiplier + 0.05)
                }
                style={styles.roundStepBtn}
              >
                <Ionicons name="add" size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ===================================================================== */}
      {/* 3. Song Key & Pitch Controls Sheet (`fragment_pitch_controls.xml`) */}
      {/* ===================================================================== */}
      <Modal
        visible={showPitchKeySheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPitchKeySheet(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowPitchKeySheet(false)}
          style={styles.sheetBackdrop}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>Song Key & Pitch</Text>
              <TouchableOpacity onPress={() => updateSongPitch(song.id, 0)}>
                <Text style={styles.resetLinkText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.keySummaryCardsRow}>
              <View style={styles.keyInfoBox}>
                <Text style={styles.keyInfoLabel}>ORIGINAL KEY</Text>
                <Text style={styles.keyInfoVal}>{song.originalKey}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={Colors.acqua} />
              <View style={[styles.keyInfoBox, styles.keyInfoBoxActive]}>
                <Text style={styles.keyInfoLabel}>TRANSPOSED KEY</Text>
                <Text style={[styles.keyInfoVal, { color: Colors.acqua }]}>
                  {transposeChord(song.originalKey, song.pitchSemitones)}
                </Text>
              </View>
            </View>

            <View style={styles.metroHeaderRow}>
              <Text style={styles.controlGroupTitle}>Pitch (Half step)</Text>
              <Text style={styles.highlightValueText}>
                {song.pitchSemitones > 0
                  ? `+${song.pitchSemitones} semitones`
                  : `${song.pitchSemitones} semitones`}
              </Text>
            </View>

            <View style={styles.stepperControlRow}>
              <TouchableOpacity
                onPress={() =>
                  updateSongPitch(song.id, song.pitchSemitones - 1)
                }
                style={styles.roundStepBtn}
              >
                <Ionicons name="remove" size={22} color={Colors.white} />
              </TouchableOpacity>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.wheelScrollContent}
              >
                {PITCH_STEPS.map((st) => {
                  const active = song.pitchSemitones === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        updateSongPitch(song.id, st);
                      }}
                      style={[
                        styles.wheelPill,
                        active && styles.wheelPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.wheelPillText,
                          active && styles.wheelPillTextActive,
                        ]}
                      >
                        {st > 0 ? `+${st}` : `${st}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                onPress={() =>
                  updateSongPitch(song.id, song.pitchSemitones + 1)
                }
                style={styles.roundStepBtn}
              >
                <Ionicons name="add" size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ===================================================================== */}
      {/* 4. Song Settings Sheet (`fragment_song_settings.xml`) */}
      {/* ===================================================================== */}
      <Modal
        visible={showSongSettingsSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSongSettingsSheet(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowSongSettingsSheet(false)}
          style={styles.sheetBackdrop}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { marginBottom: 14 }]}>
              Song settings
            </Text>

            {/* Count in (`Off`, `1 bar`, `2 bars`, `4 bars`) */}
            <View style={styles.settingBlock}>
              <View style={styles.settingTitleWithDesc}>
                <Text style={styles.settingRowTitle}>Count in</Text>
                <Text style={styles.settingRowSub}>
                  Set count in clicks before the song starts
                </Text>
              </View>
              <View style={styles.countInOptionsRow}>
                {([0, 1, 2, 4] as const).map((bars) => {
                  const active = song.metronome.countIn === bars;
                  return (
                    <TouchableOpacity
                      key={bars}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        updateMetronome(song.id, { countIn: bars });
                      }}
                      style={[
                        styles.countInChip,
                        active && styles.countInChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.countInChipText,
                          active && styles.countInChipTextActive,
                        ]}
                      >
                        {bars === 0 ? 'Off' : `${bars}b`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Trim Audio (`fragment_trim.xml`) */}
            <TouchableOpacity
              onPress={() => {
                setShowSongSettingsSheet(false);
                setDraftTrimStart(song.trimStartSec);
                setDraftTrimEnd(song.trimEndSec || song.durationSec);
                setShowTrimModal(true);
              }}
              style={styles.settingMenuAction}
            >
              <Image
                source={AppAssets.images.trim}
                style={{ width: 20, height: 20, tintColor: Colors.white }}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingRowTitle}>Trim</Text>
                <Text style={styles.settingRowSub}>
                  Cut the audio where you want ({formatTimeMMSS(song.trimStartSec)} -{' '}
                  {formatTimeMMSS(song.trimEndSec || song.durationSec)})
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.smoke} />
            </TouchableOpacity>

            {/* Change Track Separation */}
            <TouchableOpacity
              onPress={() => {
                setShowSongSettingsSheet(false);
                setShowChangeSepModal(true);
              }}
              style={styles.settingMenuAction}
            >
              <Ionicons name="git-branch-outline" size={20} color={Colors.acqua} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingRowTitle}>Change track separation</Text>
                <Text style={styles.settingRowSub}>{song.separationLabel}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.smoke} />
            </TouchableOpacity>

            {/* Display Chords Switch */}
            <View style={styles.settingMenuAction}>
              <Ionicons name="musical-notes-outline" size={20} color={Colors.white} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingRowTitle}>Display chords</Text>
              </View>
              <Switch
                value={song.displayChords}
                onValueChange={(val) =>
                  updateSongSettings(song.id, { displayChords: val })
                }
                trackColor={{ false: '#333333', true: Colors.acqua }}
                thumbColor={Colors.white}
              />
            </View>

            {/* Play song on repeat Switch */}
            <View style={styles.settingMenuAction}>
              <Ionicons name="repeat-outline" size={20} color={Colors.white} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingRowTitle}>Play song on repeat</Text>
              </View>
              <Switch
                value={song.playOnRepeat}
                onValueChange={(val) => {
                  updateSongSettings(song.id, { playOnRepeat: val });
                  studioPlayer.setLoop(val);
                }}
                trackColor={{ false: '#333333', true: Colors.acqua }}
                thumbColor={Colors.white}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ===================================================================== */}
      {/* 5. Trim Audio Modal (`fragment_trim.xml`) */}
      {/* ===================================================================== */}
      <Modal
        visible={showTrimModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTrimModal(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>Trim Audio Region</Text>
              <TouchableOpacity
                onPress={() => {
                  setDraftTrimStart(0);
                  setDraftTrimEnd(song.durationSec);
                }}
              >
                <Text style={styles.resetLinkText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionSubTitle}>
              START TIME: {formatTimeMMSS(draftTrimStart)}
            </Text>
            <View style={styles.panPresetsRow}>
              {[0, 2, 4, 6, 8, 10, 12].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => {
                    setDraftTrimStart(s);
                    if (draftTrimEnd <= s + 2) setDraftTrimEnd(song.durationSec);
                  }}
                  style={[
                    styles.panStepPill,
                    draftTrimStart === s && styles.panStepPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.panStepPillText,
                      draftTrimStart === s && styles.panStepPillTextActive,
                    ]}
                  >
                    {s}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionSubTitle, { marginTop: 14 }]}>
              END TIME: {formatTimeMMSS(draftTrimEnd)}
            </Text>
            <View style={styles.panPresetsRow}>
              {[8, 12, 16, 18, 20, 22, 24].map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => {
                    if (e > draftTrimStart + 1) setDraftTrimEnd(e);
                  }}
                  style={[
                    styles.panStepPill,
                    draftTrimEnd === e && styles.panStepPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.panStepPillText,
                      draftTrimEnd === e && styles.panStepPillTextActive,
                    ]}
                  >
                    {e}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => {
                updateSongTrim(song.id, draftTrimStart, draftTrimEnd);
                handleSeek(draftTrimStart);
                setShowTrimModal(false);
              }}
              style={[styles.exportConfirmBtn, { marginTop: 18 }]}
            >
              <Text style={styles.exportConfirmBtnText}>Save Trim Region</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================================== */}
      {/* 6. Change Track Separation Modal */}
      {/* ===================================================================== */}
      <Modal
        visible={showChangeSepModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangeSepModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowChangeSepModal(false)}
          style={styles.sheetBackdrop}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { marginBottom: 12 }]}>
              Select Track Separation
            </Text>
            {SEPARATION_PRESETS.map((preset) => {
              const active = song.separationId === preset.id;
              return (
                <TouchableOpacity
                  key={preset.id}
                  onPress={() => {
                    changeSongSeparation(song.id, preset.id);
                    setShowChangeSepModal(false);
                  }}
                  style={[
                    styles.exportOptionCard,
                    active && styles.exportOptionCardActive,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exportOptionTitle}>
                      {preset.title} ({preset.trackCount} Tracks)
                    </Text>
                    <Text style={styles.exportOptionDesc}>{preset.subtitle}</Text>
                  </View>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? Colors.acqua : Colors.smoke}
                  />
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ===================================================================== */}
      {/* 7. Export & Share Modal (`fragment_export_option_selector.xml` + `fragment_mix_export.xml`) */}
      {/* ===================================================================== */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowExportModal(false)}
          style={styles.sheetBackdrop}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Export</Text>
            <Text style={styles.exportSubHeader}>
              Choose what you want to export (Lossless WAV Unlocked)
            </Text>

            {/* Option 1: Separated tracks */}
            <TouchableOpacity
              onPress={() => setExportType('separated_tracks')}
              style={[
                styles.exportOptionCard,
                exportType === 'separated_tracks' && styles.exportOptionCardActive,
              ]}
            >
              <Image
                source={AppAssets.images.downloadTrack}
                style={{ width: 24, height: 24, tintColor: Colors.acqua, marginRight: 12 }}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.exportOptionTitle}>Separated tracks</Text>
                <Text style={styles.exportOptionDesc}>
                  Export only the isolated tracks you want to use
                </Text>
              </View>
              <Ionicons
                name={
                  exportType === 'separated_tracks'
                    ? 'radio-button-on'
                    : 'radio-button-off'
                }
                size={20}
                color={
                  exportType === 'separated_tracks' ? Colors.acqua : Colors.smoke
                }
              />
            </TouchableOpacity>

            {/* Option 2: Audio mix */}
            <TouchableOpacity
              onPress={() => setExportType('audio_mix')}
              style={[
                styles.exportOptionCard,
                exportType === 'audio_mix' && styles.exportOptionCardActive,
              ]}
            >
              <Image
                source={AppAssets.images.mixFile}
                style={{ width: 24, height: 24, tintColor: Colors.acqua, marginRight: 12 }}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.exportOptionTitle}>Audio mix</Text>
                <Text style={styles.exportOptionDesc}>
                  Export your complete mix with current stem volumes, pan, speed & pitch
                </Text>
              </View>
              <Ionicons
                name={
                  exportType === 'audio_mix'
                    ? 'radio-button-on'
                    : 'radio-button-off'
                }
                size={20}
                color={exportType === 'audio_mix' ? Colors.acqua : Colors.smoke}
              />
            </TouchableOpacity>

            {/* Export Format Selector (`MP3`, `M4A`, `WAV` — WAV 100% Unlocked!) */}
            <Text style={[styles.sectionSubTitle, { marginTop: 10 }]}>
              EXPORT FORMAT
            </Text>
            <View style={styles.formatSelectorRow}>
              {(['MP3', 'M4A', 'WAV'] as const).map((fmt) => {
                const active = exportFormat === fmt;
                return (
                  <TouchableOpacity
                    key={fmt}
                    onPress={() => setExportFormat(fmt)}
                    style={[
                      styles.formatOptionPill,
                      active && styles.formatOptionPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.formatOptionText,
                        active && styles.formatOptionTextActive,
                      ]}
                    >
                      {fmt} {fmt === 'WAV' ? '(Lossless)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Save to device / Share CTA buttons */}
            <View style={styles.exportActionsBottomRow}>
              <TouchableOpacity
                onPress={() => handleExportConfirm('save')}
                style={styles.exportConfirmBtn}
              >
                <Ionicons
                  name="download-outline"
                  size={18}
                  color={Colors.primaryButtonText}
                />
                <Text style={styles.exportConfirmBtnText}>Save to device</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleExportConfirm('share')}
                style={styles.exportShareBtn}
              >
                <Ionicons name="share-social-outline" size={18} color={Colors.white} />
                <Text style={styles.exportShareBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1B1B1B',
  },
  toolbarIconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarExportQuickBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryDarkBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 232, 0.35)',
  },
  toolbarTitleCol: {
    flex: 1,
    marginHorizontal: 8,
  },
  songTitleText: {
    color: Colors.white,
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  songSubText: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  countInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
    marginHorizontal: 14,
    marginBottom: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444444',
    gap: 8,
  },
  countInBannerText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  tracksScroll: {
    flex: 1,
  },
  tracksScrollContent: {
    paddingTop: 6,
    paddingBottom: 24,
  },
  mixerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 14,
  },
  exportMainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    height: 44,
    borderRadius: 10,
  },
  exportMainBtnText: {
    color: '#000000',
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  resetMainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.bottomNavBackground,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  resetMainBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.secondaryBackground,
    marginHorizontal: 14,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  rateQuestionText: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.regular,
    flex: 1,
  },
  rateThumbsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  thumbBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  thumbBtnUpActive: {
    borderColor: Colors.mint,
    backgroundColor: Colors.mintAlpha15,
  },
  thumbBtnDownActive: {
    borderColor: Colors.red,
    backgroundColor: Colors.redAlpha15,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlaySheet,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.bottomNavBackground,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.graphite,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    color: Colors.white,
    fontSize: 19,
    fontFamily: Fonts.bold,
  },
  resetLinkText: {
    color: Colors.acqua,
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  sectionSubTitle: {
    color: Colors.smoke,
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  panControlCard: {
    backgroundColor: '#121212',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#262626',
  },
  panHeadphonesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  panSideLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  panSideText: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  panCurrentValue: {
    color: Colors.acqua,
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  panPresetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  panStepPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  panStepPillActive: {
    backgroundColor: '#383838',
    borderColor: '#FFFFFF',
  },
  panStepPillText: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  panStepPillTextActive: {
    color: Colors.white,
  },
  singleExportButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  singleExportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#222222',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#383838',
  },
  singleExportBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  metroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  controlGroupTitle: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  highlightValueText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  subdivisionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  subdivisionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#121212',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B2B2B',
  },
  subdivisionBtnActive: {
    backgroundColor: '#262626',
    borderColor: '#FFFFFF',
  },
  subdivisionBtnText: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  subdivisionBtnTextActive: {
    color: Colors.white,
  },
  stepperControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundStepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  wheelScrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  wheelPill: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  wheelPillActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  wheelPillText: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  wheelPillTextActive: {
    color: '#000000',
  },
  keySummaryCardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  keyInfoBox: {
    flex: 1,
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#282828',
  },
  keyInfoBoxActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#262626',
  },
  keyInfoLabel: {
    color: Colors.smoke,
    fontSize: 10,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  keyInfoVal: {
    color: Colors.white,
    fontSize: 22,
    fontFamily: Fonts.bold,
  },
  settingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  settingTitleWithDesc: {
    flex: 1,
    paddingRight: 10,
  },
  settingRowTitle: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  settingRowSub: {
    color: Colors.smoke,
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  countInOptionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  countInChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  countInChipActive: {
    backgroundColor: Colors.acqua,
    borderColor: Colors.acqua,
  },
  countInChipText: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  countInChipTextActive: {
    color: Colors.primaryButtonText,
  },
  settingMenuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  exportSubHeader: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginBottom: 14,
  },
  exportOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#292929',
  },
  exportOptionCardActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#262626',
  },
  exportOptionTitle: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  exportOptionDesc: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  formatSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  formatOptionPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#121212',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B2B2B',
  },
  formatOptionPillActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#262626',
  },
  formatOptionText: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  formatOptionTextActive: {
    color: Colors.white,
  },
  exportActionsBottomRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exportConfirmBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exportConfirmBtnText: {
    color: '#000000',
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  exportShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#282828',
    paddingVertical: 14,
    borderRadius: 12,
  },
  exportShareBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
});
