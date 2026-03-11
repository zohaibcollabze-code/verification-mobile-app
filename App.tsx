/**
 * MPVP — App Root
 * Wraps the application with all required providers.
 */
import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AppNavigator } from '@/navigation/AppNavigator';
import { ToastProvider } from '@/components/ui/Toast';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useAuthStore } from './src/stores/authStore';
import { initDB } from '@/services/db/index';
import { startNetworkListener } from '@/services/network/networkListener';
import { runSync } from '@/services/sync/syncEngine';

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    async function bootstrap() {
      try {
        initDB();
        await ImagePicker.requestCameraPermissionsAsync();
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        startNetworkListener(() => {
          runSync().catch(err => console.warn('[App] Connectivity restored sync failed', err));
        });
        const syncInterval = setInterval(() => {
          runSync().catch(err => console.warn('[App] Periodic sync failed', err));
        }, 5 * 60 * 1000);
        await initialize();
        return () => clearInterval(syncInterval);
      } catch (error) {
        console.error('[App] Bootstrap failed', error);
      }
    }
    const cleanupPromise = bootstrap();
    return () => {
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      }).catch(() => {});
    };
  }, [initialize]);

  // AppNavigator renders the premium SplashScreen when isLoading is true.
  // No intermediate loading gate here to avoid a black-screen flicker.
  if (!fontsLoaded) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ToastProvider>
          <OfflineBanner />
          <AppNavigator />
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
