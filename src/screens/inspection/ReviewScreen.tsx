import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet, Alert, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInspectionStore } from '@/stores/inspectionStore';
import { Button } from '@/components/ui/Button';
import { AppModal } from '@/components/ui/AppModal';
import { findingsService } from '@/services/findings/findingsService';
import { ErrorHandler } from '@/utils/errorHandler';
import { GPSPermissionSheet } from '@/components/ui/GPSPermissionSheet';
import { useGPS } from '@/hooks/useGPS';
import { IS_PRODUCTION_API } from '@/config/environment';

interface Props {
  onBack: () => void;
  requestId: string;
  onGoToStep: (step: number) => void;
}

function ReviewCard({ title, onEdit, children, badge, colors }: { title: string; onEdit: () => void; children: React.ReactNode; badge?: string; colors: any }) {
  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 24, // Increased to 24px for premium feel
      padding: 24,
      borderWidth: 1.5,
      borderColor: colors.borderDefault,
      marginBottom: 32, // Consistent 32px rhythm
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDefault,
    },
    cardTitle: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    editBtn: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={styles.headerRight}>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge === 'SATISFACTORY' ? colors.successSoft : colors.warningSoft }]}>
              <Text style={[styles.badgeText, { color: badge === 'SATISFACTORY' ? colors.success : colors.warning }]}>{badge}</Text>
            </View>
          )}
          <Pressable onPress={onEdit}>
            <Text style={styles.editBtn}>Edit</Text>
          </Pressable>
        </View>
      </View>
      {children}
    </View>
  );
}

const FIELD_KEYS = {
  totalTransactionsToDate: 'totalTransactionsToDate',
  thisInspectionNumber: 'thisInspectionNumber',
  inspectionType: 'inspectionType',
  inspectionDate: 'inspectionDate',
  inspectorDetail: 'inspectorDetail',
  remarks: 'remarks',
  overallStatus: 'overall_inspection_status',
};

