/**
 * MPVP — Profile Screen (Dynamic Theme)
 * Inspector profile with theme toggle, push notification controls, and avatar editing.
 */
import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet, Switch, Platform, Modal, TextInput, KeyboardAvoidingView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { useColors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { AppModal } from '@/components/ui/AppModal';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { refreshAccessToken } from '@/services/auth/tokenManager';
import { maskCnic, maskPhone } from '@/utils/formatters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GeometricIcon } from '@/components/ui/GeometricIcon';
import { useProfile } from '@/hooks/useProfile';

export function ProfileScreen() {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { themeMode, toggleTheme } = useThemeStore();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const normalizedFullName = user?.full_name ?? user?.fullName ?? '';
  const normalizedPhone = user?.phone_number ?? user?.phone ?? '';
  const normalizedCnic = user?.cnic_number ?? user?.cnicNumber ?? '';
  const normalizedDesignation = user?.designation ?? user?.seniorityLevel ?? 'Agent';
  const normalizedEmployment = user?.employment_type ?? user?.employmentType ?? 'core';
  const normalizedProfileImage = user?.profile_image ?? user?.profilePictureUrl ?? null;

  const [pushEnabled, setPushEnabled] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);

  // Edit State
  const [editName, setEditName] = useState(normalizedFullName);
  const [editPhone, setEditPhone] = useState(normalizedPhone);
  const [showSignoutModal, setShowSignoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(normalizedProfileImage);

  // Auto-open edit modal if coming from Home screen circle
  const handleOpenEditModal = useCallback(() => {
    setEditName(normalizedFullName);
    setEditPhone(normalizedPhone);
    setShowEditModal(true);
  }, [normalizedFullName, normalizedPhone]);

  useEffect(() => {
    if (route.params?.openEdit) {
      handleOpenEditModal();
    }
  }, [route.params?.openEdit, handleOpenEditModal]);

  const { loading: updating, updateProfile, fetchProfile, error } = useProfile();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!showEditModal) {
      setEditName(normalizedFullName);
      setEditPhone(normalizedPhone);
    }
  }, [normalizedFullName, normalizedPhone, showEditModal]);

  useEffect(() => {
    setProfileImage(normalizedProfileImage || null);
  }, [normalizedProfileImage]);

  const handleSignOutFinal = useCallback(async () => {
    setShowSignoutModal(false);
    await logout();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      }),
    );
  }, [logout, navigation]);

  const handleSignOut = useCallback(() => {
    setShowSignoutModal(true);
  }, []);

  const handleSaveProfile = useCallback(async () => {
    const result = await updateProfile({
      fullName: editName,
      phone: editPhone,
    });

    if (result) {
      setModalTitle('Profile Updated');
      setModalDesc('Your technical profile information has been synchronized with the core system.');
      setShowSuccessModal(true);
      setShowEditModal(false);
    } else {
      Alert.alert('Update Failed', 'Failed to synchronize profile changes.');
    }
  }, [editName, editPhone, updateProfile]);

  const handleEditAvatar = useCallback(() => {
    setShowAvatarModal(true);
  }, []);

  const handleCaptureImage = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required to capture profile images.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      updateUser({ profile_image: uri, profilePictureUrl: uri });
      setShowAvatarModal(false);
    }
  }, [updateUser]);

  const handleSelectFromLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Media library access is required to select profile images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      updateUser({ profile_image: uri, profilePictureUrl: uri });
      setShowAvatarModal(false);
    }
  }, [updateUser]);

  const handleForceRefresh = useCallback(async () => {
    try {
      setIsRefreshingToken(true);
      await refreshAccessToken();
      Alert.alert('Success', 'Token refreshed successfully!');
    } catch (err: any) {
      Alert.alert('Refresh Failed', err?.message || 'Failed to refresh token');
    } finally {
      setIsRefreshingToken(false);
    }
  }, []);

  const assignedCities = useMemo(() => {
    const rawCities = user?.cities_covered ?? (user as any)?.citiesCovered;
    if (Array.isArray(rawCities) && rawCities.length > 0) {
      return rawCities.join(', ');
    }
    return 'Not assigned yet';
  }, [user]);

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.bgScreen }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Profile Hero Header */}
        <View style={[styles.hero, { borderBottomColor: Colors.borderDefault }]}>
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatar, { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary }]}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: Colors.primary }]}>{user.profile_initials}</Text>
              )}
            </View>
            <Pressable
              style={[styles.editIcon, { backgroundColor: Colors.primary, borderColor: Colors.bgScreen }]}
              onPress={handleEditAvatar}
            >
              <GeometricIcon type="Camera" size={16} color="#FFF" />
            </Pressable>
          </View>

          <Text style={[styles.heroLabel, { color: Colors.textMuted }]}>AGENT NAME</Text>
          <Text style={[styles.userName, { color: Colors.textPrimary }]}>{normalizedFullName || '—'}</Text>
          <Text style={[styles.userEmail, { color: Colors.textMuted }]}>{user.email}</Text>
          <View style={[styles.designationBadge, { backgroundColor: Colors.bgInput, borderColor: Colors.borderDefault }]}>
            <Text style={[styles.badgeText, { color: Colors.primary }]}>
              {(normalizedDesignation || 'AGENT').toUpperCase()} • {normalizedEmployment.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Technical Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle1, { color: Colors.textMuted }]}>TECHNICAL PROFILE</Text>
            <Pressable onPress={handleOpenEditModal}>
              <Text style={[styles.editLink, { color: Colors.primary }]}>Edit Details</Text>
            </Pressable>
          </View>
          <View style={[styles.card, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault }]}>
            <ProfileRow label="Full Name" value={normalizedFullName} color={Colors.textPrimary} labelColor={Colors.textSecondary} />
            <View style={[styles.divider, { backgroundColor: Colors.borderDefault }]} />
            <ProfileRow label="Identity (CNIC)" value={maskCnic(normalizedCnic)} isSecure color={Colors.textPrimary} labelColor={Colors.textSecondary} fontFamily="DMMono_400Regular" />
            <View style={[styles.divider, { backgroundColor: Colors.borderDefault }]} />
            <ProfileRow label="Mobile" value={maskPhone(normalizedPhone)} color={Colors.textPrimary} labelColor={Colors.textSecondary} fontFamily="DMMono_400Regular" />
            <View style={[styles.divider, { backgroundColor: Colors.borderDefault }]} />
            <ProfileRow label="Assigned Cities" value={assignedCities} multiline color={Colors.textPrimary} labelColor={Colors.textSecondary} />
          </View>
          {error && (
            <View style={styles.errorRetryRow}>
              <Text style={[styles.errorText, { color: Colors.danger }]}>{error.message}</Text>
              <Pressable onPress={fetchProfile} style={[styles.retryBtn, { borderColor: Colors.primary }]}>
                <Text style={[styles.retryBtnText, { color: Colors.primary }]}>Retry</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* System & Mode Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>PREFERENCES & MODE</Text>
          <View style={[styles.card, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault }]}>
            {/* Theme Toggle */}
            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.settingLabel, { color: Colors.textPrimary }]}>Appearance Mode</Text>
                <Text style={[styles.settingSub, { color: Colors.textMuted }]}>
                  {themeMode === 'dark' ? 'Premium Dark Theme' : 'High-Visibility Light Theme'}
                </Text>
              </View>
              <Pressable
                onPress={toggleTheme}
                style={[styles.themePill, { backgroundColor: Colors.bgInput, borderColor: Colors.borderDefault }]}
              >
                <View style={[
                  styles.themePillIndicator,
                  { backgroundColor: Colors.primary },
                  themeMode === 'dark' ? { left: 4 } : { right: 4 }
                ]} />
                <GeometricIcon type="Moon" size={14} color={themeMode === 'dark' ? '#FFF' : Colors.textMuted} />
                <GeometricIcon type="Sun" size={14} color={themeMode === 'light' ? '#FFF' : Colors.textMuted} />
              </Pressable>
            </View>

            <View style={[styles.divider, { backgroundColor: Colors.borderDefault }]} />

            {/* Push Notifications Toggle */}
            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.settingLabel, { color: Colors.textPrimary }]}>Push Notifications</Text>
                <Text style={[styles.settingSub, { color: Colors.textMuted }]}>Critical assignment alerts</Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: Colors.borderDefault, true: Colors.primary }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : pushEnabled ? Colors.white : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>SECURITY</Text>
          <View style={[styles.card, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault }]}>
            <Pressable style={styles.actionRow} onPress={() => navigation.navigate('ChangePassword')}>
              <Text style={[styles.actionLabel, { color: Colors.textPrimary }]}>Change Access Password</Text>
              <Text style={[styles.chevron, { color: Colors.textMuted }]}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* Logout CTA */}
        <Button
          title={isRefreshingToken ? "Refreshing..." : "🛠 Force Token Refresh (Test)"}
          onPress={handleForceRefresh}
          variant="secondary"
          loading={isRefreshingToken}
          style={StyleSheet.flatten([styles.logoutBtn, { marginTop: 24, marginBottom: 12 }]) as any}
        />
        <Button
          title="Disconnect Session"
          onPress={handleSignOut}
          variant="danger"
          style={styles.logoutBtn}
        />

        <View style={{ height: insets.bottom + 40 }} />
        <Text style={[styles.versionInfo, { color: Colors.textMuted }]}>PAVMP FIELD AGENT • VERSION 4.0.0 (STABLE)</Text>
      </ScrollView>

      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.backdrop} onPress={() => setShowEditModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault, borderWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>Technical Revision</Text>
              <Pressable onPress={() => setShowEditModal(false)} hitSlop={15}>
                <GeometricIcon type="Close" size={24} color={Colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.formItem}>
              <Text style={[styles.inputLabel, { color: Colors.textSecondary }]}>FULL NAME</Text>
              <TextInput
                style={[styles.input, { backgroundColor: Colors.bgInput, borderColor: Colors.borderDefault, color: Colors.textPrimary }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter full name"
                placeholderTextColor={Colors.textPlaceholder}
              />
            </View>

            <View style={styles.formItem}>
              <Text style={[styles.inputLabel, { color: Colors.textSecondary }]}>CONTACT MOBILE</Text>
              <TextInput
                style={[styles.input, { backgroundColor: Colors.bgInput, borderColor: Colors.borderDefault, color: Colors.textPrimary }]}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                placeholder="Enter phone number"
                placeholderTextColor={Colors.textPlaceholder}
              />
            </View>

            <Button
              title={updating ? "Synchronizing..." : "Synchronize Changes"}
              onPress={handleSaveProfile}
              loading={updating}
              style={styles.modalSubmit}
            />
            <View style={{ height: insets.bottom + 20 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showAvatarModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setShowAvatarModal(false)} />
          <View style={[styles.actionSheet, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault, borderWidth: 1 }]}>
            <View style={[styles.sheetHandle, { backgroundColor: Colors.borderDefault }]} />
            <Text style={[styles.sheetTitle, { color: Colors.textPrimary }]}>Profile Modification</Text>
            <Text style={[styles.sheetDesc, { color: Colors.textMuted }]}>
              Image capture and library access are restricted to corporate-approved devices.
            </Text>

            <Pressable style={[styles.sheetItem, { borderBottomColor: Colors.borderDefault }]} onPress={handleCaptureImage}>
              <Text style={[styles.sheetItemText, { color: Colors.primary }]}>Capture New Image</Text>
            </Pressable>
            <Pressable style={[styles.sheetItem, { borderBottomColor: Colors.borderDefault }]} onPress={handleSelectFromLibrary}>
              <Text style={[styles.sheetItemText, { color: Colors.primary }]}>Select from Secure Vault</Text>
            </Pressable>
            <Pressable style={styles.sheetItem} onPress={() => setShowAvatarModal(false)}>
              <Text style={[styles.sheetItemText, { color: Colors.danger }]}>Cancel Revision</Text>
            </Pressable>
            <View style={{ height: insets.bottom + 20 }} />
          </View>
        </View>
      </Modal>

      {/* Sign Out Modal — PREMIUM Upgrade */}
      <AppModal
        isVisible={showSignoutModal}
        onClose={() => setShowSignoutModal(false)}
        title="Security Termination"
        icon="Lock"
        iconColor={Colors.danger}
        description="Are you sure you want to sign out? This will clear all session tokens and local draft data."
        primaryAction={{
          label: 'Sign Out',
          onPress: handleSignOutFinal,
          variant: 'danger',
        }}
        secondaryAction={{
          label: 'Cancel',
          onPress: () => setShowSignoutModal(false),
        }}
      />

      {/* Success Modal */}
      <AppModal
        isVisible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={modalTitle}
        description={modalDesc}
        icon="Check"
        iconColor={Colors.success}
        primaryAction={{
          label: 'Synchronized',
          onPress: () => setShowSuccessModal(false),
        }}
      />
    </SafeAreaView>
  );
}

function ProfileRow({ label, value, isSecure, multiline, color, labelColor, fontFamily }: any) {
  const Colors = useColors();
  const displayValue = value && value.toString().trim().length > 0 ? value : '—';
  return (
    <View style={styles.profileRow}>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      <View style={styles.valueRow}>
        {isSecure && (
          <View style={styles.secureIcon}>
            <GeometricIcon type="Lock" size={12} color={Colors.textMuted} />
          </View>
        )}
        <Text style={[styles.value, { color }, multiline && styles.valueMultiline, fontFamily ? { fontFamily } : undefined]}>{displayValue}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 30, // Reduced from 50
    borderBottomWidth: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconText: {
    fontSize: 14,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 16,
  },
  designationBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12, // Increased for premium feel
    borderWidth: 1.5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  section: {
    paddingHorizontal: 24, // Standardized 24px
    marginTop: 32, // Increased for rhythm
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionTitle1: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  editLink: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 24, // Matches global 24px card radius
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    marginLeft: 20,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  valueMultiline: {
    textAlign: 'right',
  },
  secureIcon: {
    marginRight: 6,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingSub: {
    fontSize: 12,
    marginTop: 2,
  },
  themePill: {
    width: 80,
    height: 36,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    paddingHorizontal: 4,
  },
  themePillIndicator: {
    position: 'absolute',
    width: 32,
    height: 28,
    borderRadius: 14,
  },
  pillText: {
    fontSize: 14,
    zIndex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    height: 1,
  },
  errorRetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  retryBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  logoutBtn: {
    marginHorizontal: 24,
    marginTop: 48,
  },
  versionInfo: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 40, // Changed from marginTop
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    fontSize: 20,
    padding: 4,
  },
  formItem: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    height: 56, // Standard 56px height
    borderRadius: 16, // Consistent 16px input radius
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
  },
  modalSubmit: {
    width: '100%',
    marginTop: 10,
  },
  actionSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    alignItems: 'center',
    width: '100%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  sheetDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sheetItem: {
    width: '100%',
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  sheetItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
