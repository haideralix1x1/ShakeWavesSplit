import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '../theme/colors';
import { generateChordTimeline } from '../audio/chordEngine';

interface ChordsBarProps {
  chordProgression: string[];
  originalBpm: number;
  durationSec: number;
  pitchSemitones: number;
  currentTimeSec: number;
  speedMultiplier: number;
  visible: boolean;
}

/**
 * Exact replica of `view_chords.xml` (`ai.moises.ui.widget.ChordsView` & `TextCarousel`).
 * Displays synchronized beat-by-beat chord boxes with Beat 1 showing the transposed chord
 * and Beats 2, 3, 4 showing beat subdivision bars "|", completely unlocked for the entire song!
 */
export const ChordsBar: React.FC<ChordsBarProps> = ({
  chordProgression,
  originalBpm,
  durationSec,
  pitchSemitones,
  currentTimeSec,
  speedMultiplier,
  visible,
}) => {
  const slots = useMemo(
    () =>
      generateChordTimeline(
        chordProgression,
        originalBpm,
        durationSec,
        pitchSemitones
      ),
    [chordProgression, originalBpm, durationSec, pitchSemitones]
  );

  if (!visible) return null;

  // Map playback time into beat slot index
  const effectiveSongTime = currentTimeSec * Math.max(0.5, speedMultiplier || 1.0);
  const secPerBeat = 60 / Math.max(40, originalBpm || 120);
  const activeBeatIndex = Math.max(
    0,
    Math.min(slots.length - 1, Math.floor(effectiveSongTime / secPerBeat))
  );

  const currentSlot = slots[activeBeatIndex] || slots[0];
  // Find the next bar's chord
  const nextBarSlot =
    slots.find((s) => s.bar > currentSlot.bar && s.beatInBar === 1) || slots[0];

  // Show 5 beat cells centered around activeBeatIndex: [active - 1, active, active + 1, active + 2, active + 3]
  const windowOffsets = [-1, 0, 1, 2, 3];

  return (
    <View style={styles.container}>
      <View style={styles.carouselRow}>
        {windowOffsets.map((offset) => {
          const idx = activeBeatIndex + offset;
          const slot = idx >= 0 && idx < slots.length ? slots[idx] : null;
          const isCurrent = offset === 0;
          const isPast = offset < 0;

          if (!slot) {
            return <View key={`empty_${offset}`} style={styles.beatCell} />;
          }

          // In Moises ChordsView, Beat 1 of a bar shows the chord name, or if it's the active slot we always show the active chord
          const showChordText = slot.beatInBar === 1 || isCurrent;

          return (
            <View
              key={`slot_${idx}`}
              style={[
                styles.beatCell,
                isCurrent && styles.beatCellActive,
                isPast && styles.beatCellPast,
              ]}
            >
              {showChordText ? (
                <Text
                  style={[
                    styles.chordText,
                    isCurrent && styles.chordTextActive,
                    isPast && styles.chordTextPast,
                  ]}
                >
                  {slot.baseChord}
                </Text>
              ) : (
                <View
                  style={[
                    styles.subdivisionTick,
                    isPast && { backgroundColor: '#333333' },
                  ]}
                />
              )}
              <Text style={styles.beatNumberBadge}>
                {slot.beatInBar}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Bottom status strip showing Current Chord, Beat in Bar, and Next Chord */}
      <View style={styles.metaRow}>
        <View style={styles.metaBadge}>
          <Text style={styles.metaLabel}>CHORD</Text>
          <Text style={styles.metaValueHighlight}>{currentSlot?.baseChord || 'Am'}</Text>
        </View>
        <View style={styles.beatDotsRow}>
          {[1, 2, 3, 4].map((b) => (
            <View
              key={b}
              style={[
                styles.beatDot,
                currentSlot?.beatInBar === b && styles.beatDotActive,
              ]}
            />
          ))}
        </View>
        <View style={styles.metaBadge}>
          <Text style={styles.metaLabel}>NEXT</Text>
          <Text style={styles.metaValue}>{nextBarSlot?.baseChord || 'F'}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.secondaryBackground,
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 10,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#222222',
  },
  carouselRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  beatCell: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#191919',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#262626',
  },
  beatCellActive: {
    backgroundColor: '#262626',
    borderColor: Colors.white,
    borderWidth: 1.5,
  },
  beatCellPast: {
    opacity: 0.45,
  },
  chordText: {
    color: Colors.cloud,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  chordTextActive: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  chordTextPast: {
    color: Colors.smoke,
  },
  subdivisionTick: {
    width: 2,
    height: 16,
    borderRadius: 1,
    backgroundColor: Colors.smoke,
  },
  beatNumberBadge: {
    position: 'absolute',
    bottom: 3,
    right: 5,
    fontSize: 9,
    color: Colors.smoke,
    fontFamily: Fonts.regular,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    color: Colors.smoke,
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.6,
  },
  metaValueHighlight: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  metaValue: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  beatDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  beatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#333333',
  },
  beatDotActive: {
    backgroundColor: Colors.white,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
