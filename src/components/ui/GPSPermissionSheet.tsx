/**
 * MPVP — GPS Permission Bottom Sheet
 * Handles explicit permission states: denied, blocked, unavailable.
 * Shows actionable UI with Open Settings and retry flows.
 */
import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Animated, Easing, Dimensions, Linking } from 'react-native';
import { useColors } from '@/constants/colors';
import { Button } from './Button';
import { GeometricIcon } from './GeometricIcon';

const SHEET_HEIGHT = Math.min(Dimensions.get('window').height * 0.5, 320);

type GPSPermissionState = 'denied' | 'blocked' | 'unavailable';

interface GPSPermissionSheetProps {
  visible: boolean;
  state: GPSPermissionState;
  onRetry: () => void;
  onClose: () => void;
}

const STATE_CONFIG = {
  denied: {
    title: 'Location Required',
    body: 'GPS coordinates are required to submit inspection findings. Please allow location access to continue.',
    icon: 'Location' as const,
    primaryLabel: 'Allow',
    secondaryLabel: 'Cancel',
  },
  blocked: {
    title: 'Location Access Blocked',
    body: 'Location permission has been permanently denied. Please enable it in your device settings to submit findings.',
    icon: 'Lock' as const,
    primaryLabel: 'Open Settings',
    secondaryLabel: 'Cancel',
  },
  unavailable: {
    title: 'GPS Unavailable',
    body: 'Unable to capture your location. Please ensure GPS is enabled and try again.',
    icon: 'Warning' as const,
    primaryLabel: 'Retry',
    secondaryLabel: 'Cancel',
  },
};

export function GPSPermissionSheet({ visible, state, onRetry, onClose }: GPSPermissionSheetProps) {
  const colors = useColors();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const config = STATE_CONFIG[state];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.in(Easing.quad),
        }),
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 180,
          useNativeDriver: true,
          easing: Easing.in(Easing.quad),
        }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  if (!visible || !config) return null;

  const handlePrimary = () => {
    if (state === 'blocked') {
      Linking.openSettings();
    } else {
      onRetry();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.bgCard,
            borderColor: colors.borderDefault,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: colors.borderDefault }]} />
        </View>

        <View style={styles.iconContainer}>
          <GeometricIcon type={config.icon} size={32} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>{config.title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{config.body}</Text>

        <View style={styles.actions}>
          <Button
            title={config.primaryLabel}
            onPress={handlePrimary}
            style={styles.primaryBtn}
          />
          <Button
            title={config.secondaryLabel}
            variant="outline"
            onPress={onClose}
            style={styles.secondaryBtn}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: SHEET_HEIGHT,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9A84C1A',
    marginBottom: 20,
    alignSelf: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
    marginBottom: 32,
  },
  actions: {
    gap: 12,
  },
  primaryBtn: {
    flex: 1,
  },
  secondaryBtn: {
    flex: 1,
  },
});
