import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../theme/colors';
import { AppAssets } from '../theme/assets';
import { StemInstrumentType } from '../types/models';

interface TrackRowProps {
  label: string;
  instrument: StemInstrumentType | 'metronome';
  volume: number; // 0..100
  muted: boolean;
  solo?: boolean;
  hasAnySolo?: boolean;
  pan?: number; // -100..100
  subdivisionLabel?: string;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  onToggleSolo?: () => void;
  onOpenOptions: () => void;
}

export const TrackControlRow: React.FC<TrackRowProps> = ({
  label,
  instrument,
  volume,
  muted,
  solo = false,
  hasAnySolo = false,
  pan = 0,
  subdivisionLabel,
  onVolumeChange,
  onToggleMute,
  onToggleSolo,
  onOpenOptions,
}) => {
  const [barWidth, setBarWidth] = useState(220);
  const [isDragging, setIsDragging] = useState(false);
  const widthRef = useRef(220);

  const isEffectivelyMuted = muted || (hasAnySolo && !solo) || volume === 0;
  const effectiveVolume = isEffectivelyMuted ? 0 : volume;

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = Math.max(100, e.nativeEvent.layout.width);
    widthRef.current = w;
    setBarWidth(w);
  };

  const updateFromX = (x: number) => {
    const ratio = Math.max(0, Math.min(1, x / widthRef.current));
    const pct = Math.round(ratio * 100);
    onVolumeChange(pct);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 3,
      onPanResponderGrant: (evt) => {
        setIsDragging(true);
        Haptics.selectionAsync().catch(() => {});
        updateFromX(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        updateFromX(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
      },
    })
  ).current;

  const getInstrumentImage = () => {
    if (instrument === 'metronome') {
      return AppAssets.images.metronome;
    }
    const entry = AppAssets.instruments[instrument] || AppAssets.instruments.other;
    return isEffectivelyMuted ? entry.off : entry.on;
  };

  const panBadgeText =
    pan < 0 ? `${Math.abs(pan)}L` : pan > 0 ? `${pan}R` : null;

  return (
    <View style={styles.rowContainer}>
      {/* Left Instrument Mute/Unmute Button */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onToggleMute();
        }}
        onLongPress={() => {
          if (onToggleSolo) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            onToggleSolo();
          }
        }}
        style={[
          styles.instrumentButton,
          isEffectivelyMuted && styles.instrumentButtonMuted,
          solo && styles.instrumentButtonSolo,
        ]}
      >
        <Image
          source={getInstrumentImage()}
          style={[
            styles.instrumentIcon,
            isEffectivelyMuted && { opacity: 0.45 },
          ]}
          resizeMode="contain"
        />
        {isEffectivelyMuted && (
          <View style={styles.muteBadge}>
            <Text style={styles.muteBadgeText}>M</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Solo ('S') Quick Button for Stems */}
      {onToggleSolo ? (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onToggleSolo();
          }}
          style={[styles.soloButton, solo && styles.soloButtonActive]}
        >
          <Text style={[styles.soloButtonText, solo && styles.soloButtonTextActive]}>
            S
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.soloButton, styles.metroSubBadge]}>
          <Text style={styles.metroSubText}>{subdivisionLabel || '1x'}</Text>
        </View>
      )}

      {/* Custom VolumeSelector Bar */}
      <View
        style={[
          styles.volumeTrack,
          isDragging && styles.volumeTrackDragging,
        ]}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        {/* Filled Volume Bar */}
        <View
          pointerEvents="none"
          style={[
            styles.volumeFill,
            {
              width: `${effectiveVolume}%`,
              backgroundColor: isEffectivelyMuted
              ? '#1A1A1A'
              : isDragging
              ? '#444444'
              : solo
              ? '#3E3E3E'
              : Colors.charcoal,
          },
        ]}
      />

      {/* Thumb Indicator Line */}
      <View
        pointerEvents="none"
        style={[
          styles.volumeThumb,
          {
            left: Math.max(
              2,
              Math.min(barWidth - 6, (effectiveVolume / 100) * barWidth - 3)
            ),
            backgroundColor: isEffectivelyMuted
              ? Colors.smoke
              : isDragging || solo
              ? Colors.white
              : '#D4D4D8',
          },
        ]}
      />

        {/* Track Label & Status inside Volume Bar */}
        <View pointerEvents="none" style={styles.volumeLabelRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.trackLabel,
              isEffectivelyMuted && styles.trackLabelMuted,
            ]}
          >
            {label}
          </Text>
          <View style={styles.rightBadges}>
            {panBadgeText && (
              <View style={styles.panChip}>
                <Text style={styles.panChipText}>{panBadgeText}</Text>
              </View>
            )}
            <Text
              style={[
                styles.volumePercentText,
                isDragging && { color: Colors.acqua, fontFamily: Fonts.bold },
              ]}
            >
              {isEffectivelyMuted ? 'Muted' : `${effectiveVolume}%`}
            </Text>
          </View>
        </View>
      </View>

      {/* Right '...' Track Options Button (Stereo Pan & Individual Export) */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onOpenOptions}
        style={styles.moreButton}
      >
        <Image
          source={AppAssets.images.more}
          style={styles.moreIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  instrumentButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.bottomNavBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    position: 'relative',
  },
  instrumentButtonMuted: {
    backgroundColor: '#121212',
    borderColor: '#1F1F1F',
  },
  instrumentButtonSolo: {
    borderColor: Colors.white,
    backgroundColor: '#262626',
  },
  instrumentIcon: {
    width: 30,
    height: 30,
  },
  muteBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.redAlert,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteBadgeText: {
    color: Colors.white,
    fontSize: 9,
    fontFamily: Fonts.bold,
  },
  soloButton: {
    width: 28,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.bottomNavBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  soloButtonActive: {
    backgroundColor: Colors.acqua,
    borderColor: Colors.acqua,
  },
  soloButtonText: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  soloButtonTextActive: {
    color: Colors.primaryButtonText,
  },
  metroSubBadge: {
    backgroundColor: '#222222',
    borderColor: '#333333',
  },
  metroSubText: {
    color: Colors.white,
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  volumeTrack: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.bottomNavBackground,
    marginLeft: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#252525',
  },
  volumeTrackDragging: {
    borderColor: Colors.acqua,
  },
  volumeFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
  },
  volumeThumb: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    width: 4,
    borderRadius: 2,
  },
  volumeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  trackLabel: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.medium,
    flex: 1,
    marginRight: 8,
  },
  trackLabelMuted: {
    color: Colors.smoke,
  },
  rightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  panChip: {
    backgroundColor: '#262626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#383838',
  },
  panChipText: {
    color: Colors.white,
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  volumePercentText: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.book,
    minWidth: 38,
    textAlign: 'right',
  },
  moreButton: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  moreIcon: {
    width: 18,
    height: 18,
    tintColor: Colors.cloud,
  },
});
