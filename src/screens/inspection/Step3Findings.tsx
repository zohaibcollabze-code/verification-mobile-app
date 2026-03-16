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
  const activeInspection = useInspectionStore((s) => s.activeInspection);
  const assignment = useInspectionStore((s) => s.assignment);
  const getFormData = useInspectionStore((s) => s.getFormData);
  const getSchema = useInspectionStore((s) => s.getSchema);
  const updateField = useInspectionStore((s) => s.updateField);

  const schema = useMemo(() => getSchema(), [getSchema, activeInspection?.schemaSnapshot]);
  const formData = useMemo(() => getFormData(), [getFormData, activeInspection?.formData]);
  const remarks = formData.remarks || '';
  const overallStatus = (formData.overall_inspection_status as InspectionOverallStatus) || 'satisfactory';

  const handleFieldChange = useCallback((key: string, val: any) => {
    updateField(key, val);

    // AUTO-CALCULATION LOGIC: Murabaha Final Price
    const assignmentCode = assignment?.contractType?.code;
    if (assignmentCode === 'MUR') {
      const data = { ...formData, [key]: val };
      const cost = Number(data.purchase_cost || 0);
      const margin = Number(data.profit_margin || 0);
      if (key === 'purchase_cost' || key === 'profit_margin') {
        const final = cost + (cost * margin / 100);
        updateField('final_price', final);
      }
    }
  }, [updateField, assignment, formData]);

  const handleStatusSelect = useCallback((status: InspectionOverallStatus) => {
    updateField('overall_inspection_status', status);
  }, [updateField]);

  // §7: Filter schema for conditional visibility and exclude photo fields
  const visibleSchema = useMemo(() => {
    return schema.filter((field) => {
      if (field.photo === true) return false;
      if (field.key === 'transfer_terms' && assignment?.contractType?.code === 'IJA') {
        return !!formData.ownership_transfer_clause;
      }
      return true;
    });
  }, [schema, formData, assignment]);

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
      borderRadius: 24,
      padding: 24,
      borderWidth: 1.5,
      borderColor: colors.borderDefault,
      marginBottom: 32,
    },
    fieldCheckList: {
      gap: 16,
    },
    fieldWrapper: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDefault,
    },
    fieldWrapperFirst: {
      paddingTop: 0,
    },
    fieldWrapperLast: {
      paddingBottom: 0,
      borderBottomWidth: 0,
    },
    remarksCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 24,
      padding: 24,
      paddingBottom: 24,
      borderWidth: 1.5,
      borderColor: colors.borderDefault,
      marginBottom: 32,
    },
    saveRow: {
      alignItems: 'flex-end',
      marginTop: 16,
    },
    saveBtn: {
      minWidth: 140,
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

  if (!assignment) return null;

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
          <View style={styles.fieldCheckList}>
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
                  value={formData[field.key]}
                  onChange={(val) => handleFieldChange(field.key, val)}
                />
              </View>
            )) : (
              <Text style={styles.emptyHint}>No dynamic fields configured for this job type.</Text>
            )}
          </View>
        </View>

        {/* Remarks */}
        <View style={styles.remarksCard}>
          <Text style={styles.sectionTitle}>Final Technical Remarks</Text>
          <View style={styles.remarksContainer}>
            <Input
              placeholder="Detail any critical observations or remediation steps..."
              value={remarks}
              onChangeText={(val) => updateField('remarks', val)}
              multiline
              inputHeight={160}
              textAlignVertical="top"
            />
          </View>
          <View style={styles.saveRow}>
            <Button
              title="Save Progress"
              variant="outline"
              onPress={() => {}}
              style={styles.saveBtn}
            />
          </View>
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
