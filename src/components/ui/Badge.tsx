/**
 * MPVP — Badge Component (Dynamic Theme)
 * Status badges for assignments, priority, and inspection results.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/constants/colors';
import type { AssignmentStatus, Priority } from '@/types/api.types';
import type { InspectionOverallStatus } from '@/types/schema.types';

interface StatusBadgeProps {
  status: AssignmentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const Colors = useColors();
  const colors = (Colors.statusBadge as any)[status] ?? Colors.statusBadge.ASSIGNED;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.text }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>
        {(status || 'UNKNOWN').replace('_', ' ')}
      </Text>
    </View>
  );
}

interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const Colors = useColors();
  const colors = Colors.priority[priority] ?? Colors.priority.NORMAL;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{priority}</Text>
    </View>
  );
}

interface InspectionBadgeProps {
  status: InspectionOverallStatus;
}

export function InspectionBadge({ status }: InspectionBadgeProps) {
  const Colors = useColors();
  const label = (status || 'satisfactory').toUpperCase() as keyof typeof Colors.inspection;
  const colors = Colors.inspection[label] ?? Colors.inspection.SATISFACTORY;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>
        {(status || 'PENDING').toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
