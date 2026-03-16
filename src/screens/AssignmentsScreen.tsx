import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, TextInput, Pressable, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/constants/colors';
import { AssignmentCard } from '@/components/cards/AssignmentCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { GeometricIcon } from '@/components/ui/GeometricIcon';
import { useJobs } from '@/hooks/useJobs';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/Toast';
import { useNetworkStore } from '@/stores/networkStore';
import * as InspectionsDB from '@/services/db/inspections';
import * as SyncQueueDB from '@/services/db/syncQueue';
import { runSync } from '@/services/sync/syncEngine';
import type { RequestStatus } from '@/services/api/types/requestTypes';
import { LinearGradient } from 'expo-linear-gradient';

type FilterOption = 'ALL' | 'assigned' | 'in_progress' | 'submitted' | 'returned';

const FILTERS: { key: FilterOption; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'returned', label: 'Returned' },
];

export function AssignmentsScreen() {
  const Colors = useColors();
  const { themeMode } = useThemeStore();
  const { jobs, loading: jobsLoading, fetchJobs, stats, fetchInspectorStats } = useJobs();
  const toast = useToast();
  const globalSyncStatus = useNetworkStore((s) => s.syncStatus);

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterOption>('ALL');
  const [searchText, setSearchText] = useState('');

  const { user } = useAuthStore();
  const initials = useMemo(() => {
    if (user?.profile_initials) return user.profile_initials.toUpperCase();
    if (!user?.full_name) return '??';
    const parts = user.full_name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }, [user?.full_name, user?.profile_initials]);

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      fetchJobs({ page: 1, limit: 100 });
      fetchInspectorStats();
    }, [fetchJobs, fetchInspectorStats])
  );

  const filteredAssignments = useMemo(() => {
    let results = (jobs || []).filter((a) => a.status !== 'published');
    if (filter !== 'ALL') {
      results = results.filter((a) => a.status === filter);
    }
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      results = results.filter(
        (a) =>
          a.clientName?.toLowerCase().includes(query) ||
          a.referenceNumber?.toLowerCase().includes(query) ||
          a.branchName?.toLowerCase().includes(query),
      );
    }
    return results;
  }, [filter, searchText, jobs]);

  const assignmentSyncMap = useMemo(() => {
    const map = new Map<string, { status: 'none' | 'pending' | 'syncing' | 'conflict'; localId?: string }>();
    filteredAssignments.forEach((assignment) => {
      const inspection = InspectionsDB.getByAssignmentId(assignment.id);
      let status: 'none' | 'pending' | 'syncing' | 'conflict' = 'none';
      if (inspection) {
        if (inspection.syncStatus === 'conflict') {
          status = 'conflict';
        } else {
          const queued = SyncQueueDB.isInspectionQueued(inspection.localId) || inspection.syncStatus === 'pending_upload';
          if (queued && globalSyncStatus === 'syncing') {
            status = 'syncing';
          } else if (queued) {
            status = 'pending';
          }
        }
        map.set(assignment.id, { status, localId: inspection.localId });
      } else {
        const pendingCount = SyncQueueDB.getPendingCountByAssignment(assignment.id);
        if (pendingCount > 0) {
          status = globalSyncStatus === 'syncing' ? 'syncing' : 'pending';
        }
        map.set(assignment.id, { status });
      }
    });
    return map;
  }, [filteredAssignments, globalSyncStatus]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobs({ page: 1, limit: 100 });
    await fetchInspectorStats();
    setRefreshing(false);
  }, [fetchJobs, fetchInspectorStats]);

  const handleCardPress = useCallback(
    (id: string) => {
      navigation.navigate('AssignmentDetail', { requestId: id });
    },
    [navigation],
  );


  const handleConflictPress = useCallback((localId?: string) => {
    if (!localId) return;
    navigation.navigate('ConflictResolution', { inspectionLocalId: localId });
  }, [navigation]);

  const derivedStats = useMemo(() => {
    if (stats) {
      const total = stats.totalAssignments ?? stats.totalRequests ?? 0;
      const inProgress = stats.inProgressAssignments ?? stats.assignedRequests ?? 0;
      const completed = stats.completedAssignments ?? stats.publishedRequests ?? 0;
      const pending = stats.pendingReviews ?? stats.returnedRequests ?? 0;
      const published = stats.publishedAssignments ?? stats.publishedRequests ?? 0;
      const returned = stats.returnedAssignments ?? stats.returnedRequests ?? 0;
      const submitted = stats.submittedAssignments ?? stats.assignedRequests ?? 0;

      return {
        total,
        inProgress,
        completed,
        pending,
        published,
        returned,
        submitted,
        slaRate: typeof stats.slaHitRate === 'number' ? stats.slaHitRate : null,
        averageHours: typeof stats.averageTurnaroundHours === 'number' ? stats.averageTurnaroundHours : null,
      };
    }

    const localCompleted = filteredAssignments.filter((a) => a.status === 'submitted').length;
    const localPending = filteredAssignments.filter((a) => a.status === 'returned').length;
    const localInProgress = filteredAssignments.filter((a) => a.status === 'in_progress').length;

    return {
      total: filteredAssignments.length,
      inProgress: localInProgress,
      completed: localCompleted,
      pending: localPending,
      published: 0,
      returned: localPending,
      submitted: localCompleted,
      slaRate: null,
      averageHours: null,
    };
  }, [stats, filteredAssignments]);

  const renderStatsCard = () => {
    if (!stats) {
      return (
        <View style={[styles.statsCardSkeleton, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault }]}> 
          <Skeleton height={16} width={120} />
          <View style={styles.statsSkeletonRow}>
            <Skeleton height={40} width={80} />
            <Skeleton height={40} width={80} />
            <Skeleton height={40} width={80} />
          </View>
        </View>
      );
    }

    const donutSegments = [
      { label: 'Pending Review', value: derivedStats.pending, color: '#F76E64', highlight: true },
      { label: 'In Progress', value: derivedStats.inProgress, color: '#8B7CFF' },
      { label: 'Completed', value: derivedStats.completed, color: '#5DD5A1' },
    ];

    const totalForPercent = Math.max(derivedStats.total, 1);
    const gradientColors: [string, string] = themeMode === 'dark'
      ? ['#1C1B2E', '#11101E']
      : ['#FFFFFF', '#F6F5FF'];
    const donutTheme = themeMode === 'dark'
      ? {
          trackBorder: 'rgba(148, 163, 184, 0.25)',
          trackBg: 'rgba(12, 15, 30, 0.85)',
          centerBg: Colors.bgCard,
          centerBorder: 'rgba(148, 163, 184, 0.35)',
          centerShadow: 'rgba(5, 8, 16, 0.9)',
        }
      : {
          trackBorder: 'rgba(15, 23, 42, 0.08)',
          trackBg: 'rgba(241, 245, 249, 0.9)',
          centerBg: Colors.white,
          centerBorder: 'rgba(15, 23, 42, 0.08)',
          centerShadow: 'rgba(15, 23, 42, 0.12)',
        };

    let currentRotation = -90; // start at top
    const donutSlices = donutSegments.map((segment) => {
      const percent = segment.value / totalForPercent;
      const sweep = percent * 360;
      const slice = { ...segment, sweep, start: currentRotation };
      currentRotation += sweep;
      return slice;
    });

    const pendingSegment = donutSegments[0];

    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.statsCard, themeMode === 'dark' && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }]}
      >
        <View style={styles.statsCardHeader}>
          <View>
            <Text style={[styles.statsTitle, { color: Colors.textPrimary }]}>Inspection Radar</Text>
          </View>
        </View>


        <View style={styles.donutRow}>
          <View style={styles.donutWrapper}>
            <View style={[styles.donutBase, { borderColor: donutTheme.trackBorder, backgroundColor: donutTheme.trackBg }]}>
              {donutSlices.map((slice) => (
                <View key={slice.label} style={[styles.donutSliceWrapper, { transform: [{ rotate: `${slice.start}deg` }] }]}> 
                  <View
                    style={[
                      styles.donutSlice,
                      {
                        borderColor: slice.color,
                        borderTopWidth: slice.sweep > 0 ? 14 : 0,
                        transform: [{ rotate: `${slice.sweep}deg` }],
                      },
                    ]}
                  />
                </View>
              ))}
              <View
                style={[
                  styles.donutCenter,
                  {
                    backgroundColor: donutTheme.centerBg,
                    borderColor: donutTheme.centerBorder,
                    shadowColor: donutTheme.centerShadow,
                  },
                ]}
              >
                <Text style={[styles.donutValue, { color: Colors.textPrimary }]}>{derivedStats.total}</Text>
                <Text style={[styles.donutLabel, { color: Colors.textMuted }]}>Total</Text>
              </View>
            </View>
          </View>
          <View style={styles.donutLegend}>
            {donutSegments.map((segment) => (
              <View key={segment.label} style={styles.legendRow}>
                <View style={[styles.legendBadge, { backgroundColor: segment.color }]} />
                <View style={styles.legendTextBlock}>
                  <Text style={[styles.legendLabel, { color: Colors.textPrimary }]}>{segment.label}</Text>
                  <Text style={[styles.legendValue, { color: Colors.textSecondary }]}>
                    {segment.value} • {Math.round((segment.value / totalForPercent) * 100) || 0}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    );
  };

  const ListHeaderComponent = useCallback(() => (
    <View>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: Colors.textPrimary }]}>Assignments</Text>
          <Text style={[styles.headerSubtitle, { color: Colors.textMuted }]}>
            {filteredAssignments.length} active verifications
          </Text>
        </View>
        <Pressable
          style={[styles.profileBtn, { backgroundColor: Colors.bgInput, borderColor: Colors.borderDefault }]}
          onPress={() => navigation.navigate('Profile')}
        >
          {user?.profile_image ? (
            <Image source={{ uri: user.profile_image }} style={{ width: '100%', height: '100%', borderRadius: 22 }} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={[styles.avatarText, { color: Colors.primary }]}>{initials}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.controlsSection}>
        <View style={[styles.searchWrapper, { backgroundColor: Colors.bgInput, borderColor: Colors.borderDefault }] }>
          <View style={styles.searchIcon}>
            <GeometricIcon type="Search" size={18} color={Colors.textMuted} />
          </View>
          <TextInput
            style={[styles.searchInput, { color: Colors.textPrimary }]}
            placeholder="Search assignments..."
            placeholderTextColor={Colors.textPlaceholder}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
          style={styles.filterScrollWrapper}
        >
          {FILTERS.map((f) => {
            const isActive = f.key === filter;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.filterChip,
                  { backgroundColor: Colors.bgInput, borderColor: Colors.borderDefault },
                  isActive && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                ]}
              >
                <Text style={[
                  styles.filterText,
                  { color: Colors.textSecondary },
                  isActive && { color: '#FFFFFF' }
                ]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.statsCardWrapper}>{renderStatsCard()}</View>
    </View>
  ), [Colors.bgInput, Colors.borderDefault, Colors.primary, Colors.textMuted, Colors.textPlaceholder, Colors.textPrimary, Colors.textSecondary, filter, filteredAssignments.length, initials, navigation, renderStatsCard, searchText, user?.profile_image]);

  if (jobsLoading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.bgScreen }]}>
        <View style={styles.header}>
          <Skeleton width={150} height={30} />
        </View>
        <View style={styles.controlsSection}>
          <Skeleton height={52} borderRadius={14} />
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <Skeleton height={140} borderRadius={20} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.bgScreen }] }>
      <FlatList
        data={filteredAssignments}
        ListHeaderComponent={ListHeaderComponent}
        renderItem={({ item }) => {
          const syncMeta = assignmentSyncMap.get(item.id) ?? { status: 'none' };
          return (
            <AssignmentCard
              assignment={item as any}
              onPress={handleCardPress}
              syncStatus={syncMeta.status}
              onConflictPress={syncMeta.status === 'conflict' ? () => handleConflictPress(syncMeta.localId) : undefined}
            />
          );
        }}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '800' },
  headerSubtitle: { fontSize: 13, marginTop: 2, fontWeight: '600' },
  profileBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  controlsSection: {
    // backgroundColor: 'red',
    paddingHorizontal: 4,
    marginHorizontal: -12,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1.5,
    width: '100%',
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 15 },
  filterScrollWrapper: {
    marginTop: 4,
  },
  filterScroll: {
    paddingHorizontal: 24,
    gap: 12,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  filterText: { fontSize: 14, fontWeight: '600' },
  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
  skeletonCard: { marginBottom: 16 },
  statsCardWrapper: {
    // paddingHorizontal: 24,
    paddingBottom: 8,
  },
  statsCard: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  statsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingFlag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'flex-start',
  },
  pendingFlagLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  pendingFlagValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  // Fix 5: Independent status badges
  statusBadgesCol: {
    gap: 10,
    marginTop: 12,
  },
  radarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
  },
  radarBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  radarBadgeLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  radarBadgeCount: {
    fontSize: 16,
    fontWeight: '800',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  statsSubtitle: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 20,
  },
  donutWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutBase: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 16,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  donutSliceWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutSlice: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 70,
    borderWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  donutCenter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  donutValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  donutLabel: {
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  donutLegend: {
    flex: 1,
    gap: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  legendTextBlock: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsCardSkeleton: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    gap: 20,
  },
  statsSkeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
