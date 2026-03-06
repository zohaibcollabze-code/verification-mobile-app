/**
 * MPVP — Force Password Change Screen
 * Mandatory first-time login credential rotation.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GeometricIcon } from '@/components/ui/GeometricIcon';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Colors } from '@/constants/colors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppModal } from '@/components/ui/AppModal';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth/authService';

export function ForcePasswordChangeScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  // BLOCK NAVIGATION BYPASS
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      // Prevent back gesture/button if not successful
      if (!showSuccessModal) {
        e.preventDefault();
      }
    });
    return unsub;
  }, [navigation, showSuccessModal]);

  const getStrength = (pw: string) => {
    if (pw.length === 0) return { level: 0, color: 'transparent' };
    if (pw.length < 6) return { level: 1, color: Colors.danger };
    if (pw.length < 8) return { level: 2, color: Colors.warning };
    return { level: 4, color: Colors.success };
  };

  const handleUpdate = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    if (!currentPassword.trim()) newErrors.current = 'Required for rotation';

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNum = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*]/.test(newPassword);

    if (newPassword.length < 8) {
      newErrors.new = 'Minimum 8 characters required';
    } else if (!hasUpper || !hasNum || !hasSpecial) {
      newErrors.new = 'Complexity requirements not met';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirm = 'Keys do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await authService.changePassword(currentPassword, newPassword, confirmPassword);
      setShowSuccessModal(true);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setErrors({ current: 'Current access key is incorrect.' });
      } else {
        setErrors({ new: 'Security protocol failed. Retry.' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  const handleFinalRedirect = useCallback(() => {
    setShowSuccessModal(false);
    // Clear forced change flag in store to reactive-unlock navigator
    useAuthStore.getState().updateUser({ is_first_login: false });
    // navigation.reset is handled by the navigator re-rendering, 
    // but we can call it here for immediate feedback if needed.
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      })
    );
  }, [navigation]);

  const strength = getStrength(newPassword);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.branding}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>MPVP</Text>
            </View>
            <Text style={styles.title}>Welcome, {user?.full_name.split(' ')[0]}</Text>
            <Text style={styles.subtitle}>INITIAL SECURITY PROTOCOL</Text>
          </View>

          <View style={styles.warningBox}>
            <View style={{ marginRight: 20 }}>
              <GeometricIcon type="Lock" size={32} color={Colors.warning} />
            </View>
            <View style={styles.warningTextContent}>
              <Text style={styles.warningTitle}>MANDATORY ACTION</Text>
              <Text style={styles.warningDesc}>
                This is your first login. For enterprise security, you must rotate your temporary access key before proceeding.
              </Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.passwordWrapper}>
              <Input
                label="CURRENT TEMPORARY KEY"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
                placeholder="Enter temporary password"
                error={errors.current}
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowCurrent(!showCurrent)} hitSlop={15}>
                <GeometricIcon type={showCurrent ? 'EyeOff' : 'Eye'} size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.passwordWrapper}>
              <Input
                label="DEFINE NEW ACCESS KEY"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                placeholder="Choose a strong key"
                error={errors.new}
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowNew(!showNew)} hitSlop={15}>
                <GeometricIcon type={showNew ? 'EyeOff' : 'Eye'} size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                {[1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.segment,
                      { backgroundColor: i <= strength.level ? strength.color : Colors.dark700 },
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.passwordWrapper}>
              <Input
                label="VERIFY ACCESS KEY"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                placeholder="Repeat for confirmation"
                error={errors.confirm}
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)} hitSlop={15}>
                <GeometricIcon type={showConfirm ? 'EyeOff' : 'Eye'} size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            <Button
              title="Initialize Dashboard"
              onPress={handleUpdate}
              loading={isLoading}
              style={styles.actionBtn}
            />
          </View>

          <Text style={styles.policyFooter}>
            By proceeding, you agree to comply with the Managed Physical Verification Platform standard operating procedures and privacy policies.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Persistence Success Modal — PREMIUM Upgrade */}
      <AppModal
        isVisible={showSuccessModal}
        onClose={handleFinalRedirect}
        title="Protocol Initialized"
        icon="Award"
        iconColor={Colors.primary}
        description="Your security credentials have been successfully rotated and synchronized. Welcome to the MPVP ecosystem."
        primaryAction={{
          label: 'Enter Dashboard',
          onPress: handleFinalRedirect,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgScreen,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingVertical: 60,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 2,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: Colors.dark900,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.dark700,
    marginBottom: 24,
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 32,
    marginRight: 20,
  },
  warningTextContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.warning,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  warningDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  strengthContainer: {
    marginTop: -8,
    marginBottom: 20,
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  actionBtn: {
    marginTop: 12,
  },
  policyFooter: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 40,
    paddingHorizontal: 10,
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: 38,
  },
});
