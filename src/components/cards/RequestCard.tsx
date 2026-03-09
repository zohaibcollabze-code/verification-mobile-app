/**
 * MPVP — Request Card Component
 * Premium-styled card for displaying a single request with
 * user info, status badge, and approve/reject action buttons.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/constants/colors';
import type { RequestModel } from '@/services/api/types/requestTypes';
import { approveRequest, rejectRequest } from '@/services/api/services/requestsService';
import { ApiError } from '@/utils/exceptions';

// ─── Props ────────────────────────────────────────────────

interface RequestCardProps {
    request: RequestModel;
    onUpdate: (updated: RequestModel) => void;
}

// ─── Avatar Component ─────────────────────────────────────

function UserAvatar({ url, name }: { url: string | null; name: string }) {
    const Colors = useColors();

    const initials = useMemo(() => {
        const parts = (name || '').trim().split(/\s+/);
        const first = parts[0]?.[0] ?? '';
        const second = parts[1]?.[0] ?? '';
        return (first + second).toUpperCase() || '?';
    }, [name]);

    // Generate a stable color from the name
    const bgColor = useMemo(() => {
        const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#DC2626', '#059669', '#D97706', '#0891B2'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    }, [name]);

    if (url) {
        return (
            <Image
                source={{ uri: url }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
            />
        );
    }

    return (
        <View style={[styles.avatar, { backgroundColor: bgColor }]}>
            <Text style={styles.initialsText}>{initials}</Text>
        </View>
    );
}

// ─── Status Badge ─────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const config = useMemo(() => {
        switch (status) {
            case 'approved':
                return { label: 'Approved', bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' };
            case 'rejected':
                return { label: 'Rejected', bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444' };
            case 'pending_reassignment':
                return { label: 'Reassigning', bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6' };
            case 'in_progress':
                return { label: 'In Progress', bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6' };
            case 'pending':
            default:
                return { label: 'Pending', bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B' };
        }
    }, [status]);

    return (
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.text }]}>{config.label}</Text>
        </View>
    );
}

// ─── Request Card ─────────────────────────────────────────

export function RequestCard({ request, onUpdate }: RequestCardProps) {
    const Colors = useColors();

    const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Derived actionable state
    const canShowApprove = request.canApprove && request.status === 'pending';
    const canShowReject = request.canReject && request.status === 'pending';
    const hasActions = canShowApprove || canShowReject;

    // Format date
    const { dateLabel, formattedDate } = useMemo(() => {
        const dateSource = request.dueDate ?? request.createdAt;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        try {
            const text = `${dateSource.getDate()} ${months[dateSource.getMonth()]} ${dateSource.getFullYear()}`;
            return {
                dateLabel: request.dueDate ? 'Due by' : 'Created on',
                formattedDate: text,
            };
        } catch {
            return {
                dateLabel: request.dueDate ? 'Due by' : 'Created on',
                formattedDate: '—',
            };
        }
    }, [request.dueDate, request.createdAt]);

    // Approve handler
    const handleApprove = useCallback(async () => {
        if (!canShowApprove || actionLoading) return;

        setActionLoading('approve');
        setErrorMessage(null);

        try {
            const updated = await approveRequest(request.id);
            onUpdate(updated);
        } catch (err: any) {
            if (err instanceof ApiError) {
                setErrorMessage(err.message);
            } else {
                setErrorMessage(err?.message || 'Failed to approve request. Please try again.');
            }
        } finally {
            setActionLoading(null);
        }
    }, [request.id, canShowApprove, actionLoading, onUpdate]);

    // Reject handler
    const handleReject = useCallback(async () => {
        if (!canShowReject || actionLoading) return;

        setActionLoading('reject');
        setErrorMessage(null);

        try {
            const updated = await rejectRequest(request.id, 'Rejected by user');
            onUpdate(updated);
        } catch (err: any) {
            if (err instanceof ApiError) {
                setErrorMessage(err.message);
            } else {
                setErrorMessage(err?.message || 'Failed to reject request. Please try again.');
            }
        } finally {
            setActionLoading(null);
        }
    }, [request.id, canShowReject, actionLoading, onUpdate]);

    return (
        <View style={[styles.card, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault }]}>
            {/* User Info Row */}
            <View style={styles.userRow}>
                <UserAvatar url={request.avatarUrl} name={request.userName} />
                <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: Colors.textPrimary }]} numberOfLines={1}>
                        {request.userName}
                    </Text>
                    <Text style={[styles.userEmail, { color: Colors.textMuted }]} numberOfLines={1}>
                        {request.userEmail}
                    </Text>
                </View>
                <StatusBadge status={request.status} />
            </View>

            {/* Request Details */}
            <View style={styles.titleRow}>
                <Text style={[styles.requestTitle, { color: Colors.textPrimary }]} numberOfLines={1}>
                    {request.clientName}
                </Text>
                <Text style={[styles.refTag, { color: Colors.primary }]}>#{request.referenceNumber}</Text>
            </View>
            <Text style={[styles.contractText, { color: Colors.textSecondary }]}>
                {request.contractType?.name || 'Standard Verification'}
            </Text>

            {request.description ? (
                <Text style={[styles.description, { color: Colors.textSecondary }]} numberOfLines={3}>
                    {request.description}
                </Text>
            ) : null}

            <Text style={[styles.dateText, { color: Colors.textMuted }]}>
                {dateLabel}: {formattedDate}
            </Text>

            {/* Error Message */}
            {errorMessage ? (
                <View style={[styles.errorContainer, { backgroundColor: Colors.dangerSoft }]}>
                    <Text style={[styles.errorText, { color: Colors.danger }]}>{errorMessage}</Text>
                </View>
            ) : null}

            {/* Action Buttons */}
            {hasActions ? (
                <View style={styles.actionsRow}>
                    {canShowReject ? (
                        <Pressable
                            onPress={handleReject}
                            disabled={actionLoading !== null}
                            style={({ pressed }) => [
                                styles.actionBtn,
                                styles.rejectBtn,
                                { borderColor: Colors.danger },
                                pressed && styles.btnPressed,
                                actionLoading !== null && styles.btnDisabled,
                            ]}
                        >
                            {actionLoading === 'reject' ? (
                                <ActivityIndicator size="small" color={Colors.danger} />
                            ) : (
                                <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Reject</Text>
                            )}
                        </Pressable>
                    ) : null}

                    {canShowApprove ? (
                        <Pressable
                            onPress={handleApprove}
                            disabled={actionLoading !== null}
                            style={({ pressed }) => [
                                styles.actionBtn,
                                styles.approveBtn,
                                { backgroundColor: Colors.primary },
                                pressed && styles.btnPressed,
                                actionLoading !== null && styles.btnDisabled,
                            ]}
                        >
                            {actionLoading === 'approve' ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Accept</Text>
                            )}
                        </Pressable>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    initialsText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    userName: {
        fontSize: 15,
        fontWeight: '700',
    },
    userEmail: {
        fontSize: 12,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    requestTitle: {
        fontSize: 17,
        fontWeight: '700',
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    refTag: {
        fontSize: 12,
        fontWeight: '800',
        marginLeft: 8,
    },
    contractText: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    description: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 8,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
    },
    errorContainer: {
        marginTop: 12,
        padding: 12,
        borderRadius: 10,
    },
    errorText: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    actionBtn: {
        flex: 1,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectBtn: {
        borderWidth: 1.5,
        backgroundColor: 'transparent',
    },
    approveBtn: {},
    actionBtnText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    btnPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    btnDisabled: {
        opacity: 0.5,
    },
});
