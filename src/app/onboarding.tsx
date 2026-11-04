import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../theme/colors';
import { AppAssets } from '../theme/assets';

const ONBOARDING_SLIDES = [
  {
    id: 1,
    highlightPrefix: 'Upload and separate vocals & instruments from ',
    highlightAccent: 'any song',
    highlightSuffix: '',
    subtitle: 'The easiest way to play-along with your favorite music like a pro.',
    stemsPreview: [
      { label: 'Vocals', pct: 88, icon: AppAssets.instruments.vocals.on },
      { label: 'Drums', pct: 76, icon: AppAssets.instruments.drums.on },
      { label: 'Bass', pct: 82, icon: AppAssets.instruments.bass.on },
      { label: 'Piano / Keys', pct: 90, icon: AppAssets.instruments.keys.on },
    ],
  },
  {
    id: 2,
    highlightPrefix: '',
    highlightAccent: 'Add metronome',
    highlightSuffix: ', change the song key, speed, & view chords',
    subtitle: 'Elevate your music practice experience with the power of AI.',
    stemsPreview: [
      { label: 'AI Chords: Am → F → C → G', pct: 100, icon: AppAssets.images.chordsList },
      { label: 'Smart Metronome (120 BPM • 1x)', pct: 85, icon: AppAssets.images.metronome },
      { label: 'Pitch Shift (-12 to +12 st)', pct: 75, icon: AppAssets.instruments.guitar.on },
    ],
  },
  {
    id: 3,
    highlightPrefix: '',
    highlightAccent: 'Export',
    highlightSuffix: ' high-quality isolated tracks',
    subtitle: 'Mix, edit, and share lossless WAV, MP3 & M4A stems with friends.',
    stemsPreview: [
      { label: 'Separated Stems (Lossless WAV)', pct: 100, icon: AppAssets.images.downloadWav },
      { label: 'Master Audio Mix (Stereo Pan)', pct: 95, icon: AppAssets.images.mixFile },
      { label: 'All Premium Features Unlocked', pct: 100, icon: AppAssets.images.positiveThumb },
    ],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const slide = ONBOARDING_SLIDES[step];

  const handleNext = () => {
    Haptics.selectionAsync().catch(() => {});
    if (step < ONBOARDING_SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* SegmentedProgressIndicatorView (`fragment_onboarding.xml`) */}
      <View style={styles.progressRow}>
        {ONBOARDING_SLIDES.map((s, idx) => (
          <View key={s.id} style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                idx <= step && { width: '100%', backgroundColor: Colors.acqua },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Top Brand Header */}
      <View style={styles.brandRow}>
        <Image
          source={AppAssets.images.splashLogo}
          style={{ width: 32, height: 32, marginRight: 10 }}
          resizeMode="contain"
        />
        <Text style={styles.brandTitle}>ShakeWavesSplit</Text>
      </View>

      {/* Center Interactive Showcase Card (`fragment_onboarding_page.xml`) */}
      <View style={styles.showcaseCard}>
        <View style={styles.videoBadgeRow}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI STUDIO ENGINE • SLIDE {step + 1}/3</Text>
          </View>
        </View>

        {slide.stemsPreview.map((row, idx) => (
          <View key={idx} style={styles.previewRow}>
            <View style={styles.previewIconBox}>
              <Image
                source={row.icon}
                style={{ width: 26, height: 26 }}
                resizeMode="contain"
              />
            </View>
            <View style={styles.previewBarTrack}>
              <View
                style={[styles.previewBarFill, { width: `${row.pct}%` }]}
              />
              <Text style={styles.previewBarLabel}>{row.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Headline & Subtitle (`fragment_onboarding_page.xml`) */}
      <View style={styles.textSection}>
        <Text style={styles.headlineText}>
          {slide.highlightPrefix}
          <Text style={styles.headlineAccent}>{slide.highlightAccent}</Text>
          {slide.highlightSuffix}
        </Text>
        <Text style={styles.subtitleText}>{slide.subtitle}</Text>
      </View>

      {/* Bottom Navigation Buttons (`Back` | `Next` / `Get started`) */}
      <View style={styles.footerRow}>
        {step > 0 ? (
          <TouchableOpacity
            onPress={() => setStep(step - 1)}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.replace('/')}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>Skip</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>
            {step === ONBOARDING_SLIDES.length - 1 ? 'Get started' : 'Next'}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={Colors.primaryButtonText}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.black,
    paddingHorizontal: 22,
    justifyContent: 'space-between',
    paddingBottom: 26,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#292929',
    overflow: 'hidden',
  },
  progressFill: {
    width: '0%',
    height: '100%',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  brandTitle: {
    color: Colors.white,
    fontSize: 22,
    fontFamily: Fonts.bold,
    letterSpacing: 0.4,
  },
  showcaseCard: {
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262626',
  },
  videoBadgeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  aiBadge: {
    backgroundColor: Colors.primaryDarkBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.acqua,
  },
  aiBadgeText: {
    color: Colors.acqua,
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.7,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  previewIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1B1B1B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  previewBarTrack: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1B1B1B',
    justifyContent: 'center',
    paddingHorizontal: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  previewBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 218, 232, 0.22)',
  },
  previewBarLabel: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  textSection: {
    paddingHorizontal: 4,
  },
  headlineText: {
    color: Colors.white,
    fontSize: 26,
    fontFamily: Fonts.bold,
    lineHeight: 34,
    marginBottom: 12,
  },
  headlineAccent: {
    color: Colors.acqua,
  },
  subtitleText: {
    color: Colors.cloud,
    fontSize: 15,
    fontFamily: Fonts.regular,
    lineHeight: 22,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  backBtn: {
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: Colors.bottomNavBackground,
  },
  backBtnText: {
    color: Colors.cloud,
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.acqua,
    paddingVertical: 15,
    borderRadius: 12,
  },
  nextBtnText: {
    color: Colors.primaryButtonText,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});
