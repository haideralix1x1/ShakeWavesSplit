import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { Colors, Fonts } from '../theme/colors';
import { AppAssets } from '../theme/assets';

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(16, insets.top);
  const bottomPadding = Math.max(20, insets.bottom + 12);
  const { loginWithEmail, signUpWithEmail, loginWithGoogle, loginAsGuest } = useApp();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (authMode === 'signup') {
      signUpWithEmail(name, email, password);
    } else {
      loginWithEmail(email, password, name);
    }
    router.replace('/');
  };

  const handleGoogleSignIn = () => {
    Haptics.selectionAsync().catch(() => {});
    loginWithGoogle('Google Musician', 'musician@gmail.com');
    router.replace('/');
  };

  const handleGuestEntry = () => {
    Haptics.selectionAsync().catch(() => {});
    loginAsGuest();
    router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding, paddingBottom: bottomPadding }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Close Button */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <Image
              source={AppAssets.images.splashLogo}
              style={styles.logoImg}
              resizeMode="contain"
            />
            <Text style={styles.appTitle}>ShakeWavesSplit</Text>
            <Text style={styles.appSubtitle}>
              {authMode === 'signin'
                ? 'Sign in to sync your multi-track studio'
                : 'Create an account to start isolating stems'}
            </Text>
          </View>

          {/* Social Logins */}
          <View style={styles.socialGroup}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleGoogleSignIn}
              style={styles.socialBtn}
            >
              <Ionicons name="logo-google" size={20} color={Colors.white} />
              <Text style={styles.socialBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleGoogleSignIn}
              style={styles.socialBtn}
            >
              <Ionicons name="logo-apple" size={20} color={Colors.white} />
              <Text style={styles.socialBtnText}>Continue with Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email / Password Form */}
          <View style={styles.formContainer}>
            {authMode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your full name"
                  placeholderTextColor={Colors.smoke}
                  style={styles.inputField}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={Colors.smoke}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.inputField}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordFieldWrapper}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.smoke}
                  secureTextEntry={!showPassword}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.cloud}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmit}
              style={styles.primaryAuthBtn}
            >
              <Text style={styles.primaryAuthBtnText}>
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Toggle Mode */}
            <View style={styles.switchModeRow}>
              <Text style={styles.switchModeText}>
                {authMode === 'signin'
                  ? "Don't have an account? "
                  : 'Already have an account? '}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setAuthMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))
                }
              >
                <Text style={styles.switchModeHighlight}>
                  {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Continue as Guest / Offline Pass */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleGuestEntry}
            style={styles.guestBtn}
          >
            <Text style={styles.guestBtnText}>
              Continue with Studio Pass (Guest Mode)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingVertical: 10,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C1C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginVertical: 18,
  },
  logoImg: {
    width: 52,
    height: 52,
    marginBottom: 10,
  },
  appTitle: {
    color: Colors.white,
    fontSize: 24,
    fontFamily: Fonts.bold,
    marginBottom: 6,
  },
  appSubtitle: {
    color: Colors.cloud,
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  socialGroup: {
    gap: 10,
    marginBottom: 20,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.secondaryBackground,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  socialBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#262626',
  },
  dividerText: {
    color: Colors.smoke,
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  formContainer: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: Colors.cloud,
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  inputField: {
    backgroundColor: '#141414',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.regular,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  passwordFieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.regular,
    paddingVertical: 12,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryAuthBtn: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryAuthBtnText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  switchModeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  switchModeText: {
    color: Colors.cloud,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  switchModeHighlight: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  guestBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 22,
  },
  guestBtnText: {
    color: Colors.smoke,
    fontSize: 13,
    fontFamily: Fonts.medium,
    textDecorationLine: 'underline',
  },
});
