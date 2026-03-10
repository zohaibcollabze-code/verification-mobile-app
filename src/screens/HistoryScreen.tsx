/**
 * PAVMP — History Screen (Dynamic Theme)
 * Shows completed/submitted assignments with search and scrollable filter chips.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useColors } from '@/constants/colors';
import { AssignmentCard } from '@/components/cards/AssignmentCard';
import { useJobs } from '@/hooks/useJobs';
import type { AssignmentStatus } from '@/types/api.types';

type HistoryFilter = 'ALL' | 'assigned' | 'in_progress' | 'submitted' ;

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'submitted', label: 'Submitted' },
];

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GeometricIcon } from '@/components/ui/GeometricIcon';

export function HistoryScreen() {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<HistoryFilter>('ALL');
  const [searchText, setSearchText] = useState('');
  const navigation = useNavigation<any>();

  const { jobs, loading, fetchJobs } = useJobs();

  useFocusEffect(
    useCallback(() => {
      fetchJobs({ page: 1, limit: 100 });
    }, [fetchJobs])
  );

  const filtered = useMemo(() => {
    let results = jobs || [];
    // Show all jobs in History unless specifically filtered
    const validStatuses = ['assigned', 'in_progress', 'submitted','returned', 'cancelled'];
    results = results.filter(a => validStatuses.includes(a.status));

    if (filter !== 'ALL') {
      results = results.filter((a) => a.status === filter);
    }
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      results = results.filter(
        (a) =>
          a.clientName?.toLowerCase().includes(query) ||
          a.referenceNumber?.toLowerCase().includes(query),
      );
    }
    return results;
  }, [filter, searchText, jobs]);

  const handleCardPress = useCallback(
    (id: string) => {
      navigation.navigate('AssignmentDetail', { requestId: id });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.bgScreen }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors.textPrimary }]}>History</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchWrapper, { backgroundColor: Colors.bgInput, borderColor: Colors.borderDefault }]}>
          <View style={styles.searchIcon}>
            <GeometricIcon type="Search" size={18} color={Colors.textMuted} />
          </View>
          <TextInput
            style={[styles.searchInput, { color: Colors.textPrimary }]}
            placeholder="Search past assignments..."
            placeholderTextColor={Colors.textPlaceholder}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Horizontal Scrollable Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
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

      {/* List */}
      <FlatList
        data={filtered}
        renderItem={({ item }) => (
          <AssignmentCard assignment={item as any} onPress={handleCardPress} />
        )}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={[styles.listContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <GeometricIcon type="Clock" size={48} color={Colors.textMuted} />
            <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>No matching history found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56, // Standard 56px height
    borderWidth: 1.5,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterContainer: {
    marginBottom: 24,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24, // Matches 24px cards
    borderWidth: 1.5,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyView: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
