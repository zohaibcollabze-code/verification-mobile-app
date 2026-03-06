/**
 * MPVP — Change Password Screen (Premium Dark Theme)
 * Secure password update with strength indicator.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth/authService';
import { GeometricIcon } from '@/components/ui/GeometricIcon';
import { AppModal } from '@/components/ui/AppModal';

export function ChangePasswordScreen() {
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

  const getStrength = (pw: string): { level: number; label: string; color: string } => {
    if (pw.length === 0) return { level: 0, label: '', color: 'transparent' };

    const hasUpper = /[A-Z]/.test(pw);
    const hasNum = /[0-9]/.test(pw);
    const hasSpecial = /[!@#$%^&*]/.test(pw);
    const isLongEnough = pw.length >= 8;

    let score = 0;
    if (pw.length >= 6) score++;
    if (isLongEnough) score++;
    if (hasUpper) score++;
    if (hasNum || hasSpecial) score++;

    if (score <= 1) return { level: 1, label: 'WEAK', color: Colors.danger };
    if (score === 2) return { level: 2, label: 'FAIR', color: Colors.warning };
    if (score === 3) return { level: 3, label: 'GOOD', color: Colors.primary };
    return { level: 4, label: 'STRONG', color: Colors.success };
  };

  const handleSubmit = useCallback(async () => {
    const newErrors: Record<string, string> = {};

    // Strict Validation Gate
    if (!currentPassword.trim()) newErrors.current = 'Required field';

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNum = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*]/.test(newPassword);

    if (!newPassword) {
      newErrors.new = 'Required field';
    } else if (newPassword.length < 8) {
      newErrors.new = 'Minimum 8 characters required';
    } else if (!hasUpper) {
      newErrors.new = 'Must contain 1 uppercase letter';
    } else if (!hasNum) {
      newErrors.new = 'Must contain 1 number';
    } else if (!hasSpecial) {
      newErrors.new = 'Must contain 1 special character (!@#$%^&*)';
    }

    if (confirmPassword !== newPassword) {
      newErrors.confirm = 'Must exactly equal new password';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      await authService.changePassword(currentPassword, newPassword, confirmPassword);
      setShowSuccessModal(true);
    } catch (err: any) {
      if (err.response?.status === 400) {
        // Map backend validation errors if detail exists
        const details = err.response?.data?.details;
        if (details) {
          const remoteErrors: any = {};
          details.forEach((d: any) => remoteErrors[d.field] = d.message);
          setErrors(remoteErrors);
        } else {
          setErrors({ new: 'Validation failed on server' });
        }
      } else if (err.response?.status === 401) {
        setErrors({ current: 'Current password is incorrect.' });
      } else {
        Alert.alert('System Error', 'Unable to rotate access credentials. Retry later.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  const strength = getStrength(newPassword);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Navigation */}
      <View style={styles.navBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={15}>
          <Text style={styles.backBtn}>‹</Text>
        </Pressable>
        <Text style={styles.navTitle}>Access Rotation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>SECURITY ALERT</Text>
          <Text style={styles.infoText}>
            Frequent password rotations are mandatory for field agents handling high-valuation contracts.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.passwordWrapper}>
            <Input
              label="CURRENT ACCESS KEY"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
              placeholder="••••••••"
              error={errors.current}
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowCurrent(!showCurrent)} hitSlop={15}>
              <GeometricIcon type={showCurrent ? 'EyeOff' : 'Eye'} size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.spacer} />

          <View style={styles.passwordWrapper}>
            <Input
              label="NEW ACCESS KEY"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
              placeholder="Minimum 8 characters"
              error={errors.new}
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowNew(!showNew)} hitSlop={15}>
              <GeometricIcon type={showNew ? 'EyeOff' : 'Eye'} size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          {/* Strength Bar */}
          <View style={styles.strengthWrapper}>
            <View style={styles.barContainer}>
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
            <Text style={[styles.strengthText, { color: strength.color }]}>{strength.label}</Text>
          </View>

          <View style={styles.passwordWrapper}>
            <Input
              label="CONFIRM NEW KEY"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              placeholder="Repeat new key"
              error={errors.confirm}
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)} hitSlop={15}>
              <GeometricIcon type={showConfirm ? 'EyeOff' : 'Eye'} size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          <Button
            title="Update Access Credentials"
            onPress={handleSubmit}
            loading={isLoading}
            style={styles.submitBtn}
          />
        </View>

        <Text style={styles.policyText}>
          System Policy: Passwords must contain at least one uppercase letter and one special character.
        </Text>
      </ScrollView>

      {/* Success Modal — PREMIUM Upgrade */}
      <AppModal
        isVisible={showSuccessModal}
        onClose={() => navigation.goBack()}
        title="Security Update"
        icon="Shield"
        iconColor={Colors.success}
        description="Access password has been successfully rotated. Your account is now synchronized with the new credentials."
        primaryAction={{
          label: 'Acknowledge',
          onPress: () => navigation.goBack(),
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDefault,
  },
  backBtn: {
    fontSize: 32,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 24,
  },
  infoBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.warning,
    letterSpacing: 1,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  spacer: {
    height: 12,
  },
  strengthWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 24,
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    marginRight: 12,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 10,
    fontWeight: '800',
    width: 60,
    textAlign: 'right',
  },
  submitBtn: {
    marginTop: 12,
  },
  policyText: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 20,
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: 38, // Standard alignment for 56px inputs
  },
});
