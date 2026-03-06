/**
 * MPVP — Toast System
 * Imperative toast API with success/error/info variants.
 * Max 2 visible at once. Auto-dismiss timers per spec.
 */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastColors, Colors } from '@/constants/colors';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  opacity: Animated.Value;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => { },
});

export function useToast() {
  return useContext(ToastContext);
}

const DISMISS_TIMES: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  info: 3000,
};

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();
  const idCounter = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = String(++idCounter.current);
      const opacity = new Animated.Value(0);

      const toast: ToastItem = { id, type, message, opacity };

      setToasts((prev) => {
        const updated = [...prev, toast];
        // Max 2 visible
        if (updated.length > 2) {
          return updated.slice(-2);
        }
        return updated;
      });

      // Animate in
      Animated.spring(opacity, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Auto-dismiss
      setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => removeToast(id));
      }, DISMISS_TIMES[type]);
    },
    [removeToast],
  );

  const isTop = Platform.OS === 'ios';

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        style={[
          styles.container,
          isTop ? { top: insets.top + 8 } : { bottom: insets.bottom + 8 },
        ]}
        pointerEvents="box-none"
      >
        {toasts.map((toast) => {
          const colors = ToastColors[toast.type];
          return (
            <Animated.View
              key={toast.id}
              style={[
                styles.toast,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  opacity: toast.opacity,
                  transform: [
                    {
                      translateY: toast.opacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [isTop ? -20 : 20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={[styles.icon, { color: colors.border }]}>{ICONS[toast.type]}</Text>
              <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
                {toast.message}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9998,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  icon: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
