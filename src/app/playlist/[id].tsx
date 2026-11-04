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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';
import { Colors, Fonts } from '../../theme/colors';
import { AppAssets } from '../../theme/assets';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(16, insets.top);
  const bottomPadding = Math.max(20, insets.bottom + 12);
  const {
    playlists,
    songs,
    updatePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
  } = useApp();

  const playlist = playlists.find((p) => p.id === id);

  const [showAddSongsModal, setShowAddSongsModal] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState(playlist?.title || '');
  const [editDesc, setEditDesc] = useState(playlist?.description || '');

  if (!playlist) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Playlist not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const playlistSongs = songs.filter((s) => playlist.songIds.includes(s.id));
  const availableToAdd = songs.filter((s) => !playlist.songIds.includes(s.id));

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding, paddingBottom: bottomPadding }]} edges={['top', 'bottom']}>
      {/* Top Toolbar (`fragment_playlist.xml`) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text numberOfLines={1} style={styles.topBarTitle}>
          {playlist.title}
        </Text>
        <TouchableOpacity
          onPress={() => setShowMoreOptions(true)}
          style={styles.iconBtn}
        >
          <Image
            source={AppAssets.images.more}
            style={{ width: 20, height: 20, tintColor: Colors.white }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Playlist Header Card */}
      <View style={styles.heroCard}>
        <Image
          source={AppAssets.images.playlistCover}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroInfoCol}>
          <Text style={styles.heroTitle}>{playlist.title}</Text>
          {!!playlist.description && (
            <Text style={styles.heroDesc}>{playlist.description}</Text>
          )}
          <Text style={styles.heroCount}>
            {playlistSongs.length}{' '}
            {playlistSongs.length === 1 ? 'song' : 'songs'}
          </Text>
          <View style={styles.heroButtonsRow}>
            <TouchableOpacity
              onPress={() => setShowAddSongsModal(true)}
              style={styles.addSongBtn}
            >
              <Ionicons name="add" size={18} color={Colors.primaryButtonText} />
              <Text style={styles.addSongBtnText}>Add songs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/upload')}
              style={styles.uploadNewBtn}
            >
              <Ionicons name="cloud-upload-outline" size={16} color={Colors.acqua} />
              <Text style={styles.uploadNewBtnText}>Upload new</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Songs List in Playlist */}
      {playlistSongs.length === 0 ? (
        <View style={styles.emptyBox}>
          <Image
            source={AppAssets.images.musicalNoteWithBg}
            style={{ width: 64, height: 64, marginBottom: 14 }}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>Nothing here</Text>
          <Text style={styles.emptySub}>
            Start adding songs to your playlist.
          </Text>
          <TouchableOpacity
            onPress={() => setShowAddSongsModal(true)}
            style={[styles.addSongBtn, { marginTop: 16, paddingHorizontal: 22 }]}
          >
            <Text style={styles.addSongBtnText}>From my Library</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={playlistSongs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push(`/mixer/${item.id}`)}
              style={styles.songRow}
            >
              <Image
                source={AppAssets.images.musicalNoteWithBg}
                style={{ width: 42, height: 42, marginRight: 12 }}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.songTitle}>
                  {item.title}
                </Text>
                <Text numberOfLines={1} style={styles.songSubtitle}>
                  {item.separationLabel}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  removeSongFromPlaylist(playlist.id, item.id);
                }}
                style={styles.removeBtn}
              >
                <Ionicons name="remove-circle-outline" size={22} color={Colors.red} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add Songs from Library Modal */}
      <Modal
        visible={showAddSongsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddSongsModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowAddSongsModal(false)}
          style={styles.sheetBackdrop}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add from my Library</Text>
            {availableToAdd.length === 0 ? (
              <Text style={styles.emptySub}>
                All songs in your library are already in this playlist.
              </Text>
            ) : (
              availableToAdd.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    addSongToPlaylist(playlist.id, s.id);
                  }}
                  style={styles.addSongOptionRow}
                >
                  <Image
                    source={AppAssets.images.musicalNoteWithBg}
                    style={{ width: 36, height: 36, marginRight: 12 }}
                    resizeMode="contain"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.songTitle}>{s.title}</Text>
                    <Text style={styles.songSubtitle}>{s.separationLabel}</Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={Colors.acqua} />
                </TouchableOpacity>
              ))
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Playlist More Options Sheet (`fragment_playlist_more_options.xml`) */}
      <Modal
        visible={showMoreOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoreOptions(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowMoreOptions(false)}
          style={styles.sheetBackdrop}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{playlist.title}</Text>
            <TouchableOpacity
              onPress={() => {
                setShowMoreOptions(false);
                setEditTitle(playlist.title);
                setEditDesc(playlist.description);
                setShowEditModal(true);
              }}
              style={styles.menuRow}
            >
              <Ionicons name="pencil-outline" size={20} color={Colors.white} />
              <Text style={styles.menuRowText}>Edit playlist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowMoreOptions(false);
                deletePlaylist(playlist.id);
                router.back();
              }}
              style={styles.menuRow}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.red} />
              <Text style={[styles.menuRowText, { color: Colors.red }]}>
                Delete playlist
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit Playlist Modal (`fragment_edit_playlist.xml`) */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Edit playlist</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Playlist title"
              placeholderTextColor={Colors.smoke}
              style={styles.inputBox}
            />
            <TextInput
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Description"
              placeholderTextColor={Colors.smoke}
              style={styles.inputBox}
            />
            <TouchableOpacity
              onPress={() => {
                updatePlaylist(playlist.id, editTitle, editDesc);
                setShowEditModal(false);
              }}
              style={[styles.addSongBtn, { justifyContent: 'center', paddingVertical: 13 }]}
            >
              <Text style={styles.addSongBtnText}>Save changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: Colors.white,
    fontSize: 17,
    fontFamily: Fonts.bold,
    flex: 1,
    textAlign: 'center',
  },
  heroCard: {
    flexDirection: 'row',
    backgroundColor: Colors.secondaryBackground,
    margin: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222222',
  },
  heroImage: {
    width: 92,
    height: 92,
    borderRadius: 12,
    marginRight: 14,
  },
  heroInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  heroTitle: {
    color: Colors.white,
    fontSize: 19,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  heroDesc: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginBottom: 4,
  },
  heroCount: {
    color: Colors.acqua,
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginBottom: 10,
  },
  heroButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addSongBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.acqua,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addSongBtnText: {
    color: Colors.primaryButtonText,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  uploadNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryDarkBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.acqua,
  },
  uploadNewBtnText: {
    color: Colors.acqua,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryBackground,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  songTitle: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  songSubtitle: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  removeBtn: {
    padding: 6,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: Colors.white,
    fontSize: 19,
    fontFamily: Fonts.bold,
    marginBottom: 6,
  },
  emptySub: {
    color: Colors.cloud,
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlaySheet,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: Colors.bottomNavBackground,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
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
  sheetTitle: {
    color: Colors.white,
    fontSize: 19,
    fontFamily: Fonts.bold,
    marginBottom: 14,
  },
  addSongOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#292929',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  menuRowText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  inputBox: {
    backgroundColor: '#111111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.textInputDivider,
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.regular,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
});
