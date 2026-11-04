import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { Colors, Fonts } from '../theme/colors';
import { AppAssets } from '../theme/assets';
import { SEPARATION_PRESETS, SongTask } from '../types/models';
import { transposeChord } from '../audio/chordEngine';
import { exportAudioFileToDevice } from '../audio/wavStemEngine';

export const LibraryTabView: React.FC = () => {
  const router = useRouter();
  const {
    songs,
    playlists,
    deleteSongs,
    offloadSong,
    restoreOffloadedSong,
    updateSongSettings,
    changeSongSeparation,
    createPlaylist,
    addSongToPlaylist,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'songs' | 'playlists'>('songs');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);

  // Song More Options Bottom Sheet state
  const [optionsSong, setOptionsSong] = useState<SongTask | null>(null);
  // Modals triggered from Song More Options
  const [renameModalSong, setRenameModalSong] = useState<SongTask | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameArtist, setRenameArtist] = useState('');

  const [addToPlaylistSong, setAddToPlaylistSong] = useState<SongTask | null>(null);
  const [changeSepSong, setChangeSepSong] = useState<SongTask | null>(null);

  // Create Playlist Modal state
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');

  const toggleSelectSong = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedSongIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedSongIds.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    deleteSongs(selectedSongIds);
    setSelectedSongIds([]);
    setIsEditMode(false);
  };

  const handlePressSong = (song: SongTask) => {
    if (isEditMode) {
      toggleSelectSong(song.id);
      return;
    }
    if (song.status === 'offloaded') {
      restoreOffloadedSong(song.id);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/mixer/${song.id}`);
  };

  const handleQuickExportSong = (song: SongTask, format: 'MP3' | 'WAV') => {
    try {
      const res = exportAudioFileToDevice(song, 'audio_mix', format);
      setOptionsSong(null);
      Alert.alert(
        'Export Complete',
        `Saved "${res.fileName}" (${Math.round(res.sizeBytes / 1024)} KB) to device storage.`,
        [
          {
            text: 'Share',
            onPress: () => {
              Share.share({
                title: res.fileName,
                message: `Exported ${song.title} (${song.separationLabel}) from ShakeWavesSplit Studio: ${res.uri}`,
              }).catch(() => {});
            },
          },
          { text: 'Done', style: 'cancel' },
        ]
      );
    } catch {
      Alert.alert('Export', 'Ready in studio storage.');
    }
  };

  const handleSaveRename = () => {
    if (!renameModalSong) return;
    updateSongSettings(renameModalSong.id, {
      title: renameTitle.trim() || renameModalSong.title,
      artist: renameArtist.trim() || renameModalSong.artist,
    });
    setRenameModalSong(null);
  };

  const handleCreatePlaylistSubmit = () => {
    if (!newPlaylistTitle.trim()) return;
    const pl = createPlaylist(newPlaylistTitle, newPlaylistDesc);
    setNewPlaylistTitle('');
    setNewPlaylistDesc('');
    setShowCreatePlaylist(false);
    if (addToPlaylistSong) {
      addSongToPlaylist(pl.id, addToPlaylistSong.id);
      setAddToPlaylistSong(null);
    }
  };

  const renderSongItem = ({ item }: { item: SongTask }) => {
    const isSelected = selectedSongIds.includes(item.id);
    const effectiveBpm = Math.round(item.originalBpm * item.speedMultiplier);
    const effectiveKey = transposeChord(item.originalKey, item.pitchSemitones);

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => handlePressSong(item)}
        onLongPress={() => {
          if (!isEditMode) {
            setIsEditMode(true);
            setSelectedSongIds([item.id]);
          }
        }}
        style={[styles.songRow, isSelected && styles.songRowSelected]}
      >
        {isEditMode ? (
          <View
            style={[
              styles.checkboxCircle,
              isSelected && styles.checkboxCircleSelected,
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={15} color={Colors.primaryButtonText} />
            )}
          </View>
        ) : (
          <View style={styles.songLeadingIconBox}>
            <Image
              source={AppAssets.images.musicalNoteWithBg}
              style={styles.songLeadingImage}
              resizeMode="contain"
            />
            <View style={styles.stemCountBadge}>
              <Text style={styles.stemCountBadgeText}>{item.stems.length}</Text>
            </View>
          </View>
        )}

        <View style={styles.songTextCol}>
          <Text numberOfLines={1} style={styles.songTitle}>
            {item.title}
          </Text>
          <Text numberOfLines={1} style={styles.songSubtitle}>
            {item.separationLabel}
          </Text>
          <View style={styles.songMetaChips}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{effectiveKey}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{effectiveBpm} BPM</Text>
            </View>
            {item.status === 'offloaded' ? (
              <View style={[styles.metaChip, { backgroundColor: '#292012' }]}>
                <Ionicons name="cloud-download-outline" size={11} color={Colors.warning} />
                <Text style={[styles.metaChipText, { color: Colors.warning }]}>
                  Cloud (Tap to download)
                </Text>
              </View>
            ) : (
              <View style={[styles.metaChip, { backgroundColor: 'rgba(99, 251, 151, 0.12)' }]}>
                <Ionicons name="checkmark-circle" size={11} color={Colors.mint} />
                <Text style={[styles.metaChipText, { color: Colors.mint }]}>
                  Ready
                </Text>
              </View>
            )}
          </View>
        </View>

        {!isEditMode && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setOptionsSong(item);
            }}
            style={styles.songMoreBtn}
          >
            <Image
              source={AppAssets.images.more}
              style={styles.moreIconImg}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header: "Library" + "Edit" / "Cancel" + "Delete" */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Library</Text>
        <View style={styles.headerRightActions}>
          {activeSubTab === 'songs' && songs.length > 0 && (
            <>
              {isEditMode && selectedSongIds.length > 0 && (
                <TouchableOpacity
                  onPress={handleDeleteSelected}
                  style={styles.deleteHeaderBtn}
                >
                  <Text style={styles.deleteHeaderBtnText}>
                    Delete ({selectedSongIds.length})
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  setIsEditMode((prev) => !prev);
                  setSelectedSongIds([]);
                }}
                style={styles.editHeaderBtn}
              >
                <Text style={styles.editHeaderBtnText}>
                  {isEditMode ? 'Cancel' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </>
          )}
          {activeSubTab === 'playlists' && (
            <TouchableOpacity
              onPress={() => setShowCreatePlaylist(true)}
              style={styles.newPlaylistHeaderBtn}
            >
              <Ionicons name="add" size={18} color={Colors.acqua} />
              <Text style={styles.newPlaylistHeaderText}>New playlist</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Bar (`fragment_home.xml` -> opens `/search`) */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/search')}
        style={styles.searchBarButton}
      >
        <Image
          source={AppAssets.images.search}
          style={styles.searchIcon}
          resizeMode="contain"
        />
        <Text style={styles.searchPlaceholder}>Search your library</Text>
      </TouchableOpacity>

      {/* Sub-Tabs (`Songs` | `Playlists`) with Cyan Indicator */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setActiveSubTab('songs');
            setIsEditMode(false);
          }}
          style={[
            styles.subTabButton,
            activeSubTab === 'songs' && styles.subTabButtonActive,
          ]}
        >
          <Text
            style={[
              styles.subTabText,
              activeSubTab === 'songs' && styles.subTabTextActive,
            ]}
          >
            Songs ({songs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setActiveSubTab('playlists');
            setIsEditMode(false);
          }}
          style={[
            styles.subTabButton,
            activeSubTab === 'playlists' && styles.subTabButtonActive,
          ]}
        >
          <Text
            style={[
              styles.subTabText,
              activeSubTab === 'playlists' && styles.subTabTextActive,
            ]}
          >
            Playlists ({playlists.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      {activeSubTab === 'songs' ? (
        songs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image
              source={AppAssets.images.musicalNoteWithBg}
              style={styles.emptyIcon}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button below to upload and separate vocals & instruments from any song.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/upload')}
              style={styles.primaryCtaButton}
            >
              <Text style={styles.primaryCtaButtonText}>Upload a track</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={songs}
            keyExtractor={(item) => item.id}
            renderItem={renderSongItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : playlists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image
            source={AppAssets.images.playlistCover}
            style={styles.emptyPlaylistImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>Nothing here</Text>
          <Text style={styles.emptySubtitle}>
            Create playlists to organize your songs.
          </Text>
          <TouchableOpacity
            onPress={() => setShowCreatePlaylist(true)}
            style={styles.primaryCtaButton}
          >
            <Text style={styles.primaryCtaButtonText}>New playlist</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push(`/playlist/${item.id}`)}
              style={styles.playlistRow}
            >
              <Image
                source={AppAssets.images.playlistCover}
                style={styles.playlistCoverThumb}
                resizeMode="cover"
              />
              <View style={styles.playlistTextCol}>
                <Text numberOfLines={1} style={styles.playlistTitle}>
                  {item.title}
                </Text>
                <Text numberOfLines={1} style={styles.playlistDesc}>
                  {item.description || 'Custom Studio Playlist'}
                </Text>
                <Text style={styles.playlistCount}>
                  {item.songIds.length} {item.songIds.length === 1 ? 'song' : 'songs'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.smoke} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Song More Options Bottom Sheet (`fragment_song_more_options.xml`) */}
      <Modal
        visible={!!optionsSong}
        transparent
        animationType="slide"
        onRequestClose={() => setOptionsSong(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setOptionsSong(null)}
          style={styles.sheetBackdrop}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            {optionsSong && (
              <>
                <View style={styles.sheetSongHeader}>
                  <Image
                    source={AppAssets.images.musicalNoteWithBg}
                    style={{ width: 42, height: 42 }}
                    resizeMode="contain"
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text numberOfLines={1} style={styles.sheetSongTitle}>
                      {optionsSong.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.sheetSongSubtitle}>
                      {optionsSong.separationLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.sheetDivider} />

                {/* Option 1: Open in Studio Mixer */}
                <TouchableOpacity
                  style={styles.sheetActionRow}
                  onPress={() => {
                    const target = optionsSong;
                    setOptionsSong(null);
                    router.push(`/mixer/${target.id}`);
                  }}
                >
                  <Ionicons name="options-outline" size={22} color={Colors.acqua} />
                  <Text style={[styles.sheetActionText, { color: Colors.acqua }]}>
                    Open in Multi-Track Mixer
                  </Text>
                </TouchableOpacity>

                {/* Option 2: Add to a playlist */}
                <TouchableOpacity
                  style={styles.sheetActionRow}
                  onPress={() => {
                    const target = optionsSong;
                    setOptionsSong(null);
                    setAddToPlaylistSong(target);
                  }}
                >
                  <Ionicons name="list-outline" size={22} color={Colors.white} />
                  <Text style={styles.sheetActionText}>Add to a playlist</Text>
                </TouchableOpacity>

                {/* Option 3: Change Track Separation (2/3/4/5 Stems) */}
                <TouchableOpacity
                  style={styles.sheetActionRow}
                  onPress={() => {
                    const target = optionsSong;
                    setOptionsSong(null);
                    setChangeSepSong(target);
                  }}
                >
                  <Ionicons name="git-branch-outline" size={22} color={Colors.white} />
                  <Text style={styles.sheetActionText}>
                    Change track separation ({optionsSong.stems.length} tracks)
                  </Text>
                </TouchableOpacity>

                {/* Option 4: Rename (`fragment_edit_song.xml`) */}
                <TouchableOpacity
                  style={styles.sheetActionRow}
                  onPress={() => {
                    const target = optionsSong;
                    setRenameTitle(target.title);
                    setRenameArtist(target.artist);
                    setOptionsSong(null);
                    setRenameModalSong(target);
                  }}
                >
                  <Ionicons name="pencil-outline" size={22} color={Colors.white} />
                  <Text style={styles.sheetActionText}>Rename</Text>
                </TouchableOpacity>

                {/* Option 5: Export (WAV / MP3) */}
                <TouchableOpacity
                  style={styles.sheetActionRow}
                  onPress={() => handleQuickExportSong(optionsSong, 'WAV')}
                >
                  <Ionicons name="download-outline" size={22} color={Colors.white} />
                  <Text style={styles.sheetActionText}>Export Master Mix (Lossless WAV)</Text>
                </TouchableOpacity>

                {/* Option 6: Offload from device */}
                <TouchableOpacity
                  style={styles.sheetActionRow}
                  onPress={() => {
                    if (optionsSong.status === 'offloaded') {
                      restoreOffloadedSong(optionsSong.id);
                    } else {
                      offloadSong(optionsSong.id);
                    }
                    setOptionsSong(null);
                  }}
                >
                  <Ionicons name="cloud-outline" size={22} color={Colors.white} />
                  <Text style={styles.sheetActionText}>
                    {optionsSong.status === 'offloaded'
                      ? 'Download to device'
                      : 'Offload from device'}
                  </Text>
                </TouchableOpacity>

                {/* Option 7: Delete from Library */}
                <TouchableOpacity
                  style={styles.sheetActionRow}
                  onPress={() => {
                    const id = optionsSong.id;
                    setOptionsSong(null);
                    deleteSongs([id]);
                  }}
                >
                  <Ionicons name="trash-outline" size={22} color={Colors.red} />
                  <Text style={[styles.sheetActionText, { color: Colors.red }]}>
                    Delete from Library
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Rename Song Modal (`fragment_edit_song.xml`) */}
      <Modal
        visible={!!renameModalSong}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalSong(null)}
      >
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Edit name</Text>
            <Text style={styles.inputLabel}>Song title</Text>
            <TextInput
              value={renameTitle}
              onChangeText={setRenameTitle}
              placeholder="Song title"
              placeholderTextColor={Colors.smoke}
              style={styles.textInput}
            />
            <Text style={styles.inputLabel}>Artist</Text>
            <TextInput
              value={renameArtist}
              onChangeText={setRenameArtist}
              placeholder="Artist name"
              placeholderTextColor={Colors.smoke}
              style={styles.textInput}
            />
            <View style={styles.dialogButtonsRow}>
              <TouchableOpacity
                onPress={() => setRenameModalSong(null)}
                style={styles.dialogSecondaryBtn}
              >
                <Text style={styles.dialogSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveRename}
                style={styles.dialogPrimaryBtn}
              >
                <Text style={styles.dialogPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add to Playlist Bottom Sheet (`fragment_add_task_to_playlist.xml`) */}
      <Modal
        visible={!!addToPlaylistSong}
        transparent
        animationType="slide"
        onRequestClose={() => setAddToPlaylistSong(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setAddToPlaylistSong(null)}
          style={styles.sheetBackdrop}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetHeaderTitle}>Add to a playlist</Text>

            <TouchableOpacity
              onPress={() => setShowCreatePlaylist(true)}
              style={styles.newPlaylistInSheetBtn}
            >
              <Ionicons name="add-circle" size={22} color={Colors.acqua} />
              <Text style={styles.newPlaylistInSheetText}>New playlist</Text>
            </TouchableOpacity>

            {playlists.map((pl) => {
              const alreadyIn = addToPlaylistSong
                ? pl.songIds.includes(addToPlaylistSong.id)
                : false;
              return (
                <TouchableOpacity
                  key={pl.id}
                  style={styles.sheetActionRow}
                  onPress={() => {
                    if (addToPlaylistSong) {
                      addSongToPlaylist(pl.id, addToPlaylistSong.id);
                    }
                    setAddToPlaylistSong(null);
                  }}
                >
                  <Ionicons
                    name={alreadyIn ? 'checkmark-circle' : 'musical-notes-outline'}
                    size={20}
                    color={alreadyIn ? Colors.mint : Colors.white}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetActionText}>{pl.title}</Text>
                    <Text style={{ color: Colors.smoke, fontSize: 12, fontFamily: Fonts.regular }}>
                      {pl.songIds.length} songs
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Change Track Separation Modal (All 2/3/4/5-Track Presets Unlocked!) */}
      <Modal
        visible={!!changeSepSong}
        transparent
        animationType="slide"
        onRequestClose={() => setChangeSepSong(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setChangeSepSong(null)}
          style={styles.sheetBackdrop}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetHeaderTitle}>Select Track Separation</Text>
            <Text style={styles.sheetHeaderSub}>
              NEW GENERATION ALGORITHMS • ALL UNLOCKED
            </Text>
            {SEPARATION_PRESETS.map((preset) => {
              const isCurrent = changeSepSong?.separationId === preset.id;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetOptionRow,
                    isCurrent && styles.presetOptionRowActive,
                  ]}
                  onPress={() => {
                    if (changeSepSong) {
                      changeSongSeparation(changeSepSong.id, preset.id);
                    }
                    setChangeSepSong(null);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.presetOptionTitle,
                        isCurrent && { color: Colors.acqua },
                      ]}
                    >
                      {preset.title} ({preset.trackCount} Tracks)
                    </Text>
                    <Text style={styles.presetOptionSub}>{preset.subtitle}</Text>
                  </View>
                  <Ionicons
                    name={isCurrent ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={isCurrent ? Colors.acqua : Colors.smoke}
                  />
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Create Playlist Modal (`fragment_create_playlist.xml`) */}
      <Modal
        visible={showCreatePlaylist}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreatePlaylist(false)}
      >
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>New playlist</Text>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              value={newPlaylistTitle}
              onChangeText={setNewPlaylistTitle}
              placeholder="Give your playlist a title"
              placeholderTextColor={Colors.smoke}
              style={styles.textInput}
            />
            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              value={newPlaylistDesc}
              onChangeText={setNewPlaylistDesc}
              placeholder="Describe your playlist"
              placeholderTextColor={Colors.smoke}
              style={styles.textInput}
            />
            <View style={styles.dialogButtonsRow}>
              <TouchableOpacity
                onPress={() => setShowCreatePlaylist(false)}
                style={styles.dialogSecondaryBtn}
              >
                <Text style={styles.dialogSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreatePlaylistSubmit}
                style={styles.dialogPrimaryBtn}
              >
                <Text style={styles.dialogPrimaryText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 28,
    fontFamily: Fonts.bold,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editHeaderBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  editHeaderBtnText: {
    color: Colors.cloud,
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  deleteHeaderBtn: {
    backgroundColor: Colors.redAlpha15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  deleteHeaderBtnText: {
    color: Colors.red,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  newPlaylistHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#222222',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  newPlaylistHeaderText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  searchBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bottomNavBackground,
    marginHorizontal: 18,
    marginBottom: 14,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#292929',
  },
  searchIcon: {
    width: 18,
    height: 18,
    tintColor: Colors.smoke,
    marginRight: 10,
  },
  searchPlaceholder: {
    color: Colors.smoke,
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    paddingHorizontal: 18,
  },
  subTabButton: {
    paddingVertical: 10,
    marginRight: 28,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  subTabButtonActive: {
    borderBottomColor: Colors.acqua,
  },
  subTabText: {
    color: Colors.smoke,
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
  subTabTextActive: {
    color: Colors.white,
    fontFamily: Fonts.bold,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 110,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  songRowSelected: {
    borderColor: Colors.acqua,
    backgroundColor: Colors.primaryDarkBlue,
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.smoke,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleSelected: {
    backgroundColor: Colors.acqua,
    borderColor: Colors.acqua,
  },
  songLeadingIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#1B1B1B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  songLeadingImage: {
    width: 36,
    height: 36,
  },
  stemCountBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.acqua,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  stemCountBadgeText: {
    color: Colors.primaryButtonText,
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  songTextCol: {
    flex: 1,
  },
  songTitle: {
    color: Colors.taskTitleAvailable,
    fontSize: 16,
    fontFamily: Fonts.bold,
    marginBottom: 3,
  },
  songSubtitle: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginBottom: 6,
  },
  songMetaChips: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  metaChipText: {
    color: Colors.cloud,
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  songMoreBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreIconImg: {
    width: 18,
    height: 18,
    tintColor: Colors.cloud,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  playlistCoverThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
    marginRight: 14,
  },
  playlistTextCol: {
    flex: 1,
  },
  playlistTitle: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  playlistDesc: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginBottom: 4,
  },
  playlistCount: {
    color: Colors.acqua,
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    marginBottom: 16,
  },
  emptyPlaylistImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
    borderRadius: 16,
  },
  emptyTitle: {
    color: Colors.white,
    fontSize: 20,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: Colors.cloud,
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  primaryCtaButton: {
    backgroundColor: Colors.acqua,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 10,
  },
  primaryCtaButtonText: {
    color: Colors.primaryButtonText,
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlaySheet,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: Colors.bottomNavBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  sheetSongHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetSongTitle: {
    color: Colors.white,
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
  sheetSongSubtitle: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#2C2C2C',
    marginBottom: 8,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 14,
  },
  sheetActionText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  sheetHeaderTitle: {
    color: Colors.white,
    fontSize: 19,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  sheetHeaderSub: {
    color: Colors.acqua,
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 0.7,
    marginBottom: 12,
  },
  newPlaylistInSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
    marginBottom: 6,
  },
  newPlaylistInSheetText: {
    color: Colors.acqua,
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  presetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#141414',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#292929',
  },
  presetOptionRowActive: {
    borderColor: Colors.acqua,
    backgroundColor: Colors.primaryDarkBlue,
  },
  presetOptionTitle: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  presetOptionSub: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  dialogBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlayDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: Colors.bottomNavBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  dialogTitle: {
    color: Colors.white,
    fontSize: 19,
    fontFamily: Fonts.bold,
    marginBottom: 14,
  },
  inputLabel: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#111111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.textInputDivider,
    color: Colors.white,
    fontFamily: Fonts.regular,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 4,
  },
  dialogSecondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#292929',
  },
  dialogSecondaryText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  dialogPrimaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.acqua,
  },
  dialogPrimaryText: {
    color: Colors.primaryButtonText,
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
});
