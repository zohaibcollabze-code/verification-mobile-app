import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';

/**
 * Hook to prevent screenshots and screen recordings.
 * This is a requirement for enterprise-grade security in the Field Agent App.
 */
export function useScreenProtection() {
  useEffect(() => {
    let isActive = true;

    async function enableProtection() {
      if (Platform.OS === 'web') return;
      
      try {
        const isAvailable = await ScreenCapture.isAvailableAsync();
        if (isAvailable && isActive) {
          await ScreenCapture.preventScreenCaptureAsync();
        }
      } catch (error) {
        console.warn('Failed to enable screen protection:', error);
      }
    }

    enableProtection();

    return () => {
      isActive = false;
      if (Platform.OS !== 'web') {
        ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      }
    };
  }, []);
}
