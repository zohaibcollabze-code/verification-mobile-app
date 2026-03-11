import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColors } from '@/constants/colors';
import { StatusBadge } from '@/components/ui/Badge';
import type { RequestModel } from '@/services/api/types/requestTypes';
import { formatDate } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';

interface AssignmentCardProps {
  assignment: RequestModel;
  onPress: (id: string) => void;
  hasDraft?: boolean;
  syncStatus?: 'none' | 'pending' | 'syncing' | 'conflict';
  onSyncPress?: () => void;
  onConflictPress?: () => void;
}

/**
 * AssignmentCard (JobCard) — The flagship surface.
 * Glassmorphism + Gold Accents + Typography Focus.
 */
const SYNC_BADGE_META = {
  pending: {
    label: '⏳ Pending Sync',
    bg: 'rgba(251, 191, 36, 0.15)',
    border: '#FBBF24',
    text: '#92400E',
  },
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

export function AssignmentCard({ assignment, onPress, hasDraft, syncStatus = 'none', onSyncPress, onConflictPress }: AssignmentCardProps) {
  const Colors = useColors();
  const statusColor = (Colors.statusBadge as any)[assignment.status]?.text ?? Colors.primary;
  const displayDate = assignment.dueDate || assignment.thisInspectionDate || assignment.createdAt;
  const syncMeta = syncStatus !== 'none' ? SYNC_BADGE_META[syncStatus as SyncBadgeKey] : null;
  const SyncBadgeWrapper = syncStatus === 'conflict' && onConflictPress ? Pressable : View;

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
          <Text style={[styles.title, { color: Colors.primary }]} numberOfLines={2}>
            {assignment.clientName}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <StatusBadge status={assignment.status as any} />
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
        <Text style={[styles.bank, { color: Colors.textPrimary }]}>
          {assignment.bankName}
        </Text>
        <Text style={[styles.location, { color: Colors.textSecondary }]}>
          {assignment.siteCity}, {assignment.siteAddress}
        </Text>
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={[styles.footerLabel, { color: Colors.textMuted }]}>DUE DATE</Text>
          <Text style={[styles.footerValue, { color: Colors.textPrimary }]}>
            {displayDate ? formatDate(displayDate) : 'TBD'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.idLabel, { color: Colors.textMuted }]}>REF ID</Text>
          <Text style={[styles.idValue, { color: Colors.primary }] }>
            #{assignment.referenceNumber}
          </Text>
        </View>
      </View>

      {syncStatus === 'pending' && onSyncPress && (
        <Button title="Sync Now" variant="outline" onPress={onSyncPress} style={styles.syncButton} textStyle={{ color: Colors.primary }} />
      )}

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
