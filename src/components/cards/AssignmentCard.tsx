import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useColors } from '@/constants/colors';
import { StatusBadge } from '@/components/ui/Badge';
import type { RequestModel } from '@/services/api/types/requestTypes';
import { formatDate } from '@/utils/formatters';

interface AssignmentCardProps {
  assignment: RequestModel;
  onPress: (id: string) => void;
  hasDraft?: boolean;
  syncStatus?: 'none' | 'pending' | 'syncing' | 'conflict';
  onConflictPress?: () => void;
}

/**
 * AssignmentCard (JobCard) — The flagship surface.
 * Glassmorphism + Gold Accents + Typography Focus.
 */
const SYNC_BADGE_META = {
  syncing: {
    label: '🔄 Syncing…',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: '#3B82F6',
    text: '#1D4ED8',
  },
  conflict: {
    label: '⚠️ Conflict',
    bg: 'rgba(248, 113, 113, 0.15)',
    border: '#EF4444',
    text: '#B91C1C',
  },
} as const;

type SyncBadgeKey = keyof typeof SYNC_BADGE_META;

export function AssignmentCard({ assignment, onPress, hasDraft, syncStatus = 'none', onConflictPress }: AssignmentCardProps) {
  const Colors = useColors();
  const statusColor = (Colors.statusBadge as any)[assignment.status]?.text ?? Colors.primary;
  const displayDate = assignment.dueDate || assignment.thisInspectionDate || assignment.createdAt;
  const syncMeta = syncStatus !== 'none' ? SYNC_BADGE_META[syncStatus as SyncBadgeKey] : null;
  const SyncBadgeWrapper = syncStatus === 'conflict' && onConflictPress ? Pressable : View;
  const fieldData = assignment.fieldData || {};
  const isUrgent = assignment.isUrgent === true || fieldData.isUrgent === true || fieldData.urgent === true;
  const urgencyReason = assignment.urgencyReason || fieldData.urgencyReason || fieldData.urgency_reason || '';
  const writtenOfferUrl = assignment.writtenOfferUrl || fieldData.writtenOfferUrl || fieldData.offerLetterUrl || fieldData.written_offer_url;
  const noticeOfDeliveryUrl = assignment.noticeOfDeliveryUrl || fieldData.noticeOfDeliveryUrl || fieldData.notice_of_delivery_url;
  const declarationDateRaw = fieldData.dateOfDeclaration || fieldData.date_of_declaration;
  const declarationDate = declarationDateRaw ? formatDate(declarationDateRaw) : null;

  const handleOpenUrl = async (url?: string) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.warn('[AssignmentCard] Failed to open url', error);
    }
  };

  return (
    <Pressable
      onPress={() => onPress(assignment.id)}
      style={[styles.card, { backgroundColor: Colors.bgCard, borderColor: statusColor, borderWidth: 1.5 }]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.type, { color: Colors.textMuted }]}>
            {assignment.inspectionType?.toUpperCase() || 'INSPECTION'}
          </Text>
          <Text style={[styles.title, { color: statusColor }]} numberOfLines={2}>
            {assignment.clientName}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <StatusBadge status={assignment.status as any} />
          {isUrgent && (
            <View style={[styles.urgentBadge, { backgroundColor: Colors.dangerSoft, borderColor: Colors.danger }]}>
              <Text style={[styles.urgentBadgeLabel, { color: Colors.danger }]}>URGENT</Text>
            </View>
          )}
          {syncMeta && (
            <SyncBadgeWrapper
              onPress={syncStatus === 'conflict' ? onConflictPress : undefined}
              style={[styles.syncBadge, { backgroundColor: syncMeta.bg, borderColor: syncMeta.border }]}
              hitSlop={syncStatus === 'conflict' ? 8 : undefined}
            >
              <Text style={[styles.syncBadgeText, { color: syncMeta.text }] }>{syncMeta.label}</Text>
            </SyncBadgeWrapper>
          )}
        </View>
      </View>

      <View style={styles.details}>
        {!!urgencyReason && (
          <Text style={[styles.urgencyReasonText, { color: Colors.danger }]} numberOfLines={1}>
            {urgencyReason}
          </Text>
        )}
        <Text style={[styles.bank, { color: Colors.textPrimary }]}>
          {assignment.bankName}
        </Text>
        <Text style={[styles.location, { color: Colors.textSecondary }]}>
          {assignment.siteCity}, {assignment.siteAddress}
        </Text>
      </View>

      {(writtenOfferUrl || noticeOfDeliveryUrl) && (
        <View style={styles.docRow}>
          {writtenOfferUrl && (
            <Pressable
              onPress={() => handleOpenUrl(writtenOfferUrl)}
              style={[styles.docPill, { borderColor: Colors.primary }]}
            >
              <Text style={[styles.docPillLabel, { color: Colors.primary }]}>Written Offer</Text>
            </Pressable>
          )}
          {noticeOfDeliveryUrl && (
            <Pressable
              onPress={() => handleOpenUrl(noticeOfDeliveryUrl)}
              style={[styles.docPill, { borderColor: Colors.warning }]}
            >
              <View>
                <Text style={[styles.docPillLabel, { color: Colors.warning }]}>Notice of Delivery</Text>
                {declarationDate && (
                  <Text style={[styles.docPillMeta, { color: Colors.textMuted }]}>Declared {declarationDate}</Text>
                )}
              </View>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <View>
          <Text style={[styles.footerLabel, { color: Colors.textMuted }]}>DUE DATE</Text>
          <Text style={[styles.footerValue, { color: Colors.textPrimary }]}>
            {displayDate ? formatDate(displayDate) : 'TBD'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.idLabel, { color: Colors.textMuted }]}>REF ID</Text>
          <Text style={[styles.idValue, { color: statusColor }] }>
            #{assignment.referenceNumber}
          </Text>
        </View>
      </View>

      {hasDraft && (
        <View style={[styles.draftBadge, { backgroundColor: Colors.primary }] }>
          <Text style={styles.draftText}>DRAFT</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  urgentBadge: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgentBadgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  urgencyReasonText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  type: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  details: {
    marginBottom: 16,
  },
  bank: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    fontWeight: '500',
  },
  docRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  docPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  docPillLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  docPillMeta: {
    fontSize: 10,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  idLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  idValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  syncBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  draftBadge: {
    position: 'absolute',
    top: 0,
    right: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  draftText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFF',
  },
  syncButton: {
    marginTop: 12,
    alignSelf: 'stretch',
    borderWidth: 1.5,
  },
});
