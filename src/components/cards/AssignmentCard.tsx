import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColors } from '@/constants/colors';
import { StatusBadge } from '@/components/ui/Badge';
import type { RequestModel } from '@/services/api/types/requestTypes';
import { formatDate } from '@/utils/formatters';

interface AssignmentCardProps {
  assignment: RequestModel;
  onPress: (id: string) => void;
  hasDraft?: boolean;
}

/**
 * AssignmentCard (JobCard) — The flagship surface.
 * Glassmorphism + Gold Accents + Typography Focus.
 */
export function AssignmentCard({ assignment, onPress, hasDraft }: AssignmentCardProps) {
  const Colors = useColors();
  const statusColor = (Colors.statusBadge as any)[assignment.status]?.text ?? Colors.primary;

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
          <Text style={[styles.title, { color: Colors.textAccent }]} numberOfLines={2}>
            {assignment.clientName}
          </Text>
        </View>
        <StatusBadge status={assignment.status as any} />
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
            {assignment.dueDate ? formatDate(assignment.dueDate) : 'TBD'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.idLabel, { color: Colors.textMuted }]}>REF ID</Text>
          <Text style={[styles.idValue, { color: Colors.textAccent }]}>
            #{assignment.referenceNumber}
          </Text>
        </View>
      </View>

      {hasDraft && (
        <View style={[styles.draftBadge, { backgroundColor: Colors.accentBlue }]}>
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
});