export default function ReviewScreen({ onBack, requestId, onGoToStep }: Props) {
  const colors = useColors();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const activeInspection = useInspectionStore((s) => s.activeInspection);
  const assignment = useInspectionStore((s) => s.assignment);
  const photos = useInspectionStore((s) => s.photos);
  const getFormData = useInspectionStore((s) => s.getFormData);
  const getSchema = useInspectionStore((s) => s.getSchema);
  const gps = useInspectionStore((s) => s.gps);
  const setGPS = useInspectionStore((s) => s.setGPS);
  const clearActive = useInspectionStore((s) => s.clearActive);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [gpsSheetVisible, setGpsSheetVisible] = useState(false);
  const [gpsSheetState, setGpsSheetState] = useState<'denied' | 'blocked' | 'unavailable'>('denied');

  const { loading: gpsLoading, error: gpsError, refreshLocation, openSettings } = useGPS();

  const formData = useMemo(() => getFormData(), [getFormData, activeInspection?.formData]);
  const schemaSnapshot = useMemo(() => getSchema(), [getSchema, activeInspection?.schemaSnapshot]);

  const step1 = {
    totalTransactionsToDate: formData[FIELD_KEYS.totalTransactionsToDate] ?? null,
  };

  const step2 = {
    thisInspectionNumber: formData[FIELD_KEYS.thisInspectionNumber] ?? assignment?.thisInspectionNumber ?? 1,
    inspectionType: formData[FIELD_KEYS.inspectionType] ?? assignment?.inspectionType ?? '',
    inspectionDate: formData[FIELD_KEYS.inspectionDate] ?? new Date().toLocaleDateString(),
    inspectorDetail: formData[FIELD_KEYS.inspectorDetail] ?? assignment?.userName ?? '',
  };

  const step3 = {
    findingData: formData,
    remarks: formData[FIELD_KEYS.remarks] ?? '',
    overallStatus: formData[FIELD_KEYS.overallStatus] ?? 'satisfactory',
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      await proceedWithGPS();
    } finally {
      setSubmitting(false);
    }
  };

  const proceedWithGPS = async () => {
    const gpsResult = await refreshLocation(IS_PRODUCTION_API);
    if (!gpsResult) {
      if (gpsError?.code === 'DENIED' || gpsError?.code === 'BLOCKED' || gpsError?.code === 'UNAVAILABLE') {
        setGpsSheetState(gpsError.code.toLowerCase() as 'denied' | 'blocked' | 'unavailable');
        setGpsSheetVisible(true);
        return;
      }
      Alert.alert('Location Error', gpsError?.message || 'Unable to capture location.');
      return;
    }

    // Persist GPS to draft for review display
    setGPS({
      latitude: gpsResult.latitude,
      longitude: gpsResult.longitude,
      isMocked: gpsResult.isMocked,
      rawCoordinates: gpsResult.rawCoordinates,
    });

    try {
      const photosByField: Record<string, string[]> = {};
      photos.forEach((p) => {
        const key = p.fieldId || 'general';
        if (!photosByField[key]) photosByField[key] = [];
        if (p.localUri) {
          photosByField[key].push(p.localUri);
        }
      });

      await findingsService.submitFindings({
        requestId,
        findingData: {
          ...step3.findingData,
          remarks: step3.remarks,
          totalTransactionsToDate: step1.totalTransactionsToDate,
          thisInspectionNumber: step2.thisInspectionNumber,
          inspectionDate: step2.inspectionDate,
          inspectionType: step2.inspectionType,
          inspectorDetail: step2.inspectorDetail,
        },
        overallStatus: (step3.findingData[FIELD_KEYS.overallStatus] as string) || 'satisfactory',
        photosByField,
        gpsCoordinates: {
          latitude: gpsResult.latitude,
          longitude: gpsResult.longitude,
        },
      });

      clearActive();
      if (assignment) {
        (navigation as any).navigate('Success', { reference: assignment.referenceNumber });
      }
    } catch (err) {
      console.log('[Submission Error]', err);
      Alert.alert('Submission Failed', ErrorHandler.mapError(err).message);
    } finally {
      setShowConfirm(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgScreen,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 4,
      paddingBottom: 140,
    },
    pageHeader: {
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 36,
    },
    readyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryGlow,
      borderWidth: 1.5,
      borderColor: colors.primary,
      marginBottom: 20,
    },
    checkMark: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.primary,
    },
    readyTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    readyDesc: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 22,
      color: colors.textSecondary,
      paddingHorizontal: 20,
    },
    infoRow: {
      flexDirection: 'row',
      marginBottom: 16,
      gap: 16,
    },
    infoCol: {
      flex: 1,
    },
    label: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    value: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    secondaryValue: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    checklist: {
      gap: 12,
    },
    checkItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 12,
    },
    checkLabel: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    photoGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    thumbnail: {
      width: 64,
      height: 64,
      borderRadius: 16, // Increased radius for consistency
      backgroundColor: colors.bgScreen,
      borderWidth: 1.5,
      borderColor: colors.borderDefault,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    notesBox: {
      backgroundColor: colors.bgScreen,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    notesText: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      padding: 20,
      paddingBottom: 40,
      backgroundColor: colors.bgScreen,
      borderTopWidth: 1,
      borderTopColor: colors.borderDefault,
      gap: 12,
    },
    backBtn: { flex: 1 },
    submitBtn: { flex: 2 },
  }), [colors, insets]);


  if (!assignment) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.pageHeader}>
          <View style={styles.readyIcon}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.readyTitle}>
            {assignment.status?.toLowerCase() === 'returned' ? 'Review & Resubmit' : 'Review & Submit'}
          </Text>
          <Text style={styles.readyDesc}>
            {assignment.status?.toLowerCase() === 'returned' 
              ? 'Verify all corrections before resubmitting the revised inspection report.'
              : 'Verify all findings before transmitting the final inspection report to the registry.'
            }
          </Text>
        </View>

        <ReviewCard title="Asset Context" onEdit={() => onGoToStep(1)} colors={colors}>
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Client Name</Text>
              <Text style={styles.value}>{assignment.clientName}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Ref No.</Text>
              <Text style={styles.value}>#{assignment.referenceNumber}</Text>
            </View>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.label}>Site Address</Text>
            <Text style={styles.secondaryValue}>{assignment.siteAddress}, {assignment.siteCity}</Text>
          </View>
        </ReviewCard>

        <ReviewCard title="Audit Logistics" onEdit={() => onGoToStep(2)} colors={colors}>
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Insp. No.</Text>
              <Text style={styles.value}>{step2.thisInspectionNumber}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Type</Text>
              <Text style={styles.value}>{step2.inspectionType || 'Scheduled'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Inspection Date</Text>
              <Text style={styles.value}>{step2.inspectionDate}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Inspector</Text>
              <Text style={styles.value}>{step2.inspectorDetail || assignment.userName}</Text>
            </View>
          </View>
        </ReviewCard>

        <ReviewCard title="Field Observations" onEdit={() => onGoToStep(3)} badge={step3.overallStatus?.toUpperCase() || 'PENDING'} colors={colors}>
          <View style={styles.checklist}>
            {(schemaSnapshot || []).slice(0, 3).map((f: any) => (
              <View key={f.key} style={styles.checkItem}>
                <View style={[styles.dot, { backgroundColor: step3.findingData?.[f.key] ? colors.success : colors.borderDefault }]} />
                <Text style={styles.checkLabel}>{f.label}</Text>
              </View>
            ))}
            {(schemaSnapshot?.length || 0) > 3 && (
              <Text style={styles.emptyText}>+ {(schemaSnapshot?.length || 0) - 3} additional checks recorded.</Text>
            )}
          </View>
        </ReviewCard>

        <ReviewCard title="Media Evidence" onEdit={() => onGoToStep(4)} colors={colors}>
          <View style={styles.photoGrid}>
            {photos.length > 0 ? photos.slice(0, 4).map((p, idx) => (
              <Image key={idx} source={{ uri: p.localUri ?? undefined }} style={styles.thumbnail} />
            )) : (
              <Text style={styles.emptyText}>No media files attached.</Text>
            )}
            {photos.length > 4 && (
              <View style={[styles.thumbnail, { alignItems: 'center', justifyContent: 'center' }] }>
                <Text style={styles.label}>+{photos.length - 4}</Text>
              </View>
            )}
          </View>
          {gps && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.label}>Audit Geotag</Text>
              <Text style={styles.secondaryValue}>
                {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
                {gps.isMocked ? ' (MOCKED)' : ' (VERIFIED)'}
              </Text>
            </View>
          )}
          <View style={[styles.notesBox, { marginTop: 16 }]}>
            <Text style={styles.notesText}>
              {step3.remarks ? `"${step3.remarks}"` : 'No additional remarks provided.'}
            </Text>
          </View>
        </ReviewCard>

        {assignment?.opsNotes && (
          <ReviewCard title="Return Notes" onEdit={() => {}} colors={colors}>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{assignment.opsNotes}</Text>
            </View>
          </ReviewCard>
        )}

      </ScrollView>

      <View style={styles.footer}>
        <Button title="‹ Back" variant="outline" onPress={onBack} style={styles.backBtn} />
        <Button
          title={assignment.status?.toLowerCase() === 'returned' ? 'Resubmit Report ✓' : 'Submit Report ✓'}
          onPress={() => setShowConfirm(true)}
          style={styles.submitBtn}
        />
      </View>

      <AppModal
        isVisible={showConfirm}
        onClose={() => !submitting && setShowConfirm(false)}
        title={assignment.status?.toLowerCase() === 'returned' ? 'Finalize Resubmission' : 'Finalize Submission'}
        icon="Award"
        description={assignment.status?.toLowerCase() === 'returned'
          ? `Ready to resubmit the revised verification report for #${assignment.referenceNumber}? This action records your corrections and timestamp.`
          : `Ready to submit the verification report for #${assignment.referenceNumber}? This action records your signature and timestamp.`
        }
        primaryAction={{
          label: submitting ? 'Sending...' : (assignment.status?.toLowerCase() === 'returned' ? 'Confirm & Resubmit' : 'Confirm & Submit'),
          onPress: handleFinalSubmit,
          loading: submitting,
        }}
        secondaryAction={{
          label: 'Keep Reviewing',
          onPress: () => setShowConfirm(false),
        }}
      />

      <GPSPermissionSheet
        visible={gpsSheetVisible}
        state={gpsSheetState}
        onRetry={async () => {
          setGpsSheetVisible(false);
          await refreshLocation(IS_PRODUCTION_API);
        }}
        onClose={() => setGpsSheetVisible(false)}
      />
    </View>
  );
}
