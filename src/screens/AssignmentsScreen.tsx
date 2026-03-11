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
  const { jobs, loading: jobsLoading, fetchJobs } = useJobs();
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
    }, [fetchJobs])
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
    setRefreshing(false);
  }, [fetchJobs]);

  const handleCardPress = useCallback(
    (id: string) => {
      navigation.navigate('AssignmentDetail', { requestId: id });
    },
    [navigation],
  );

  const handleSyncPress = useCallback(() => {
    runSync()
      .then(() => toast.showToast('info', 'Sync started'))
      .catch((err) => {
        console.warn('[Assignments] manual sync failed', err);
        toast.showToast('error', 'Failed to start sync');
      });
  }, [toast]);

  const handleConflictPress = useCallback((localId?: string) => {
    if (!localId) return;
    navigation.navigate('ConflictResolution', { inspectionLocalId: localId });
  }, [navigation]);

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
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.bgScreen }]}>
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
        <View style={[styles.searchWrapper, { backgroundColor: Colors.bgInput, borderColor: Colors.borderDefault }]}>
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

      <FlatList
        data={filteredAssignments}
        renderItem={({ item }) => {
          const syncMeta = assignmentSyncMap.get(item.id) ?? { status: 'none' };
          return (
            <AssignmentCard
              assignment={item as any}
              onPress={handleCardPress}
              syncStatus={syncMeta.status}
              onSyncPress={syncMeta.status === 'pending' ? handleSyncPress : undefined}
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
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1.5,
  },
  searchIcon: { fontSize: 16, marginRight: 12 },
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
});
