import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';
import { useInspectionStore } from '@/stores/inspectionStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Props {
  onNext: () => void;
  onBack: () => void;
  requestId: string;
}

export default function Step1ClientDetails({ onNext, requestId }: Props) {
  const colors = useColors();
  const storedDraft = useInspectionStore((s) => s.drafts[requestId]);
  const updateStep1 = useInspectionStore((s) => s.updateStep1);

  const assignment = storedDraft?.assignment;
  const step1 = storedDraft?.step1 || { totalTransactionsToDate: null };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgScreen,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 4, // Reduced because StepIndicator adds padding
      paddingBottom: 140, // Ensure footer clearance
    },
    // ── Page Header ──────────────────────────────────────
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
      marginBottom: 32, // Standardized 32px gap
    },
    // ── Asset Card ───────────────────────────────────────
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 24, // Increased for premium feel
      padding: 24,
      borderWidth: 1.5,
      borderColor: colors.borderDefault,
      marginBottom: 36,
      gap: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 5,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDefault,
    },
    cardHeaderTitle: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 1.5,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.success,
      shadowColor: colors.success,
      shadowOpacity: 0.6,
      shadowRadius: 4,
    },
    // ── Info Items ───────────────────────────────────────
    infoGrid: {
      gap: 16,
    },
    infoRow: {
      flexDirection: 'row',
      gap: 16,
    },
    infoItem: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 10,
      color: colors.textMuted,
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    infoValue: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '600',
      lineHeight: 20,
    },
    // ── Section separator ────────────────────────────────
    sectionHeader: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: 16,
      textTransform: 'uppercase',
    },
    inputGroup: {
      gap: 16,
      marginBottom: 24,
    },
    // ── Info Banner ──────────────────────────────────────
    infoBanner: {
      backgroundColor: 'rgba(37, 99, 235, 0.06)',
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(37, 99, 235, 0.12)',
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    infoBannerIcon: {
      fontSize: 16,
      marginTop: 1,
    },
    infoBannerText: {
      color: colors.primary,
      fontSize: 13,
      lineHeight: 20,
      flex: 1,
    },
    infoBannerBold: {
      fontWeight: '700',
    },
    // ── Footer ───────────────────────────────────────────
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      paddingBottom: 40,
      backgroundColor: colors.bgScreen,
      borderTopWidth: 1,
      borderTopColor: colors.borderDefault,
    },
    nextBtn: {
      width: '100%',
    },
  }), [colors]);

  if (!assignment) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>Asset Information</Text>
        <Text style={styles.pageSubtitle}>
          Verify the pre-loaded details below before beginning the inspection.
        </Text>

        {/* Asset Record Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>ASSET RECORD</Text>
            <View style={styles.statusDot} />
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Asset Reference</Text>
              <Text style={styles.infoValue}>#{assignment.referenceNumber}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Client Identity</Text>
              <Text style={styles.infoValue}>{assignment.clientName}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Banking Partner</Text>
              <Text style={styles.infoValue}>{assignment.bankName}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Location / Site</Text>
              <Text style={styles.infoValue}>{assignment.siteAddress}, {assignment.siteCity}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>System Type</Text>
                <Text style={styles.infoValue}>{assignment.contractType?.name || 'Standard'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Contact Person</Text>
                <Text style={styles.infoValue}>{assignment.contactPerson || '—'}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Contact Number</Text>
              <Text style={styles.infoValue}>{assignment.siteContactNumber || '—'}</Text>
            </View>
          </View>
        </View>



        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerIcon}>ℹ️</Text>
          <Text style={styles.infoBannerText}>
            <Text style={styles.infoBannerBold}>System Note: </Text>
            High-pressure systems require manual bypass verification in the MEDIA step.
          </Text>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Begin Inspection Findings →"
          onPress={onNext}
          style={styles.nextBtn}
        />
      </View>
    </View>
  );
}
