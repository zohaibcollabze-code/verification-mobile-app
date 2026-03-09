/**
 * PAVMP — Requests List Screen
 * Displays a paginated list of requests with pull-to-refresh,
 * infinite scroll, and in-place updates after actions.
 */
import React, { useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    Pressable,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/constants/colors';
import { useRequests } from '@/hooks/useRequests';
import { RequestCard } from '@/components/cards/RequestCard';
import type { RequestModel } from '@/services/api/types/requestTypes';

export function RequestsScreen() {
    const Colors = useColors();
    const { data, loading, error, refresh, loadMore, updateItem } = useRequests();

    const visibleItems = data ? data.items.filter(item => item.status?.toLowerCase() !== 'published') : [];
    const hasData = visibleItems.length > 0;
    const isInitialLoad = loading && !data;
    const isEmptyResult = !loading && data && visibleItems.length === 0;
    const isErrorNoData = error && !data;

    // ─── Render item ────────────────────────────────────────

    const renderItem = useCallback(({ item }: { item: RequestModel }) => {
        return <RequestCard request={item} onUpdate={updateItem} />;
    }, [updateItem]);

    const keyExtractor = useCallback((item: RequestModel) => item.id, []);

    // ─── Header: total count ────────────────────────────────

    const ListHeader = useCallback(() => {
        if (!data) return null;
        
        const approvedCount = visibleItems.filter(item => item.status?.toLowerCase() === 'accepted').length;
        const declinedCount = visibleItems.filter(item => item.status?.toLowerCase() === 'rejected').length;
        
        return (
            <>
                <View style={styles.listHeader}>
                    <Text style={[styles.headerTitle, { color: Colors.textPrimary }]}>Requests</Text>
                    <View style={[styles.countBadge, { backgroundColor: Colors.primaryGlow }]}>
                        <Text style={[styles.countText, { color: Colors.primary }]}>
                            {visibleItems.length}
                        </Text>
                    </View>
                </View>
                
                <View style={styles.statsContainer}>
                    <View style={[styles.statCard, {
                        backgroundColor: Colors.successSoft,
                        borderColor: Colors.success,
                    }]}
                    >
                        <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16,185,129,0.25)' }] }>
                            <Text style={styles.statIcon}>✅</Text>
                        </View>
                        <View style={styles.statContent}>
                            <Text style={[styles.statLabel, { color: Colors.success }]}>Approved</Text>
                            <Text style={[styles.statValue, { color: Colors.textPrimary }]}>{approvedCount}</Text>
                        </View>
                    </View>
                    
                    <View style={[styles.statCard, {
                        backgroundColor: Colors.dangerSoft,
                        borderColor: Colors.danger,
                    }]}>
                        <View style={[styles.statIconContainer, { backgroundColor: 'rgba(239,68,68,0.25)' }]}>
                            <Text style={styles.statIcon}>❌</Text>
                        </View>
                        <View style={styles.statContent}>
                            <Text style={[styles.statLabel, { color: Colors.danger }]}>Declined</Text>
                            <Text style={[styles.statValue, { color: Colors.textPrimary }]}>{declinedCount}</Text>
                        </View>
                    </View>
                </View>
            </>
        );
    }, [data, Colors, visibleItems]);

    // ─── Footer: loading spinner for next page ──────────────

    const ListFooter = useCallback(() => {
        if (!hasData || !loading) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={[styles.footerText, { color: Colors.textMuted }]}>
                    Loading more...
                </Text>
            </View>
        );
    }, [hasData, loading, Colors]);

    // ─── Empty state ────────────────────────────────────────

    const ListEmpty = useCallback(() => {
        if (loading) return null;
        return (
            <View style={styles.emptyContainer}>
                <Text style={[styles.emptyIcon]}>📋</Text>
                <Text style={[styles.emptyTitle, { color: Colors.textPrimary }]}>
                    No Requests Found
                </Text>
                <Text style={[styles.emptySubtitle, { color: Colors.textMuted }]}>
                    There are no requests to display at this time.
                </Text>
                <Pressable
                    onPress={refresh}
                    style={({ pressed }) => [
                        styles.retryBtn,
                        { backgroundColor: Colors.primary },
                        pressed && styles.retryPressed,
                    ]}
                >
                    <Text style={styles.retryText}>Refresh</Text>
                </Pressable>
            </View>
        );
    }, [loading, refresh, Colors]);

    // ─── Initial loading ───────────────────────────────────

    if (isInitialLoad) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: Colors.bgScreen }]}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={[styles.loadingText, { color: Colors.textMuted }]}>
                        Loading requests...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // ─── Error state (no data) ─────────────────────────────

    if (isErrorNoData) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: Colors.bgScreen }]}>
                <View style={styles.center}>
                    <View style={[styles.errorIcon, { borderColor: Colors.danger }]}>
                        <Text style={{ fontSize: 32 }}>⚠️</Text>
                    </View>
                    <Text style={[styles.errorTitle, { color: Colors.textPrimary }]}>
                        Failed to Load
                    </Text>
                    <Text style={[styles.errorMessage, { color: Colors.textMuted }]}>
                        {error.message}
                    </Text>
                    <Pressable
                        onPress={refresh}
                        style={({ pressed }) => [
                            styles.retryBtn,
                            { backgroundColor: Colors.primary },
                            pressed && styles.retryPressed,
                        ]}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // ─── Main list ─────────────────────────────────────────

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Colors.bgScreen }]} edges={['top']}>
            <FlatList
                data={visibleItems}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={ListHeader}
                ListFooterComponent={ListFooter}
                ListEmptyComponent={ListEmpty}
                onEndReached={loadMore}
                onEndReachedThreshold={0.2}
                refreshControl={
                    <RefreshControl
                        refreshing={loading && !!data}
                        onRefresh={refresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 20,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    countBadge: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 10,
    },
    countText: {
        fontSize: 14,
        fontWeight: '800',
    },
    footerLoader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    footerText: {
        fontSize: 13,
        fontWeight: '600',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    errorIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
    },
    errorMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 28,
    },
    retryBtn: {
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    retryPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 80,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 28,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        gap: 12,
    },
    statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statIcon: {
        fontSize: 20,
    },
    statContent: {
        flex: 1,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
});
