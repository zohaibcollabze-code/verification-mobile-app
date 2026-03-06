/**
 * MPVP — Button Component (Dynamic Theme)
 * Standard button with dynamic theme support.
 */
import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Pressable
} from 'react-native';
import { useColors } from '@/constants/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon
}: ButtonProps) {
  const Colors = useColors();

  const getVariantStyle = () => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.borderDefault };
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary };
      case 'danger':
        return { backgroundColor: Colors.danger };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      default:
        return { backgroundColor: Colors.primary };
    }
  };

  const getTextColor = () => {
    if (variant === 'outline') return Colors.primary;
    if (variant === 'secondary') return Colors.textPrimary;
    if (variant === 'ghost') return Colors.primary;
    return '#FFFFFF';
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small': return { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 };
      case 'large': return { paddingVertical: 18, paddingHorizontal: 28, borderRadius: 20 };
      default: return { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16 };
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        getVariantStyle(),
        getSizeStyle(),
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[
            styles.text,
            { color: getTextColor() },
            size === 'small' && { fontSize: 13 },
            size === 'large' && { fontSize: 16 },
            textStyle
          ]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// Minimal dummy View for local content wrapper if needed
// Use standard View from react-native instead of local shadowing

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  iconContainer: {
    marginRight: 8,
  }
});
