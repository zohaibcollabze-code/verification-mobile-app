import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useColors } from '@/constants/colors';

const SHEET_HEIGHT = Math.min(Dimensions.get('window').height * 0.6, 420);

interface PickerOption {
  label: string;
  value: any;
}

interface BottomSheetPickerProps {
  visible: boolean;
  title: string;
  options: (string | PickerOption)[];
  selected?: string | any | null;
  onSelect: (value: any) => void;
  onClose: () => void;
}

export function BottomSheetPicker({ visible, title, options, selected, onSelect, onClose }: BottomSheetPickerProps) {
  const colors = useColors();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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

  if (!visible) return null;

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

        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

        <Animated.ScrollView
          style={styles.optionsContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12 }}
        >
          {options.map((option, index) => {
            const label = typeof option === 'string' ? option : option.label;
            const value = typeof option === 'string' ? option : option.value;
            const isSelected = selected === value;

            return (
              <Pressable
                key={typeof option === 'string' ? option : `${option.label}-${index}`}
                style={[
                  styles.optionRow,
                  isSelected && {
                    backgroundColor: colors.primaryGlow,
                    borderColor: colors.primaryMuted,
                    borderWidth: 1,
                  }
                ]}
                onPress={() => onSelect(value)}
              >
                <Text style={[
                  styles.optionText,
                  { color: isSelected ? colors.primary : colors.textPrimary }
                ]}>
                  {label}
                </Text>
                {isSelected && (
                  <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
                )}
              </Pressable>
            );
          })}
        </Animated.ScrollView>

        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
        </Pressable>
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
    paddingHorizontal: 20,
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionsContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  optionRow: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
