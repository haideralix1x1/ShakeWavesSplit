import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { AppProvider } from '../context/AppContext';
import { AppAssets } from '../theme/assets';
import { Colors } from '../theme/colors';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(AppAssets.fonts);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden={true} />
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar hidden={true} />
        <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.black },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="auth"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="upload"
          options={{ presentation: 'transparentModal', animation: 'fade_from_bottom' }}
        />
        <Stack.Screen
          name="select-tracks"
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="mixer/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="playlist/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="search"
          options={{ animation: 'fade' }}
        />
      </Stack>
    </AppProvider>
  </SafeAreaProvider>
);
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
