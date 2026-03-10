/**
 * PAVMP — Login Screen (Premium Dark Theme)
 * Email/password login with first-login check, account lockout, and high-fidelity branding.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, KeyboardAvoidingView, ScrollView, Platform, Pressable, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GeometricIcon } from '@/components/ui/GeometricIcon';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  const login = useAuthStore((s) => s.login);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const Colors = useColors();

  const handleLogin = useCallback(async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setError(null);
    setLockMessage(null);
    setIsLoading(true);

    try {
      const result = await login(email.trim(), password);

      if (result.success) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          }),
        );
      } else {
        if (result.lockedUntil) {
          const lockedDate = new Date(result.lockedUntil);
          const timeStr = lockedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setLockMessage(`Account locked until ${timeStr}`);
        } else {
          setError(result.error || 'Invalid technical credentials');
        }
      }
    } catch {
      setError('System connection failure. Retry later.');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, login, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.bgScreen }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Pro Branding */}
          <View style={styles.branding}>
            <View style={[styles.logoOuter, { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary }]}>
              <View style={styles.logoInner}>
                <Text style={[styles.logoText, { color: Colors.primary }]}>PAVMP</Text>
              </View>
            </View>
            <Text style={[styles.brandTitle, { color: '#000000ff' }]}>FIELD AGENT</Text>
            <Text style={[styles.brandTagline, { color: Colors.textSecondary }]}>MANAGED PHYSICAL VERIFICATION PLATFORM</Text>
          </View>

          {/* Login Form */}
          <View style={[styles.formContainer, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault }]}>
            <Text style={styles.formHeader}>Authenticate</Text>
            <Text style={[styles.formSubheader, { color: Colors.textMuted }]}>Enter your enterprise access keys</Text>

            {(error || lockMessage) && (
              <View style={[styles.alert, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeftColor: lockMessage ? Colors.warning : Colors.danger }, lockMessage && styles.lockAlert]}>
                <Text style={[styles.alertText, { color: lockMessage ? Colors.warning : Colors.danger }]}>{lockMessage || error}</Text>
              </View>
            )}

            <Input
              label="OFFICE EMAIL"
              value={email}
              onChangeText={setEmail}
              placeholder="agent.name@pavmp.pk"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              required
            />

            <View style={styles.passwordWrapper}>
              <Input
                label="ACCESS PASSWORD"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                required
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                hitSlop={15}
              >
                <GeometricIcon type={showPassword ? 'EyeOff' : 'Eye'} size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            <Button
              title="Secure Login"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginBtn}
            />

            <Pressable style={styles.forgotBtn}>
              <Text style={[styles.forgotText, { color: Colors.textMuted }]}>Forgot credentials? Contact Admin</Text>
            </Pressable>
          </View>


        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32, // Standardized for premium layout
    paddingVertical: 60,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoOuter: {
    width: 100,
    height: 100,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
  },
  logoInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  formContainer: {
    borderRadius: 24, // Consistent 24px card radius
    padding: 32,
    borderWidth: 1.5,
  },
  formHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  formSubheader: {
    fontSize: 13,
    marginBottom: 32,
  },
  alert: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
  },
  lockAlert: {
    // base styling in alert
  },
  alertText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: 40, // Adjusted for 56px input height
  },
  eyeIcon: {
    fontSize: 18,
  },
  loginBtn: {
    marginTop: 12,
  },
  forgotBtn: {
    marginTop: 24,
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
  },
  devHintBox: {
    marginTop: 32,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  devHintText: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '700',
  },
});
