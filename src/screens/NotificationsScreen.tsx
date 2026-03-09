/**
 * PAVMP — Notifications Screen (Dynamic Theme)
 * Matches Screenshot 5 design.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, SectionList, Pressable, StyleSheet, ScrollView, GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '@/constants/colors';
import { useNotificationStore } from '@/stores/notificationStore';
import { useThemeStore } from '@/stores/themeStore';
import { GeometricIcon, IconType } from '@/components/ui/GeometricIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/hooks/useNotifications';
import { formatRelativeTime } from '@/utils/formatters';

type NotifCategory = 'ALL' | 'UNREAD' | 'SYSTEM' | 'PROJECTS';

const CATEGORIES: { key: NotifCategory; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'UNREAD', label: 'Unread' },
  { key: 'SYSTEM', label: 'System' },
  { key: 'PROJECTS', label: 'Projects' },
];

export function NotificationsScreen() {
  const Colors = useColors();
  const [activeCategory, setActiveCategory] = useState<NotifCategory>('ALL');
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const { themeMode, toggleTheme } = useThemeStore();

  const {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllRead
  } = useNotifications();

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Filter logic
  const filteredSections = useMemo(() => {
    const data = (notifications || []).map(n => ({
      id: n.id,
      title: n.title,
      body: n.body,
      read: n.read,
      time: n.created_at,
      type: n.type,
      assignment_id: n.assignment_id || null,
      assignment_ref: n.assignment_ref || null
    }));

    return [
      { title: 'NOTIFICATION STREAM', data }
    ].map(section => ({
      ...section,
      data: section.data.filter(item => {
        if (activeCategory === 'ALL') return true;
        if (activeCategory === 'UNREAD') return !item.read;
        if (activeCategory === 'SYSTEM') return item.type === 'SYSTEM_ALERT' || item.type === 'SYSTEM';
        if (activeCategory === 'PROJECTS') return item.type === 'PROJECTS' || item.type === 'APPROVAL';
        return true;
      })
    })).filter(section => section.data.length > 0);
  }, [activeCategory, notifications]);

  const getIcon = (type: string): { type: IconType; bg: string; color: string } => {
    switch (type) {
      case 'SYSTEM_ALERT': return { type: 'Alert', bg: 'rgba(239,68,68,0.1)', color: Colors.danger };
      case 'APPROVAL': return { type: 'Document', bg: 'rgba(37,99,235,0.1)', color: Colors.primary };
      case 'SUCCESS': return { type: 'Check', bg: 'rgba(16,185,129,0.1)', color: Colors.success };
      case 'PROJECTS': return { type: 'Briefcase', bg: 'rgba(37,99,235,0.1)', color: Colors.primary };
      case 'SYSTEM': return { type: 'Settings', bg: 'rgba(139,92,246,0.1)', color: '#A78BFA' };
      default: return { type: 'Bell', bg: 'rgba(71,85,105,0.1)', color: Colors.textMuted };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.bgScreen }]}>
      <View style={[styles.header, { borderBottomColor: Colors.borderDefault }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={15} style={styles.backBtnWrapper}>
            <GeometricIcon type="Back" size={28} color={Colors.textPrimary} />
          </Pressable>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>Notifications</Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable onPress={() => markAllRead()} hitSlop={15}>
            <Text style={[styles.markAll, { color: Colors.primary }]}>Mark all read</Text>
          </Pressable>
          <Pressable onPress={toggleTheme} style={styles.themeToggle} hitSlop={10}>
            <GeometricIcon type={themeMode === 'dark' ? 'Sun' : 'Moon'} size={18} color={Colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Categories Filter Bar */}
      <View style={[styles.catContainer, { borderBottomColor: Colors.borderDefault }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat.key}
              onPress={() => setActiveCategory(cat.key)}
              style={styles.catChip}
            >
              <Text style={[
                styles.catText,
                { color: Colors.textMuted },
                activeCategory === cat.key && { color: Colors.primary }
              ]}>
                {cat.label}
              </Text>
              {activeCategory === cat.key && <View style={[styles.activeIndicator, { backgroundColor: Colors.primary }]} />}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <SectionList
        sections={filteredSections}
        keyExtractor={(item: any) => item.id}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>{title}</Text>
        )}
        renderItem={({ item }: { item: any }) => {
          const icon = getIcon(item.type);
          return (
            <Pressable
              onPress={() => {
                markAsRead(item.id);
                if (item.assignment_id) {
                  // Robust navigation: Try parent (RootStack) or self
                  const nav = navigation.getParent() || navigation;
                  nav.navigate('AssignmentDetail', { requestId: item.assignment_id });
                }
              }}
              style={[
                styles.notifItem,
                { borderBottomColor: Colors.borderDefault },
                !item.read && { backgroundColor: themeMode === 'dark' ? 'rgba(37,99,235,0.05)' : 'rgba(37,99,235,0.03)' }
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: icon.bg }]}>
                <GeometricIcon type={icon.type} size={22} color={icon.color} />
              </View>

              <View style={styles.content}>
                <View style={styles.titleRow}>
                  <Text style={[styles.notifTitle, { color: Colors.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.notifTime, { color: Colors.textMuted }]}>
                    {item.time ? formatRelativeTime(item.time) : 'NOW'}
                  </Text>
                </View>
                <Text
                  style={[styles.notifBody, { color: Colors.textSecondary }]}
                >
                  {item.body || 'New operational update received.'}
                </Text>

                {item.assignment_ref && (
                  <View style={[styles.refBadge, { backgroundColor: Colors.bgInput, borderColor: Colors.borderDefault }]}>
                    <GeometricIcon type="Document" size={10} color={Colors.primary} />
                    <Text style={[styles.refText, { color: Colors.primary }]}>REF: {item.assignment_ref}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: Colors.textMuted }]}>No notifications in this category.</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtnWrapper: {
    padding: 4,
    marginLeft: -4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  markAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeToggle: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(150,150,150,0.1)',
  },
  catContainer: {
    borderBottomWidth: 1.5,
    marginBottom: 0,
  },
  catScroll: {
    paddingHorizontal: 24,
    gap: 24,
  },
  catChip: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  catText: {
    fontSize: 15,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 24,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingBottom: 40,
  },
  notifItem: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1.5,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifTime: {
    fontSize: 12,
  },
  nowPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  notifBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  refBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 6,
    gap: 6,
  },
  refText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  empty: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  }
});
