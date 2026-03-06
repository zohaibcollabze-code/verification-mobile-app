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

export default function Step2InspectionDetails({ onNext, onBack, requestId }: Props) {
  const colors = useColors();
  const storedDraft = useInspectionStore((s) => s.drafts[requestId]);
  const updateStep2 = useInspectionStore((s) => s.updateStep2);
  const user = useAuthStore((s) => s.user);

  const assignment = storedDraft?.assignment;

  const step2 = {
    thisInspectionNumber: storedDraft?.step2?.thisInspectionNumber ?? assignment?.thisInspectionNumber ?? 1,
    inspectionDate: storedDraft?.step2?.inspectionDate ?? new Date().toLocaleDateString(),
    previousInspectionStatus: storedDraft?.step2?.previousInspectionStatus ?? assignment?.previousInspectionStatus ?? '',
    scopeOfInspection: storedDraft?.step2?.scopeOfInspection ?? assignment?.inspectionScope ?? '',
    inspectionType: storedDraft?.step2?.inspectionType ?? assignment?.inspectionType ?? '',
    inspectorDetail: storedDraft?.step2?.inspectorDetail ?? assignment?.userName ?? user?.full_name ?? '',
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
            onChangeText={(val) => updateStep2(requestId, { thisInspectionNumber: parseInt(val) || 0 })}
            placeholder="1"
            keyboardType="numeric"
          />

          <Input
            label="Inspection Scope"
            value={step2.scopeOfInspection}
            onChangeText={(val) => updateStep2(requestId, { scopeOfInspection: val })}
            placeholder="e.g. Physical count & verification of fresh goods"
            multiline
            numberOfLines={4}
            inputHeight={110}
          />

          <Input
            label="Inspection Type"
            value={step2.inspectionType || ''}
            onChangeText={(val) => updateStep2(requestId, { inspectionType: val as any })}
            placeholder="Scheduled / Surprise / Follow-up"
          />

          <Input
            label="Inspector Identity"
            value={step2.inspectorDetail}
            onChangeText={(val) => updateStep2(requestId, { inspectorDetail: val })}
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
