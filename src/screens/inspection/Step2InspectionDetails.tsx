import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';
import { useInspectionStore } from '@/stores/inspectionStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  onNext: () => void;
  onBack: () => void;
  requestId: string;
}

const FIELD_KEYS = {
  thisInspectionNumber: 'thisInspectionNumber',
  inspectionDate: 'inspectionDate',
  previousInspectionStatus: 'previousInspectionStatus',
  scopeOfInspection: 'scopeOfInspection',
  inspectionType: 'inspectionType',
  inspectorDetail: 'inspectorDetail',
};

export default function Step2InspectionDetails({ onNext, onBack }: Props) {
  const colors = useColors();
  const activeInspection = useInspectionStore((s) => s.activeInspection);
  const assignment = useInspectionStore((s) => s.assignment);
  const getFormData = useInspectionStore((s) => s.getFormData);
  const updateField = useInspectionStore((s) => s.updateField);
  const user = useAuthStore((s) => s.user);

  const formData = useMemo(() => getFormData(), [getFormData, activeInspection?.formData]);

  const step2 = {
    thisInspectionNumber: formData[FIELD_KEYS.thisInspectionNumber] ?? assignment?.thisInspectionNumber ?? 1,
    inspectionDate: formData[FIELD_KEYS.inspectionDate] ?? new Date().toLocaleDateString(),
    previousInspectionStatus: formData[FIELD_KEYS.previousInspectionStatus] ?? assignment?.previousInspectionStatus ?? '',
    scopeOfInspection: formData[FIELD_KEYS.scopeOfInspection] ?? assignment?.inspectionScope ?? '',
    inspectionType: formData[FIELD_KEYS.inspectionType] ?? assignment?.inspectionType ?? '',
    inspectorDetail: formData[FIELD_KEYS.inspectorDetail] ?? assignment?.userName ?? user?.full_name ?? '',
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgScreen,
    },
    scrollContent: {
      padding: 24,
      paddingBottom: 120,
    },
    pageTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    pageSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 32, // Increased for consistency
    },
    inputGroup: {
      gap: 24,
    },
    warningBanner: {
      backgroundColor: colors.bgInput,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.borderDefault,
      marginTop: 40,
      flexDirection: 'row',
      gap: 14,
      alignItems: 'flex-start',
    },
    warningIcon: {
      fontSize: 16,
      marginTop: 1,
    },
    warningText: {
      color: colors.warning,
      fontSize: 13,
      lineHeight: 20,
      flex: 1,
    },
    warningBold: {
      fontWeight: '700',
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
    nextBtn: { flex: 2 },
  }), [colors]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>Inspection Logic</Text>
        <Text style={styles.pageSubtitle}>
          Define the scope and technical parameters of this verification session.
        </Text>

        <View style={styles.inputGroup}>
          <Input
            label="This Inspection No."
            value={step2.thisInspectionNumber?.toString() || ''}
            onChangeText={(val) => updateField(FIELD_KEYS.thisInspectionNumber, parseInt(val, 10) || 0)}
            placeholder="1"
            keyboardType="numeric"
          />

          <Input
            label="Inspection Scope"
            value={step2.scopeOfInspection}
            onChangeText={(val) => updateField(FIELD_KEYS.scopeOfInspection, val)}
            placeholder="e.g. Physical count & verification of fresh goods"
            multiline
            numberOfLines={4}
            inputHeight={110}
          />

          <Input
            label="Inspection Type"
            value={step2.inspectionType || ''}
            onChangeText={(val) => updateField(FIELD_KEYS.inspectionType, val)}
            placeholder="Scheduled / Surprise / Follow-up"
          />

          <Input
            label="Inspector Identity"
            value={step2.inspectorDetail}
            onChangeText={(val) => updateField(FIELD_KEYS.inspectorDetail, val)}
            placeholder="Verified Agent Name"
          />
        </View>

        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            <Text style={styles.warningBold}>Alert: </Text>
            Discrepancies in inspection count must be explained in the final remarks.
          </Text>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Button title="Back" variant="outline" onPress={onBack} style={styles.backBtn} />
        <Button title="Next: Findings →" onPress={onNext} style={styles.nextBtn} />
      </View>
    </View>
  );
}
