/**
 * MPVP — OfflineBanner Component
 * Shown when network is unavailable. 36px dark banner above everything.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface OfflineBannerProps {
  isOffline: boolean;
}

export function OfflineBanner({ isOffline }: OfflineBannerProps) {
  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚡ No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 36,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
