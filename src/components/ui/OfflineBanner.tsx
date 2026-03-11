import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStore } from '@/stores/networkStore';

export function OfflineBanner() {
  const bannerVisible = useNetworkStore((s) => s.bannerVisible);
  const bannerMessage = useNetworkStore((s) => s.bannerMessage);
  const bannerType = useNetworkStore((s) => s.bannerType);

  if (!bannerVisible) return null;

  const bgColor = bannerType === 'offline' ? '#DC2626' : bannerType === 'syncing' ? '#3B82F6' : bannerType === 'success' ? '#10B981' : '#F59E0B';

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      <Text style={styles.text}>{bannerMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 36,
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
