/**
 * PAVMP — Job Accept/Reject Screen (Dynamic Theme)
 * Formal job offer review with mandatory rejection reason if declined.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useColors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { AppModal } from '@/components/ui/AppModal';
import { GeometricIcon } from '@/components/ui/GeometricIcon';
import type { RequestModel } from '@/services/api/types/requestTypes';
import { useJobs } from '@/hooks/useJobs';
import { formatDate } from '@/utils/formatters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorHandler } from '@/utils/errorHandler';
import { useInspectionStore } from '@/stores/inspectionStore';
import * as AssignmentCacheDB from '@/services/db/assignments';
import * as InspectionsDB from '@/services/db/inspections';
import { useNetworkStore } from '@/stores/networkStore';
import { useAuthStore } from '@/stores/authStore';
import { jobsService } from '@/services/jobs/jobsService';

const REJECTION_REASONS = [
  'Site out of service area',
  'Distance too far / High travel cost',
  'Resource/Vehicle unavailability',
  'Conflicting schedule',
  'Safety/Security concerns in area',
  'Other (Specify below)',
];

export function AcceptRejectScreen() {
  const Colors = useColors();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const requestId = route.params?.requestId;

  const { jobDetail: assignment, loading: jobsLoading, fetchJobDetail, acceptJob, rejectJob } = useJobs();
  const initDraft = useInspectionStore((s) => s.initDraft);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const user = useAuthStore((s) => s.user);

  const [isLoading, setIsLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState('');
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [showGenericModal, setShowGenericModal] = useState(false);

  React.useEffect(() => {
    if (requestId) {
      fetchJobDetail(requestId);
    }
  }, [requestId, fetchJobDetail]);

  React.useEffect(() => {
    if (!assignment?.id || !isOnline) return;
    const cached = AssignmentCacheDB.getAssignment(assignment.id);
    const existingInspection = InspectionsDB.getByAssignmentId(assignment.id);
    const hasSchema = Boolean(cached?.schemaSnapshot || existingInspection?.schemaSnapshot);
    if (hasSchema) return;

    let isMounted = true;
    (async () => {
      try {
        const schemaData = await jobsService.getFindingsSchema(assignment.id);
        const schema = schemaData?.findingsSchema || [];
        if (!schema.length || !isMounted) return;
        const serialized = JSON.stringify(schema);
        AssignmentCacheDB.saveSchemaSnapshot(assignment.id, serialized);
        if (existingInspection) {
          InspectionsDB.updateSchemaSnapshot(existingInspection.localId, serialized);
        }
      } catch (err) {
        console.warn('[AcceptReject] Failed to prefetch schema', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [assignment?.id, isOnline]);

  const handleAcceptFinal = useCallback(async () => {
    setIsLoading(true);
    setShowAcceptModal(false);
    try {
      const isReturnedLocal = assignment?.status?.toLowerCase() === 'returned';

      if (!isReturnedLocal) {
        const success = await acceptJob(requestId);
        if (!success && isOnline) {
          throw new Error('Failed to accept job');
        }
      }

      if (assignment && user) {
        const cached = AssignmentCacheDB.getAssignment(requestId);
        const existingInspection = InspectionsDB.getByAssignmentId(requestId);
        let schema: any[] = [];

        const schemaSource = cached?.schemaSnapshot || existingInspection?.schemaSnapshot;
        if (schemaSource) {
          try {
            schema = JSON.parse(schemaSource);
          } catch {
            schema = [];
          }
        }
        if (schema.length === 0) {
          setModalTitle('Schema Missing');
          setModalDesc('Please connect to the internet at least once to download the inspection form.');
          setShowGenericModal(true);
          return;
        }
        await initDraft(requestId, user.id, schema, assignment);
        navigation.replace('InspectionForm', { requestId });
      }
    } catch (err) {
      const mapped = ErrorHandler.handle(err);
      setModalTitle(mapped.code === 'DEADLINE_EXPIRED' ? 'Offer Expired' : 'System Error');
      setModalDesc(mapped.message || 'Failed to transmit acceptance.');
      setShowGenericModal(true);
    } finally {
      setIsLoading(false);
    }
  }, [requestId, navigation, acceptJob, assignment, initDraft, isOnline, user]);

  const canAccept = useMemo(() => {
    if (!assignment) return false;
    const status = assignment.status?.toLowerCase();
    return status === 'assigned' || status === 'new' || status === 'pending' || status === 'returned';
  }, [assignment]);

  const handleAccept = useCallback(() => {
    if (!canAccept) {
      Alert.alert('Invalid Action', 'This job has already been acted upon or is no longer in a pending state.');
      return;
    }
    setShowAcceptModal(true);
  }, [canAccept]);

  const handleRejectSubmit = useCallback(async () => {
    if (!selectedReason) return;
    const finalReason = selectedReason === 'Other (Specify below)' ? otherReason : selectedReason;

    if (selectedReason === 'Other (Specify below)' && !otherReason.trim()) {
      Alert.alert('Required', 'Please specify the reason for rejection.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await rejectJob(requestId, finalReason);
      if (success) {
        setShowRejectModal(false);
        navigation.replace('MainTabs');
      } else {
        throw new Error('Failed to reject job');
      }
    } catch {
      setModalTitle('System Error');
      setModalDesc('Failed to transmit rejection.');
      setShowGenericModal(true);
    } finally {
      setIsLoading(false);
    }
  }, [requestId, selectedReason, otherReason, navigation, rejectJob]);

  const isReturned = assignment?.status?.toLowerCase() === 'returned';
  const title = isReturned ? 'Review Returned Assignment' : 'Review Assignment';

  if (jobsLoading) return (
    <View style={[styles.center, { backgroundColor: Colors.bgScreen }]}>
      <Text style={{ color: Colors.textMuted }}>Loading offer details...</Text>
    </View>
  );
  if (!assignment) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.bgScreen }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Branding & Offer Type */}
        <View style={styles.header}>
          <View style={[styles.badge, { 
            backgroundColor: isReturned ? Colors.warningSoft : Colors.primaryGlow, 
            borderColor: isReturned ? Colors.warning : Colors.primary 
          }]}>
            <Text style={[styles.badgeText, { color: isReturned ? Colors.warning : Colors.primary }]}>
              {isReturned ? 'RETURNED FOR REVISION' : 'PENDING OFFER'}
            </Text>
          </View>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: Colors.textMuted }]}>
            {isReturned ? 'Corrections Required' : 'Formal Verification Directive'}
          </Text>
        </View>

        {/* Job Brief Card */}
        <View style={[styles.jobCard, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault }]}>
          <Text style={[styles.clientLabel, { color: Colors.textMuted }]}>CLIENT IDENTITY</Text>
          <Text style={[styles.clientName, { color: Colors.textPrimary }]}>{assignment.clientName}</Text>
          <Text style={[styles.refCode, { color: Colors.primary }]}>#{assignment.referenceNumber}</Text>

          <View style={[styles.divider, { backgroundColor: Colors.borderDefault }]} />

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: Colors.textMuted }]}>BANK</Text>
            <Text style={[styles.infoValue, { color: Colors.textSecondary }]}>{assignment.bankName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: Colors.textMuted }]}>LOCATION</Text>
            <Text style={[styles.infoValue, { color: Colors.textSecondary }]}>{assignment.siteAddress}, {assignment.siteCity}</Text>
          </View>

          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={[styles.infoLabel, { color: Colors.textMuted }]}>CONTRACT</Text>
              <Text style={[styles.infoValue, { color: Colors.textSecondary }]}>{assignment.contractType?.name || 'Standard'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.infoLabel, { color: Colors.textMuted }]}>DEADLINE</Text>
              <Text style={[styles.infoValue, { color: Colors.warning }]}>
                {formatDate(assignment.dueDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Return Notes - Show prominently for RETURNED assignments */}
        {isReturned && assignment.opsNotes && (
          <View style={[styles.returnNotesBox, { backgroundColor: Colors.warningSoft, borderColor: Colors.warning }]}>
            <View style={styles.returnNotesHeader}>
              <GeometricIcon type="Alert" size={20} color={Colors.warning} />
              <Text style={[styles.returnNotesTitle, { color: Colors.warning }]}>REVISION REQUIRED</Text>
            </View>
            <Text style={[styles.returnNotesText, { color: Colors.textPrimary }]}>{assignment.opsNotes}</Text>
          </View>
        )}

        {/* Requirements Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: Colors.textMuted }]}>TASK DIRECTIVES</Text>
          <View style={styles.bullet}>
            <View style={styles.bulletIcon}>
              <GeometricIcon type="Check" size={14} color={Colors.primary} />
            </View>
            <Text style={[styles.bulletText, { color: Colors.textSecondary }]}>High-accuracy geotagging is mandatory.</Text>
          </View>
          <View style={styles.bullet}>
            <View style={styles.bulletIcon}>
              <GeometricIcon type="Check" size={14} color={Colors.primary} />
            </View>
            <Text style={[styles.bulletText, { color: Colors.textSecondary }]}>Min. 6 technical photos required from different angles.</Text>
          </View>
          <View style={styles.bullet}>
            <View style={styles.bulletIcon}>
              <GeometricIcon type="Check" size={14} color={Colors.primary} />
            </View>
            <Text style={[styles.bulletText, { color: Colors.textSecondary }]}>On-site verification with client representative.</Text>
          </View>
        </View>

      </ScrollView>

      {/* Action Tray */}
      <View style={[styles.footer, { backgroundColor: Colors.bgScreen, borderTopColor: Colors.borderDefault, paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Button
          title="Decline Offer"
          variant="outline"
          onPress={() => setShowRejectModal(true)}
          disabled={isLoading}
          style={styles.halfBtn}
        />
        <Button
          title={isReturned ? 'Continue Resubmission' : 'Accept & Start'}
          onPress={handleAccept}
          loading={isLoading}
          style={styles.fullBtn}
        />
      </View>

      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setShowRejectModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault, borderWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>Refusal Protocol</Text>
              <Pressable onPress={() => setShowRejectModal(false)} hitSlop={15}>
                <GeometricIcon type="Close" size={24} color={Colors.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>Specify technical reason for refusal:</Text>

            <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
              {REJECTION_REASONS.map((r) => (
                <Pressable
                  key={r}
                  style={[
                    styles.reasonItem,
                    { backgroundColor: Colors.bgInput, borderColor: Colors.borderDefault },
                    selectedReason === r && { borderColor: Colors.danger, backgroundColor: 'rgba(239, 68, 68, 0.05)' }
                  ]}
                  onPress={() => setSelectedReason(r)}
                >
                  <View style={[
                    styles.radio,
                    { borderColor: Colors.borderDefault },
                    selectedReason === r && { borderColor: Colors.danger, borderWidth: 5 }
                  ]} />
                  <Text style={[
                    styles.reasonText,
                    { color: Colors.textSecondary },
                    selectedReason === r && { color: Colors.textPrimary, fontWeight: '700' }
                  ]}>
                    {r}
                  </Text>
                </Pressable>
              ))}

              {selectedReason === 'Other (Specify below)' && (
                <TextInput
                  style={[styles.otherInput, { backgroundColor: Colors.bgInput, borderColor: Colors.borderDefault, color: Colors.textPrimary }]}
                  placeholder="Provide detailed reason..."
                  placeholderTextColor={Colors.textPlaceholder}
                  value={otherReason}
                  onChangeText={setOtherReason}
                  multiline
                />
              )}
            </ScrollView>

            <Button
              title="Confirm Job Refusal"
              variant="danger"
              onPress={handleRejectSubmit}
              loading={isLoading}
              disabled={!selectedReason || (selectedReason === 'Other (Specify below)' && !otherReason.trim())}
              style={styles.modalSubmit}
            />
            <View style={{ height: insets.bottom }} />
          </View>
        </View>
      </Modal>

      {/* Acceptance Modal — PREMIUM Upgrade */}
      <AppModal
        isVisible={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        title={isReturned ? 'Begin Resubmission' : 'Formal Acceptance'}
        icon="Document"
        description={isReturned 
          ? 'You will revise and resubmit this inspection based on the return notes. Previous data will be loaded for editing.'
          : 'By accepting, you commit to performing this verification with high technical integrity within the deadline.'
        }
        primaryAction={{
          label: isReturned ? 'Start Revision' : 'Confirm Acceptance',
          onPress: handleAcceptFinal,
          loading: isLoading,
        }}
        secondaryAction={{
          label: 'Cancel',
          onPress: () => setShowAcceptModal(false),
        }}
      />

      {/* Generic Error/Info Modal */}
      <AppModal
        isVisible={showGenericModal}
        onClose={() => setShowGenericModal(false)}
        title={modalTitle}
        description={modalDesc}
        icon="Alert"
        iconColor={Colors.danger}
        primaryAction={{
          label: 'Acknowledge',
          onPress: () => setShowGenericModal(false),
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12, // Increased for premium feel
    borderWidth: 1.5,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  jobCard: {
    borderRadius: 24,
    padding: 32, // Increased padding
    borderWidth: 1.5,
    marginBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  clientLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  clientName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  refCode: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    marginTop: 4,
  },
  gridItem: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bulletIcon: {
    marginRight: 10,
    marginTop: 4,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 24,
    paddingBottom: 44, // Enhanced safe-area
    borderTopWidth: 1,
    gap: 12,
  },
  halfBtn: {
    flex: 1,
  },
  fullBtn: {
    flex: 1.5,
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
    maxHeight: '85%',
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
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  reasonsList: {
    marginBottom: 24,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    marginRight: 12,
  },
  reasonText: {
    fontSize: 14,
  },
  otherInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    borderWidth: 1.5,
    marginTop: 8,
    height: 100,
    textAlignVertical: 'top',
  },
  modalSubmit: {
    width: '100%',
  },
  returnNotesBox: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    marginBottom: 24,
  },
  returnNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  returnNotesTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  returnNotesText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
  },
});
