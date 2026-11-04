import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { pickAudioFileNative } from '../audio/nativeAudioPicker';
import { useApp } from '../context/AppContext';
import { Colors, Fonts } from '../theme/colors';
import { AppAssets } from '../theme/assets';

const QUICK_DEVICE_FILES = [
  { title: 'Studio Session Master.wav', artist: 'Rhythm Section', ext: 'WAV • 44.1 kHz' },
  { title: 'Acoustic Guitar Track.mp3', artist: 'Studio Player', ext: 'MP3 • 320 kbps' },
  { title: 'Soul Piano & Vocal Take.flac', artist: 'Vocal Studio', ext: 'FLAC • Lossless' },
  { title: 'Live Performance Mix.m4a', artist: 'Band Rehearsal', ext: 'M4A • Stereo' },
];

export default function UploadTrackModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPendingUpload } = useApp();
  const sheetBottom = Math.max(26, insets.bottom + 18);

  const [mode, setMode] = useState<'menu' | 'custom' | 'url'>('menu');
  const [isPicking, setIsPicking] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [urlInput, setUrlInput] = useState('');

  const proceedToSelectTracks = (
    title: string,
    artist: string,
    sourceType: 'files' | 'gallery' | 'url',
    sourceUrl?: string
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPendingUpload({
      title: title.replace(/\.(wav|mp3|flac|m4a|mp4|mov|wma|aac|ogg)$/i, ''),
      artist,
      sourceType,
      sourceUrl,
    });
    router.replace('/select-tracks');
  };

  /**
   * Opens the real native system Document Picker for audio files
   */
  const handlePickAudioFile = async () => {
    try {
      setIsPicking(true);
      Haptics.selectionAsync().catch(() => {});
      const result = await pickAudioFileNative();
      setIsPicking(false);

      if (result.canceled || !result.uri) {
        return;
      }

      const cleanName = (result.name || 'Imported Audio File').replace(
        /\.(wav|mp3|flac|m4a|mp4|mov|wma|aac|ogg)$/i,
        ''
      );

      proceedToSelectTracks(
        cleanName,
        'Device Audio Storage',
        'files',
        result.uri
      );
    } catch (err) {
      setIsPicking(false);
      setMode('custom');
    }
  };

  /**
   * Opens the real native system Document Picker for gallery/media videos or audio
   */
  const handlePickGalleryMedia = async () => {
    try {
      setIsPicking(true);
      Haptics.selectionAsync().catch(() => {});
      const result = await pickAudioFileNative();
      setIsPicking(false);

      if (result.canceled || !result.uri) {
        return;
      }

      const cleanName = (result.name || 'Media Audio Track').replace(
        /\.(wav|mp3|flac|m4a|mp4|mov|wma|aac|ogg)$/i,
        ''
      );

      proceedToSelectTracks(
        cleanName,
        'Gallery Audio Extract',
        'gallery',
        result.uri
      );
    } catch (err) {
      setIsPicking(false);
      setMode('custom');
    }
  };

  return (
    <View style={styles.backdrop}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => router.back()}
        style={styles.dismissArea}
      />

      <View style={[styles.sheetContainer, { paddingBottom: sheetBottom }]}>
        <View style={styles.sheetHandle} />

        {mode === 'menu' && (
          <>
            <View style={styles.headerRow}>
              <Text style={styles.sheetTitle}>Upload a track</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="close" size={24} color={Colors.cloud} />
              </TouchableOpacity>
            </View>
            <Text style={styles.formatsHint}>
              Supported formats: MP3, WAV, FLAC, M4A, MP4, MOV, WMA
            </Text>

            {isPicking && (
              <View style={styles.loadingBanner}>
                <ActivityIndicator size="small" color={Colors.white} />
                <Text style={styles.loadingBannerText}>
                  Opening file picker...
                </Text>
              </View>
            )}

            {/* Option 1: Files App (Opens Real Device Storage Picker) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickAudioFile}
              style={styles.uploadOptionCard}
            >
              <View style={styles.optionIconBox}>
                <Image
                  source={AppAssets.images.audioFile}
                  style={styles.optionIconImg}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>Files App</Text>
                <Text style={styles.optionDesc}>
                  Select real MP3, WAV, FLAC, or M4A audio files from your phone's storage.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.smoke} />
            </TouchableOpacity>

            {/* Option 2: Gallery / Camera Roll */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickGalleryMedia}
              style={styles.uploadOptionCard}
            >
              <View style={styles.optionIconBox}>
                <Ionicons name="film-outline" size={24} color={Colors.white} />
              </View>
              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>Gallery / Camera Roll</Text>
                <Text style={styles.optionDesc}>
                  Extract and separate audio from video recordings in your gallery.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.smoke} />
            </TouchableOpacity>

            {/* Option 3: Import from URL */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setMode('url')}
              style={styles.uploadOptionCard}
            >
              <View style={styles.optionIconBox}>
                <Image
                  source={AppAssets.images.link}
                  style={styles.optionIconImg}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>Import from URL</Text>
                <Text style={styles.optionDesc}>
                  Any media from cloud services or public web URLs.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.smoke} />
            </TouchableOpacity>

            {/* Option 4: Quick Demos / Manual */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setMode('custom')}
              style={styles.manualFallbackBtn}
            >
              <Ionicons name="musical-notes-outline" size={16} color={Colors.cloud} />
              <Text style={styles.manualFallbackText}>
                Or choose from studio demo tracks & custom title
              </Text>
            </TouchableOpacity>
          </>
        )}

        {mode === 'custom' && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => setMode('menu')}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={22} color={Colors.white} />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Studio Audio Tracks</Text>
              <View style={{ width: 24 }} />
            </View>

            <Text style={styles.sectionSubLabel}>QUICK AUDIO TRACKS</Text>
            {QUICK_DEVICE_FILES.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() =>
                  proceedToSelectTracks(item.title, item.artist, 'files')
                }
                style={styles.deviceFileRow}
              >
                <Image
                  source={AppAssets.images.musicalNoteWithBg}
                  style={{ width: 38, height: 38, marginRight: 12 }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.deviceFileTitle}>{item.title}</Text>
                  <Text style={styles.deviceFileMeta}>
                    {item.artist} • {item.ext}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={24} color={Colors.white} />
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionSubLabel, { marginTop: 14 }]}>
              OR ENTER CUSTOM SONG NAME
            </Text>
            <TextInput
              value={customTitle}
              onChangeText={setCustomTitle}
              placeholder="Track title (e.g., My Favorite Song)"
              placeholderTextColor={Colors.smoke}
              style={styles.inputBox}
            />
            <TextInput
              value={customArtist}
              onChangeText={setCustomArtist}
              placeholder="Artist name"
              placeholderTextColor={Colors.smoke}
              style={styles.inputBox}
            />
            <TouchableOpacity
              onPress={() =>
                proceedToSelectTracks(
                  customTitle || 'Custom Studio Track',
                  customArtist || 'Studio Artist',
                  'files'
                )
              }
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>Next: Select Track Separation</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {mode === 'url' && (
          <View>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => setMode('menu')}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={22} color={Colors.white} />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Import from a Public URL</Text>
              <View style={{ width: 24 }} />
            </View>

            <Text style={styles.formatsHint}>
              Paste a direct audio link (MP3, WAV, M4A) or cloud storage link.
            </Text>

            <View style={styles.urlInputRow}>
              <TextInput
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="https://example.com/audio-track.mp3"
                placeholderTextColor={Colors.smoke}
                autoCapitalize="none"
                style={[styles.inputBox, { flex: 1, marginBottom: 0 }]}
              />
              <TouchableOpacity
                onPress={() =>
                  setUrlInput('https://storage.shakewavessplit.app/audio/studio_master.wav')
                }
                style={styles.pasteBtn}
              >
                <Text style={styles.pasteBtnText}>Paste Demo</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={customTitle}
              onChangeText={setCustomTitle}
              placeholder="Track Title (optional)"
              placeholderTextColor={Colors.smoke}
              style={[styles.inputBox, { marginTop: 12 }]}
            />

            <TouchableOpacity
              onPress={() => {
                const derivedTitle =
                  customTitle.trim() ||
                  urlInput
                    .split('/')
                    .pop()
                    ?.replace(/\.[a-z0-9]+$/i, '')
                    ?.replace(/[-_]/g, ' ') ||
                  'Imported Cloud Track';
                proceedToSelectTracks(
                  derivedTitle,
                  'Cloud URL Import',
                  'url',
                  urlInput || 'https://storage.shakewavessplit.app/audio/track.wav'
                );
              }}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlaySheet,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: Colors.bottomNavBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
    maxHeight: '86%',
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.graphite,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    padding: 4,
  },
  sheetTitle: {
    color: Colors.white,
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  formatsHint: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginBottom: 16,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#262626',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  loadingBannerText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  uploadOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  optionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#333333',
  },
  optionIconImg: {
    width: 24,
    height: 24,
    tintColor: Colors.white,
  },
  optionTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  optionTitle: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
    marginBottom: 3,
  },
  optionDesc: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.regular,
    lineHeight: 17,
  },
  manualFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  manualFallbackText: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  sectionSubLabel: {
    color: Colors.white,
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  deviceFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222222',
  },
  deviceFileTitle: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  deviceFileMeta: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  inputBox: {
    backgroundColor: '#111111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.textInputDivider,
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.regular,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 10,
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pasteBtn: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#3E3E3E',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  pasteBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  submitButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});
