import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Colors, Fonts } from '../theme/colors';
import { AppAssets } from '../theme/assets';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(16, insets.top);
  const bottomPadding = Math.max(20, insets.bottom + 12);
  const { songs, recentSearches, addRecentSearch, clearRecentSearches } =
    useApp();

  const [query, setQuery] = useState('');

  const trimmed = query.trim().toLowerCase();
  const results = trimmed
    ? songs.filter(
        (s) =>
          s.title.toLowerCase().includes(trimmed) ||
          s.artist.toLowerCase().includes(trimmed) ||
          s.separationLabel.toLowerCase().includes(trimmed) ||
          s.originalKey.toLowerCase().includes(trimmed)
      )
    : [];

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding, paddingBottom: bottomPadding }]} edges={['top', 'bottom']}>
      {/* Top Search Bar (`fragment_search_task.xml`) */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchInputBox}>
          <Image
            source={AppAssets.images.search}
            style={styles.searchIcon}
            resizeMode="contain"
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your library"
            placeholderTextColor={Colors.smoke}
            autoFocus
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.smoke} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancelBtn}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {trimmed.length === 0 ? (
        <View style={styles.recentContainer}>
          <View style={styles.recentHeaderRow}>
            <Text style={styles.recentTitle}>Recent searches</Text>
            {recentSearches.length > 0 && (
              <TouchableOpacity onPress={clearRecentSearches}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentSearches.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setQuery(item)}
              style={styles.recentItemRow}
            >
              <Ionicons name="time-outline" size={18} color={Colors.smoke} />
              <Text style={styles.recentItemText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : results.length === 0 ? (
        <View style={styles.noResultsBox}>
          <Text style={styles.noResultsTitle}>
            No results found for "{query}"
          </Text>
          <Text style={styles.noResultsSub}>
            Please make sure your words are spelled correctly, or use less or different keywords.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                addRecentSearch(query);
                router.replace(`/mixer/${item.id}`);
              }}
              style={styles.resultRow}
            >
              <Image
                source={AppAssets.images.musicalNoteWithBg}
                style={{ width: 42, height: 42, marginRight: 12 }}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle}>{item.title}</Text>
                <Text style={styles.resultSub}>
                  {item.artist} • {item.separationLabel}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.smoke} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bottomNavBackground,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.acqua,
  },
  searchIcon: {
    width: 16,
    height: 16,
    tintColor: Colors.acqua,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  cancelBtn: {
    paddingVertical: 8,
  },
  cancelText: {
    color: Colors.cloud,
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  recentContainer: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    color: Colors.smoke,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  clearText: {
    color: Colors.acqua,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#1B1B1B',
  },
  recentItemText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  noResultsBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  noResultsTitle: {
    color: Colors.white,
    fontSize: 17,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  noResultsSub: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 19,
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryBackground,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  resultTitle: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  resultSub: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
});
