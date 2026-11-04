import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../theme/colors';
import { AppAssets } from '../theme/assets';
import { LibraryTabView } from '../components/LibraryTabView';
import { ProfileTabView } from '../components/ProfileTabView';

export default function MainTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'library' | 'profile'>('library');

  const topInset = Math.max(16, insets.top);
  const bottomInset = Math.max(22, insets.bottom + 14);

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topInset }]} edges={['top', 'bottom']}>
      <View style={[styles.contentArea, { paddingBottom: 72 + bottomInset }]}>
        {activeTab === 'library' ? <LibraryTabView /> : <ProfileTabView />}
      </View>

      {/* Bottom Tab Navigator (`view_bottom_tab_navigator.xml`) */}
      <View style={[styles.bottomNavWrapper, { paddingBottom: bottomInset }]}>
        <View style={styles.bottomNavBar}>
          {/* Left Tab: Library */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setActiveTab('library');
            }}
            style={styles.tabItem}
          >
            <Ionicons
              name={activeTab === 'library' ? 'library' : 'library-outline'}
              size={22}
              color={activeTab === 'library' ? Colors.white : Colors.smoke}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'library' && styles.tabLabelActive,
              ]}
            >
              Library
            </Text>
          </TouchableOpacity>

          {/* Center Floating '+' Upload Button */}
          <View style={styles.centerButtonHolder}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                router.push('/upload');
              }}
              style={styles.centerUploadButton}
            >
              <Ionicons name="add" size={32} color="#000000" />
            </TouchableOpacity>
          </View>

          {/* Right Tab: Profile */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setActiveTab('profile');
            }}
            style={styles.tabItem}
          >
            <Image
              source={
                activeTab === 'profile'
                  ? AppAssets.images.profileSelected
                  : AppAssets.images.profileRegular
              }
              style={[
                styles.profileIcon,
                { tintColor: activeTab === 'profile' ? Colors.white : Colors.smoke },
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'profile' && styles.tabLabelActive,
              ]}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  contentArea: {
    flex: 1,
  },
  bottomNavWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.bottomNavBackground,
    borderTopWidth: 1,
    borderTopColor: '#292929',
    paddingBottom: 14,
    paddingTop: 8,
  },
  bottomNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 52,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    color: Colors.smoke,
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  tabLabelActive: {
    color: Colors.white,
    fontFamily: Fonts.bold,
  },
  profileIcon: {
    width: 21,
    height: 21,
  },
  centerButtonHolder: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerUploadButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
