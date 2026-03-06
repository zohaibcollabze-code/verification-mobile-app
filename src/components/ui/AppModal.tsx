import React from 'react';
import { View, Text, Modal, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { useColors } from '@/constants/colors';
import { Button } from './Button';
import { GeometricIcon, IconType } from './GeometricIcon';

interface AppModalProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  icon?: IconType;
  iconColor?: string;
  primaryAction?: {
    label: string;
    onPress: () => void;
    loading?: boolean;
    variant?: 'primary' | 'danger' | 'outline';
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
  type?: 'default' | 'confirmation' | 'error' | 'success';
}

export function AppModal({
  isVisible,
  onClose,
  title,
  description,
  icon,
  iconColor,
  primaryAction,
  secondaryAction,
  type = 'default',
}: AppModalProps) {
  const Colors = useColors();

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View style={[styles.modalCard, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault }]}>
          {/* Header Icon */}
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: iconColor ? `${iconColor}15` : Colors.primaryGlow }]}>
              <GeometricIcon type={icon} size={28} color={iconColor || Colors.primary} />
            </View>
          )}

          <Text style={[styles.title, { color: Colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.description, { color: Colors.textSecondary }]}>{description}</Text>

          <View style={styles.footer}>
            {secondaryAction && (
              <Button
                title={secondaryAction.label}
                variant="outline"
                onPress={secondaryAction.onPress}
                style={styles.halfBtn}
              />
            )}
            {primaryAction && (
              <Button
                title={primaryAction.label}
                variant={primaryAction.variant || 'primary'}
                onPress={primaryAction.onPress}
                loading={primaryAction.loading}
                style={secondaryAction ? styles.halfBtn : styles.fullBtn}
              />
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  footer: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  fullBtn: {
    flex: 1,
  },
  halfBtn: {
    flex: 1,
  },
});
