import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { Colors, Fonts } from '../theme/colors';
import { AppAssets } from '../theme/assets';
import {
  SEPARATION_PRESETS,
  SeparationPresetId,
  StemInstrumentType,
} from '../types/models';

export default function SelectTracksScreen() {
  const router = useRouter();
  const { pendingUpload, profile, uploadAndSeparateSong } = useApp();

  const initialPreset: SeparationPresetId =
    profile.defaultSeparation !== 'always_ask'
      ? profile.defaultSeparation
      : '5_vocals_drums_bass_piano_other';

  const insets = useSafeAreaInsets();
  const topPadding = Math.max(16, insets.top);
  const bottomPadding = Math.max(20, insets.bottom + 14);

  const [selectedId, setSelectedId] = useState<SeparationPresetId>(initialPreset);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('Splitting Audio Stems...');

  const draft = pendingUpload || {
    title: 'Studio Session Master',
    artist: 'ShakeWavesSplit AI',
    sourceType: 'files' as const,
  };

  const getStemIcon = (inst: StemInstrumentType) => {
    const entry = AppAssets.instruments[inst] || AppAssets.instruments.other;
    return entry.medium || entry.on;
  };

  const handleSubmit = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setIsProcessing(true);
      setProcessingStatus('Extracting & Splitting Stems...');
      const createdSong = await uploadAndSeparateSong(draft, selectedId, setAsDefault);
      setProcessingStatus('Finalizing Multi-Track Studio...');
      setTimeout(() => {
        setIsProcessing(false);
        router.replace(`/mixer/${createdSong.id}`);
      }, 350);
    } catch (e) {
      setIsProcessing(false);
      console.warn('Separation error:', e);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }]} edges={['top', 'bottom']}>
      {/* Top Bar (`fragment_select_tracks.xml`) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Select Track Separation</Text>
          <Text numberOfLines={1} style={styles.trackSubTitle}>
            {draft.title} • {draft.artist}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Standard 2 & 4 Tracks Section */}
        <Text style={styles.sectionHeader}>STANDARD SEPARATION</Text>
        {SEPARATION_PRESETS.filter((p) => !p.isNewGen).map((preset) => {
          const active = selectedId === preset.id;
          return (
            <TouchableOpacity
              key={preset.id}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setSelectedId(preset.id);
              }}
              style={[styles.presetCard, active && styles.presetCardActive]}
            >
              <View style={styles.presetHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.presetTitle,
                      active && { color: Colors.white },
                    ]}
                  >
                    {preset.title}
                  </Text>
                  <Text style={styles.presetTrackBadge}>
                    {preset.trackCount} Tracks • {preset.subtitle}
                  </Text>
                </View>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={active ? Colors.white : Colors.smoke}
                />
              </View>

              {/* Instrument Icons Row */}
              <View style={styles.stemsIconRow}>
                {preset.stems.map((s, idx) => (
                  <View key={idx} style={styles.stemPill}>
                    <Image
                      source={getStemIcon(s.instrument)}
                      style={styles.stemMiniIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.stemPillLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* New Generation Algorithms (5 Tracks, 3 Tracks, Guitar) — 100% Free & Unlocked */}
        <View style={styles.newGenBannerRow}>
          <Text style={styles.sectionHeader}>ADVANCED MULTI-TRACK SEPARATION</Text>
          <View style={styles.unlockedPill}>
            <Text style={styles.unlockedPillText}>UNLOCKED</Text>
          </View>
        </View>

        {SEPARATION_PRESETS.filter((p) => p.isNewGen).map((preset) => {
          const active = selectedId === preset.id;
          return (
            <TouchableOpacity
              key={preset.id}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setSelectedId(preset.id);
              }}
              style={[styles.presetCard, active && styles.presetCardActive]}
            >
              <View style={styles.presetHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.presetTitle,
                      active && { color: Colors.white },
                    ]}
                  >
                    {preset.title}
                  </Text>
                  <Text style={styles.presetTrackBadge}>
                    {preset.trackCount} Tracks • High-Definition Studio Stems
                  </Text>
                </View>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={active ? Colors.white : Colors.smoke}
                />
              </View>

              <View style={styles.stemsIconRow}>
                {preset.stems.map((s, idx) => (
                  <View key={idx} style={styles.stemPill}>
                    <Image
                      source={getStemIcon(s.instrument)}
                      style={styles.stemMiniIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.stemPillLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom Footer (`Set selected option to all uploads` + `Submit` button) */}
      <View style={[styles.footer, { paddingBottom: bottomPadding }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSetAsDefault((prev) => !prev)}
          style={styles.defaultCheckboxRow}
        >
          <View
            style={[
              styles.checkboxSquare,
              setAsDefault && styles.checkboxSquareChecked,
            ]}
          >
            {setAsDefault && (
              <Ionicons name="checkmark" size={14} color="#000000" />
            )}
          </View>
          <Text style={styles.defaultCheckboxText}>
            Set selected option to all uploads
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isProcessing}
          onPress={handleSubmit}
          style={styles.submitBtn}
        >
          {isProcessing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator size="small" color="#000000" />
              <Text style={styles.submitBtnText}>
                {processingStatus}
              </Text>
            </View>
          ) : (
            <Text style={styles.submitBtnText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  backButton: {
    marginRight: 14,
    padding: 4,
  },
  screenTitle: {
    color: Colors.white,
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  trackSubTitle: {
    color: Colors.acqua,
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  sectionHeader: {
    color: Colors.smoke,
    fontSize: 12,
    fontFamily: Fonts.bold,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  newGenBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  unlockedPill: {
    backgroundColor: 'rgba(99, 251, 151, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.mint,
  },
  unlockedPillText: {
    color: Colors.mint,
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  presetCard: {
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#222222',
  },
  presetCardActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#222222',
  },
  presetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  presetTitle: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.bold,
    marginBottom: 3,
  },
  presetTrackBadge: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  stemsIconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  stemMiniIcon: {
    width: 18,
    height: 18,
  },
  stemPillLabel: {
    color: Colors.cloud,
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  footer: {
    backgroundColor: Colors.bottomNavBackground,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#292929',
  },
  defaultCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.cloud,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSquareChecked: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  defaultCheckboxText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  submitBtn: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  submitBtnText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});
