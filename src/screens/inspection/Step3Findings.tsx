import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useColors } from '@/constants/colors';
import { useInspectionStore } from '@/stores/inspectionStore';
import { Button } from '@/components/ui/Button';
import { DynamicField } from '@/components/forms/DynamicField';
import { Input } from '@/components/ui/Input';
import type { InspectionOverallStatus } from '@/types/schema.types';

interface Props {
  onNext: () => void;
  onBack: () => void;
  requestId: string;
}

export default function Step3Findings({ onNext, onBack, requestId }: Props) {
  const colors = useColors();
  const statusTokens = useMemo(() => ({
    satisfactory: {
      indicator: colors.success,
      border: colors.success,
      background: colors.successSoft,
      text: colors.success,
    },
    unsatisfactory: {
      indicator: colors.danger,
      border: colors.danger,
      background: colors.dangerSoft,
      text: colors.danger,
    },
    conditional: {
      indicator: colors.warning,
      border: colors.warning,
      background: colors.warningSoft,
      text: colors.warning,
    },
  }), [colors.success, colors.successSoft, colors.danger, colors.dangerSoft, colors.warning, colors.warningSoft]);
  const storedDraft = useInspectionStore((s) => s.drafts[requestId]);
  const updateStep3 = useInspectionStore((s) => s.updateStep3);

  // §7: Dynamic schema snapshot from draft (initialized in previous steps)
  const schema = useMemo(() =>
    storedDraft?.schemaSnapshot || [],
    [storedDraft?.schemaSnapshot]);

  const step3 = storedDraft?.step3 || {
    findingData: {},
    overallStatus: 'satisfactory' as InspectionOverallStatus,
    remarks: '',
  };

  const handleFieldChange = useCallback((key: string, val: any) => {
    updateStep3(requestId, {
      findingData: { [key]: val },
    });

    // AUTO-CALCULATION LOGIC: Murabaha Final Price
    // AUTO-CALCULATION LOGIC: Murabaha Final Price
    const assignmentCode = storedDraft?.assignment?.contractType?.code;
    if (assignmentCode === 'MUR') {
      const data = { ...step3.findingData, [key]: val };
      const cost = Number(data.purchase_cost || 0);
      const margin = Number(data.profit_margin || 0);
      if (key === 'purchase_cost' || key === 'profit_margin') {
        const final = cost + (cost * margin / 100);
        updateStep3(requestId, { findingData: { final_price: final } });
      }
    }
  }, [requestId, updateStep3, storedDraft?.assignment, step3.findingData]);

  const handleStatusSelect = useCallback((status: InspectionOverallStatus) => {
    updateStep3(requestId, { findingData: { 'overall_inspection_status': status } });
  }, [requestId, updateStep3]);

  // §7: Filter schema for conditional visibility
  const visibleSchema = useMemo(() => {
    return schema.filter((field) => {
      if (field.key === 'transfer_terms' && storedDraft?.assignment?.contractType?.code === 'IJA') {
        return !!step3.findingData.ownership_transfer_clause;
      }
      return true;
    });
  }, [schema, step3.findingData, storedDraft?.assignment?.contractType?.code]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgScreen,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 4,
      paddingBottom: 160,
    },
    // ── Page Header ──────────────────────────────────
    pageTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.5,
      marginBottom: 6,
      textAlign: 'center',
    },
    pageSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 40, // Increased
      textAlign: 'center',
    },
    pageHeader: {
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 40, // Increased
    },
    // ── Context pills ─────────────────────────────────
    contextRow: {
      flexDirection: 'row',
      gap: 16, // Increased
      marginBottom: 20, // Increased
      flexWrap: 'wrap',
    },
    pill: {
      borderRadius: 12, // Increased for premium feel
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.bgCard,
      borderWidth: 1.5,
      borderColor: colors.borderDefault,
    },
    pillLabel: {
      fontSize: 10,
      color: colors.textMuted,
      fontWeight: '700',
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    pillValue: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '700',
    },
    // ── Dynamic Fields Card ───────────────────────────
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 24, // Increased to 24px for premium consistency
      padding: 24,
      borderWidth: 1.5,
      borderColor: colors.borderDefault,
      marginBottom: 32,
    },
    fieldWrapper: {
      paddingVertical: 14,
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDefault,
    },
    fieldWrapperFirst: {
      paddingTop: 0,
      marginTop: 4,
    },
    fieldWrapperLast: {
      marginBottom: 0,
      paddingBottom: 0,
      borderBottomWidth: 0,
    },
    cardHeaderTitle: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 1.5,
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDefault,
    },
    emptyHint: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 14,
      paddingVertical: 24,
    },
    // ── Status Grid ───────────────────────────────────
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginTop: 32, // Added top margin for separation
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    statusGrid: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 32, // Standardized
    },
    statusCard: {
      flex: 1,
      height: 88,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.borderDefault,
      backgroundColor: colors.bgCard,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textMuted,
      textAlign: 'center',
      letterSpacing: 0.8,
    },
    // ── Remarks ───────────────────────────────────────
    remarksContainer: {
      gap: 0,
      marginBottom: 32,
    },
    // ── Footer ────────────────────────────────────────
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

  if (!storedDraft?.assignment) return null;

  const assignment = storedDraft.assignment;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>Detailed Findings</Text>
        

        {/* Context Pills */}
        <View style={styles.contextRow}>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>CLIENT</Text>
            <Text style={styles.pillValue}>{assignment.clientName}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>REF ID</Text>
            <Text style={styles.pillValue}>#{assignment.referenceNumber}</Text>
          </View>
        </View>

        {/* Dynamic Schema Fields Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>FIELD CHECKS</Text>
          {visibleSchema.length > 0 ? visibleSchema.map((field, index) => (
            <View
              key={field.key}
              style={[
                styles.fieldWrapper,
                index === 0 && styles.fieldWrapperFirst,
                index === visibleSchema.length - 1 && styles.fieldWrapperLast,
              ]}
            >
              <DynamicField
                field={field}
                value={step3.findingData[field.key]}
                onChange={(val) => handleFieldChange(field.key, val)}
              />
            </View>
          )) : (
            <Text style={styles.emptyHint}>No dynamic fields configured for this job type.</Text>
          )}
        </View>

        {/* Remarks */}
        <Text style={styles.sectionTitle}>Final Technical Remarks</Text>
        <View style={styles.remarksContainer}>
          <Input
            placeholder="Detail any critical observations or remediation steps..."
            value={step3.remarks}
            onChangeText={(val) => updateStep3(requestId, { remarks: val })}
            multiline
            inputHeight={160}
            textAlignVertical="top"
          />
        </View>

      </ScrollView>

      {/* Navigation Footer */}
      <View style={styles.footer}>
        <Button
          title="Back"
          variant="outline"
          onPress={onBack}
          style={styles.backBtn}
        />
        <Button
          title="Next: Evidence →"
          onPress={onNext}
          style={styles.nextBtn}
        />
      </View>
    </View>
  );
}
