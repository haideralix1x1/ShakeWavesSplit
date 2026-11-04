import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
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
import {
  GOAL_ITEMS,
  SEPARATION_PRESETS,
  SKILL_ITEMS,
  SkillInstrumentId,
} from '../types/models';

export const ProfileTabView: React.FC = () => {
  const router = useRouter();
  const { profile, songs, updateProfile, clearSmartCache } = useApp();

  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showDefaultSepModal, setShowDefaultSepModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editEmail, setEditEmail] = useState(profile.email);

  const toggleSkill = (id: SkillInstrumentId) => {
    Haptics.selectionAsync().catch(() => {});
    const exists = profile.skills.includes(id);
    const next = exists
      ? profile.skills.filter((s) => s !== id)
      : [...profile.skills, id];
    updateProfile({ skills: next });
  };

  const toggleGoal = (goal: string) => {
    Haptics.selectionAsync().catch(() => {});
    const exists = profile.goals.includes(goal);
    const next = exists
      ? profile.goals.filter((g) => g !== goal)
      : [...profile.goals, goal];
    updateProfile({ goals: next });
  };

  const defaultSepLabel =
    profile.defaultSeparation === 'always_ask'
      ? 'Always ask'
      : SEPARATION_PRESETS.find((p) => p.id === profile.defaultSeparation)?.title ||
        'Always ask';

  const getSkillIcon = (id: SkillInstrumentId) => {
    const key = id === 'other' ? 'other' : id;
    const entry =
      (AppAssets.instruments as Record<string, { on: any; medium: any }>)[key] ||
      AppAssets.instruments.other;
    return entry.medium || entry.on;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top User Header (`fragment_profile.xml`) */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>
            {profile.name
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfoCol}>
          <View style={styles.nameBadgeRow}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <View style={styles.premiumBadge}>
              <Ionicons name="sparkles" size={11} color={Colors.primaryButtonText} />
              <Text style={styles.premiumBadgeText}>UNLIMITED FREE</Text>
            </View>
          </View>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <Text style={styles.profileIdText}>ID: {profile.id}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setEditName(profile.name);
            setEditEmail(profile.email);
            setShowAccountModal(true);
          }}
          style={styles.editAccountIconBtn}
        >
          <Ionicons name="settings-outline" size={20} color={Colors.acqua} />
        </TouchableOpacity>
      </View>

      {/* Unlocked Features Banner */}
      <View style={styles.unlockedBanner}>
        <View style={styles.unlockedIconCircle}>
          <Ionicons name="checkmark-done" size={20} color={Colors.mint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.unlockedTitle}>
            All Studio & AI Features 100% Unlocked
          </Text>
          <Text style={styles.unlockedSubtitle}>
            Unlimited uploads • 5-Track AI Stems • Full Song Chords & Metronome • Lossless WAV Export
          </Text>
        </View>
      </View>

      {/* Skills & Goals Cards (`fragment_profile.xml`) */}
      <Text style={styles.sectionHeader}>MUSICAL PROFILE</Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowSkillsModal(true)}
        style={styles.featureCard}
      >
        <Image
          source={AppAssets.images.skills}
          style={styles.cardLeadingIcon}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Skills • {profile.skillLevel}</Text>
          <Text style={styles.cardSubtitle}>
            {profile.skills.length > 0
              ? profile.skills
                  .map(
                    (id) =>
                      SKILL_ITEMS.find((s) => s.id === id)?.label || id
                  )
                  .join(', ')
              : 'Tap to select your instruments & skill level'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.smoke} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowGoalsModal(true)}
        style={styles.featureCard}
      >
        <Image
          source={AppAssets.images.goals}
          style={styles.cardLeadingIcon}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Goals</Text>
          <Text style={styles.cardSubtitle}>
            {profile.goals.length > 0
              ? profile.goals.join(', ')
              : 'What are your main goals with ShakeWavesSplit?'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.smoke} />
      </TouchableOpacity>

      {/* Audio Separation & Playback Settings (`fragment_user_settings.xml`) */}
      <Text style={styles.sectionHeader}>PREFERENCES</Text>

      <View style={styles.settingsGroupCard}>
        <TouchableOpacity
          onPress={() => setShowDefaultSepModal(true)}
          style={styles.settingRow}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.settingTitle}>Default audio separation</Text>
            <Text style={styles.settingDesc}>{defaultSepLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.smoke} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.settingTitle}>Automatic download</Text>
            <Text style={styles.settingDesc}>
              Automatically download separated stems on device
            </Text>
          </View>
          <Switch
            value={profile.autoDownload}
            onValueChange={(val) => updateProfile({ autoDownload: val })}
            trackColor={{ false: '#333333', true: Colors.acqua }}
            thumbColor={Colors.white}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.settingTitle}>Autoplay song</Text>
            <Text style={styles.settingDesc}>Start playing song once opened</Text>
          </View>
          <Switch
            value={profile.autoplaySong}
            onValueChange={(val) => updateProfile({ autoplaySong: val })}
            trackColor={{ false: '#333333', true: Colors.acqua }}
            thumbColor={Colors.white}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.settingTitle}>Display chords</Text>
            <Text style={styles.settingDesc}>
              Show synchronized AI Chords carousel in Mixer
            </Text>
          </View>
          <Switch
            value={profile.defaultDisplayChords}
            onValueChange={(val) => updateProfile({ defaultDisplayChords: val })}
            trackColor={{ false: '#333333', true: Colors.acqua }}
            thumbColor={Colors.white}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.settingTitle}>Play song on repeat</Text>
            <Text style={styles.settingDesc}>Loop playback automatically</Text>
          </View>
          <Switch
            value={profile.defaultPlayOnRepeat}
            onValueChange={(val) => updateProfile({ defaultPlayOnRepeat: val })}
            trackColor={{ false: '#333333', true: Colors.acqua }}
            thumbColor={Colors.white}
          />
        </View>
      </View>

      {/* Storage & Smart Cache (`fragment_user_settings.xml`) */}
      <Text style={styles.sectionHeader}>STORAGE & SMART CACHE</Text>
      <View style={styles.settingsGroupCard}>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Smart Cache Limit</Text>
            <Text style={styles.settingDesc}>
              {songs.length} songs stored locally • Limit: {profile.smartCacheLimitGb} GB
            </Text>
          </View>
          <View style={styles.cachePillsRow}>
            {[2, 4, 8, 16].map((gb) => (
              <TouchableOpacity
                key={gb}
                onPress={() => updateProfile({ smartCacheLimitGb: gb })}
                style={[
                  styles.cachePill,
                  profile.smartCacheLimitGb === gb && styles.cachePillActive,
                ]}
              >
                <Text
                  style={[
                    styles.cachePillText,
                    profile.smartCacheLimitGb === gb && styles.cachePillTextActive,
                  ]}
                >
                  {gb}G
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          onPress={() => {
            clearSmartCache();
            Alert.alert('Smart Cache Cleared', 'Temporary audio cache has been optimized.');
          }}
          style={styles.settingRow}
        >
          <Text style={[styles.settingTitle, { color: Colors.acqua }]}>
            Clear Smart Cache
          </Text>
          <Ionicons name="sparkles-outline" size={18} color={Colors.acqua} />
        </TouchableOpacity>
      </View>

      {/* Tour & Share */}
      <Text style={styles.sectionHeader}>ABOUT SHAKEWAVESSPLIT</Text>
      <View style={styles.settingsGroupCard}>
        <TouchableOpacity
          onPress={() => router.push('/onboarding')}
          style={styles.settingRow}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Watch Onboarding Video Showcase</Text>
            <Text style={styles.settingDesc}>
              View the 3 interactive AI stem & chord showcase videos
            </Text>
          </View>
          <Ionicons name="play-circle-outline" size={22} color={Colors.acqua} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          onPress={() => {
            Share.share({
              message:
                'Check out ShakeWavesSplit — AI Multi-Track Audio Stem Separator, Chords, Pitch/Speed & Smart Metronome Studio!',
            }).catch(() => {});
          }}
          style={styles.settingRow}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Invite friends</Text>
            <Text style={styles.settingDesc}>Share ShakeWavesSplit with fellow musicians</Text>
          </View>
          <Ionicons name="share-social-outline" size={20} color={Colors.cloud} />
        </TouchableOpacity>
      </View>

      {/* Account & Authentication Section */}
      <Text style={styles.sectionHeader}>ACCOUNT</Text>
      <View style={styles.settingsGroupCard}>
        <TouchableOpacity
          onPress={() => router.push('/auth')}
          style={styles.settingRow}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>
              {profile.isLoggedIn ? 'Switch Account / Login' : 'Sign In / Register'}
            </Text>
            <Text style={styles.settingDesc}>
              {profile.isLoggedIn
                ? `Signed in as ${profile.email} (${profile.authMethod})`
                : 'Sign in with Google, Apple, or Email'}
            </Text>
          </View>
          <Ionicons name="log-in-outline" size={20} color={Colors.white} />
        </TouchableOpacity>

        {profile.isLoggedIn && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: () => {
                      updateProfile({
                        isLoggedIn: false,
                        name: 'Guest User',
                        email: 'guest@shakewavessplit.app',
                        authMethod: 'Studio Pass',
                      });
                    },
                  },
                ]);
              }}
              style={styles.settingRow}
            >
              <Text style={[styles.settingTitle, { color: Colors.red }]}>
                Sign Out
              </Text>
              <Ionicons name="log-out-outline" size={20} color={Colors.red} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <Text style={styles.versionFooter}>
        ShakeWavesSplit v2.5.2 (Build 238) • All Features Free Edition
      </Text>

      {/* Skills Modal (`fragment_user_skills.xml`) */}
      <Modal
        visible={showSkillsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSkillsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>What are your musical skills?</Text>
              <TouchableOpacity onPress={() => setShowSkillsModal(false)}>
                <Ionicons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {/* Skill Level Selector */}
            <Text style={styles.subLabel}>What is your skill level?</Text>
            <View style={styles.levelRow}>
              {(['Beginner', 'Intermediate', 'Pro'] as const).map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  onPress={() => updateProfile({ skillLevel: lvl })}
                  style={[
                    styles.levelChip,
                    profile.skillLevel === lvl && styles.levelChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.levelChipText,
                      profile.skillLevel === lvl && styles.levelChipTextActive,
                    ]}
                  >
                    {lvl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <View style={styles.skillsGrid}>
                {SKILL_ITEMS.map((item) => {
                  const active = profile.skills.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => toggleSkill(item.id)}
                      style={[
                        styles.skillGridItem,
                        active && styles.skillGridItemActive,
                      ]}
                    >
                      <Image
                        source={getSkillIcon(item.id)}
                        style={styles.skillGridIcon}
                        resizeMode="contain"
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.skillGridLabel,
                          active && { color: Colors.acqua, fontFamily: Fonts.bold },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowSkillsModal(false)}
              style={styles.saveFullBtn}
            >
              <Text style={styles.saveFullBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Goals Modal (`fragment_user_goals.xml`) */}
      <Modal
        visible={showGoalsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGoalsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>What are your main goals?</Text>
              <TouchableOpacity onPress={() => setShowGoalsModal(false)}>
                <Ionicons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <View style={styles.goalsWrap}>
              {GOAL_ITEMS.map((goal) => {
                const active = profile.goals.includes(goal);
                return (
                  <TouchableOpacity
                    key={goal}
                    onPress={() => toggleGoal(goal)}
                    style={[styles.goalChip, active && styles.goalChipActive]}
                  >
                    <Text
                      style={[
                        styles.goalChipText,
                        active && styles.goalChipTextActive,
                      ]}
                    >
                      {goal}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={() => setShowGoalsModal(false)}
              style={styles.saveFullBtn}
            >
              <Text style={styles.saveFullBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Default Separation Option Modal (`fragment_default_separation_option.xml`) */}
      <Modal
        visible={showDefaultSepModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDefaultSepModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Default audio separation</Text>
              <TouchableOpacity onPress={() => setShowDefaultSepModal(false)}>
                <Ionicons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                updateProfile({ defaultSeparation: 'always_ask' });
                setShowDefaultSepModal(false);
              }}
              style={[
                styles.sepOptionRow,
                profile.defaultSeparation === 'always_ask' && styles.sepOptionRowActive,
              ]}
            >
              <Text style={styles.sepOptionTitle}>Always ask</Text>
              <Ionicons
                name={
                  profile.defaultSeparation === 'always_ask'
                    ? 'radio-button-on'
                    : 'radio-button-off'
                }
                size={20}
                color={
                  profile.defaultSeparation === 'always_ask'
                    ? Colors.acqua
                    : Colors.smoke
                }
              />
            </TouchableOpacity>

            {SEPARATION_PRESETS.map((p) => {
              const active = profile.defaultSeparation === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => {
                    updateProfile({ defaultSeparation: p.id });
                    setShowDefaultSepModal(false);
                  }}
                  style={[styles.sepOptionRow, active && styles.sepOptionRowActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sepOptionTitle}>
                      {p.title} ({p.trackCount} Tracks)
                    </Text>
                    <Text style={styles.sepOptionSub}>{p.subtitle}</Text>
                  </View>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? Colors.acqua : Colors.smoke}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Account Info Modal (`fragment_account_info.xml`) */}
      <Modal
        visible={showAccountModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Account Info</Text>
              <TouchableOpacity onPress={() => setShowAccountModal(false)}>
                <Ionicons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.subLabel}>Username</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              style={styles.inputBox}
              placeholderTextColor={Colors.smoke}
            />
            <Text style={styles.subLabel}>Email</Text>
            <TextInput
              value={editEmail}
              onChangeText={setEditEmail}
              style={styles.inputBox}
              placeholderTextColor={Colors.smoke}
            />
            <View style={styles.accountMetaBox}>
              <Text style={styles.accountMetaLine}>Plan: Unlimited Pro (100% Free)</Text>
              <Text style={styles.accountMetaLine}>Monthly Uploads: Unlimited</Text>
              <Text style={styles.accountMetaLine}>5-Track Separation: Unlocked</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                updateProfile({
                  name: editName.trim() || profile.name,
                  email: editEmail.trim() || profile.email,
                });
                setShowAccountModal(false);
              }}
              style={styles.saveFullBtn}
            >
              <Text style={styles.saveFullBtnText}>Save Account Info</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 120,
  },
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222222',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#262626',
    borderWidth: 2,
    borderColor: '#444444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitials: {
    color: Colors.white,
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  profileInfoCol: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 3,
  },
  profileName: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3E3E3E',
  },
  premiumBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  profileEmail: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  profileIdText: {
    color: Colors.smoke,
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  editAccountIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1B1B1B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 18,
    gap: 12,
  },
  unlockedIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedTitle: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  unlockedSubtitle: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.regular,
    lineHeight: 17,
  },
  sectionHeader: {
    color: Colors.smoke,
    fontSize: 12,
    fontFamily: Fonts.bold,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  cardLeadingIcon: {
    width: 28,
    height: 28,
    marginRight: 14,
    tintColor: Colors.acqua,
  },
  cardTitle: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.bold,
    marginBottom: 3,
  },
  cardSubtitle: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  settingsGroupCard: {
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingTitle: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  settingDesc: {
    color: Colors.smoke,
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#222222',
  },
  cachePillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cachePill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#1F1F1F',
  },
  cachePillActive: {
    backgroundColor: Colors.acqua,
  },
  cachePillText: {
    color: Colors.cloud,
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  cachePillTextActive: {
    color: Colors.primaryButtonText,
  },
  versionFooter: {
    color: Colors.smoke,
    fontSize: 12,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlaySheet,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.bottomNavBackground,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    color: Colors.white,
    fontSize: 19,
    fontFamily: Fonts.bold,
  },
  subLabel: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginBottom: 8,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  levelChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#121212',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  levelChipActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#262626',
  },
  levelChipText: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  levelChipTextActive: {
    color: Colors.white,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  skillGridItem: {
    width: '30.5%',
    backgroundColor: '#121212',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#272727',
  },
  skillGridItemActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#262626',
  },
  skillGridIcon: {
    width: 36,
    height: 36,
    marginBottom: 6,
  },
  skillGridLabel: {
    color: Colors.cloud,
    fontSize: 11,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  goalsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  goalChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  goalChipActive: {
    backgroundColor: '#262626',
    borderColor: '#FFFFFF',
  },
  goalChipText: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  goalChipTextActive: {
    color: Colors.white,
    fontFamily: Fonts.bold,
  },
  saveFullBtn: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  saveFullBtnText: {
    color: '#000000',
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  sepOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#121212',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#292929',
  },
  sepOptionRowActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#262626',
  },
  sepOptionTitle: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  sepOptionSub: {
    color: Colors.cloud,
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  inputBox: {
    backgroundColor: '#121212',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.textInputDivider,
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.regular,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  accountMetaBox: {
    backgroundColor: '#121212',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 4,
  },
  accountMetaLine: {
    color: Colors.mint,
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
});
