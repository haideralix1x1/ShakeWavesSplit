import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../theme/colors';
import { transposeChord } from '../audio/chordEngine';

interface MoisesPlayerControlProps {
  currentTimeSec: number;
  durationSec: number;
  trimStartSec: number;
  trimEndSec: number;
  isPlaying: boolean;
  originalBpm: number;
  speedMultiplier: number;
  originalKey: string;
  pitchSemitones: number;
  metronomeEnabled: boolean;
  onSeek: (sec: number) => void;
  onTogglePlay: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onOpenMetronomeSpeed: () => void;
  onOpenPitchKey: () => void;
}

export function formatTimeMMSS(sec: number): string {
  const safe = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export const MoisesPlayerControl: React.FC<MoisesPlayerControlProps> = ({
  currentTimeSec,
  durationSec,
  trimStartSec,
  trimEndSec,
  isPlaying,
  originalBpm,
  speedMultiplier,
  originalKey,
  pitchSemitones,
  metronomeEnabled,
  onSeek,
  onTogglePlay,
  onSkipBackward,
  onSkipForward,
  onOpenMetronomeSpeed,
  onOpenPitchKey,
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(16, insets.bottom + 8);

  const [barWidth, setBarWidth] = useState(300);
  const widthRef = useRef(300);

  const safeDuration = Math.max(1, durationSec);
  const progressRatio = Math.max(0, Math.min(1, currentTimeSec / safeDuration));
  const trimStartRatio = Math.max(0, Math.min(1, trimStartSec / safeDuration));
  const trimEndRatio = Math.max(0, Math.min(1, (trimEndSec || safeDuration) / safeDuration));
  const isTrimmed = trimStartSec > 0.2 || (trimEndSec > 0 && trimEndSec < safeDuration - 0.2);

  const effectiveBpm = Math.round(originalBpm * speedMultiplier);
  const transposedKey = transposeChord(originalKey, pitchSemitones);
  const isSpeedModified = Math.abs(speedMultiplier - 1.0) > 0.01 || metronomeEnabled;
  const isPitchModified = pitchSemitones !== 0;

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = Math.max(120, e.nativeEvent.layout.width);
    widthRef.current = w;
    setBarWidth(w);
  };

  const seekFromX = (x: number) => {
    const ratio = Math.max(0, Math.min(1, x / widthRef.current));
    onSeek(ratio * safeDuration);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        Haptics.selectionAsync().catch(() => {});
        seekFromX(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        seekFromX(evt.nativeEvent.locationX);
      },
    })
  ).current;

  const remainingSec = Math.max(0, safeDuration - currentTimeSec);

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      {/* Custom RoundedSeekBar */}
      <View style={styles.seekSection}>
        <View
          style={styles.seekTouchArea}
          onLayout={handleLayout}
          {...panResponder.panHandlers}
        >
          <View style={styles.seekTrack}>
            {/* Trim Region Highlight */}
            {isTrimmed && (
              <View
                style={[
                  styles.trimRegionBar,
                  {
                    left: `${trimStartRatio * 100}%`,
                    width: `${Math.max(2, (trimEndRatio - trimStartRatio) * 100)}%`,
                  },
                ]}
              />
            )}

            {/* Active Progress Fill */}
            <View
              style={[
                styles.seekProgress,
                { width: `${progressRatio * 100}%` },
              ]}
            />
          </View>

          {/* Circular Thumb */}
          <View
            pointerEvents="none"
            style={[
              styles.seekThumb,
              {
                left: Math.max(
                  0,
                  Math.min(barWidth - 16, progressRatio * barWidth - 8)
                ),
              },
            ]}
          />
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTimeMMSS(currentTimeSec)}</Text>
          {isTrimmed && (
            <Text style={styles.trimBadgeText}>
              Trimmed: {formatTimeMMSS(trimStartSec)} - {formatTimeMMSS(trimEndSec)}
            </Text>
          )}
          <Text style={styles.timeText}>-{formatTimeMMSS(remainingSec)}</Text>
        </View>
      </View>

      {/* Main Transport & AI Studio Controls Row */}
      <View style={styles.controlsRow}>
        {/* Left: Smart Metronome & Speed Button */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onOpenMetronomeSpeed();
          }}
          style={[
            styles.featurePillButton,
            isSpeedModified && styles.featurePillButtonActive,
          ]}
        >
          <Ionicons
            name="speedometer-outline"
            size={16}
            color={isSpeedModified ? Colors.white : Colors.cloud}
          />
          <View style={styles.featurePillTextCol}>
            <Text
              style={[
                styles.featurePillValue,
                isSpeedModified && { color: Colors.white },
              ]}
            >
              {effectiveBpm} BPM
            </Text>
            <Text style={styles.featurePillSub}>
              {speedMultiplier.toFixed(2).replace(/\.00$/, '.0')}x
              {metronomeEnabled ? ' • Click' : ''}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Transport: Skip Back, Play/Pause, Skip Forward */}
        <View style={styles.transportGroup}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onSkipBackward();
            }}
            style={styles.skipButton}
          >
            <Ionicons name="play-skip-back" size={22} color={Colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              onTogglePlay();
            }}
            style={styles.playPauseButton}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={28}
              color="#000000"
              style={!isPlaying ? { marginLeft: 3 } : undefined}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onSkipForward();
            }}
            style={styles.skipButton}
          >
            <Ionicons name="play-skip-forward" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Right: Song Key & Pitch Changer Button */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onOpenPitchKey();
          }}
          style={[
            styles.featurePillButton,
            isPitchModified && styles.featurePillButtonActive,
          ]}
        >
          <Ionicons
            name="musical-notes-outline"
            size={16}
            color={isPitchModified ? Colors.white : Colors.cloud}
          />
          <View style={styles.featurePillTextCol}>
            <Text
              style={[
                styles.featurePillValue,
                isPitchModified && { color: Colors.white },
              ]}
            >
              Key: {transposedKey}
            </Text>
            <Text style={styles.featurePillSub}>
              {pitchSemitones > 0
                ? `+${pitchSemitones} st`
                : pitchSemitones < 0
                ? `${pitchSemitones} st`
                : 'Original'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.secondaryBackground,
    borderTopWidth: 1,
    borderTopColor: '#222222',
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  seekSection: {
    marginBottom: 10,
  },
  seekTouchArea: {
    height: 26,
    justifyContent: 'center',
    position: 'relative',
  },
  seekTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.seekBarTrace,
    overflow: 'hidden',
    position: 'relative',
  },
  trimRegionBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 210, 0, 0.28)',
  },
  seekProgress: {
    height: '100%',
    backgroundColor: Colors.white,
    borderRadius: 3,
  },
  seekThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: '#AAAAAA',
    top: 5,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  timeText: {
    color: Colors.cloud,
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  trimBadgeText: {
    color: Colors.warning,
    fontSize: 10,
    fontFamily: Fonts.medium,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featurePillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bottomNavBackground,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    minWidth: 104,
    gap: 7,
  },
  featurePillButtonActive: {
    borderColor: '#666666',
    backgroundColor: '#262626',
  },
  featurePillTextCol: {
    flexDirection: 'column',
  },
  featurePillValue: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  featurePillSub: {
    color: Colors.cloud,
    fontSize: 10,
    fontFamily: Fonts.regular,
  },
  transportGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
});
