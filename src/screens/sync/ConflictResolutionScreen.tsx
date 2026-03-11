import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useColors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { GeometricIcon } from '@/components/ui/GeometricIcon';
import * as InspectionsDB from '@/services/db/inspections';
import { runSync } from '@/services/sync/syncEngine';

export function ConflictResolutionScreen() {
  const colors = useColors();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const inspectionLocalId = route.params?.inspectionLocalId;

  const [inspection, setInspection] = useState<any>(null);
  const [serverData, setServerData] = useState<any>(null);

  useEffect(() => {
    if (inspectionLocalId) {
      const record = InspectionsDB.getByLocalId(inspectionLocalId);
      setInspection(record);
    }
  }, [inspectionLocalId]);

  const handleKeepLocal = () => {
    Alert.alert(
      'Keep Local Version',
      'This will overwrite the server version with your local changes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Overwrite Server',
          style: 'destructive',
          onPress: async () => {
            if (inspection) {
              InspectionsDB.updateStatus(inspection.localId, inspection.status, 'pending_upload');
              await runSync();
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const handleKeepServer = () => {
    Alert.alert(
      'Keep Server Version',
      'This will discard your local changes and use the server version.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard Local',
          style: 'destructive',
          onPress: () => {
            if (inspection) {
              InspectionsDB.markServerDeleted(inspection.localId);
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  if (!inspection) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgScreen }]}>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>Conflict not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderDefault }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={15}>
          <GeometricIcon type="Back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Sync Conflict</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.warningCard, { backgroundColor: colors.bgCard, borderColor: colors.warning }]}>
          <Text style={[styles.warningIcon, { color: colors.warning }]}>⚠️</Text>
          <Text style={[styles.warningText, { color: colors.textPrimary }]}>
            This inspection has conflicting changes on the server. Choose which version to keep.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>LOCAL VERSION</Text>
        <View style={[styles.dataCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <Text style={[styles.dataLabel, { color: colors.textMuted }]}>Assignment ID</Text>
          <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{inspection.assignmentId}</Text>
          <Text style={[styles.dataLabel, { color: colors.textMuted }]}>Status</Text>
          <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{inspection.status}</Text>
          <Text style={[styles.dataLabel, { color: colors.textMuted }]}>Last Updated</Text>
          <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{new Date(inspection.updatedAt).toLocaleString()}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SERVER VERSION</Text>
        <View style={[styles.dataCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <Text style={[styles.dataValue, { color: colors.textMuted }]}>Server data unavailable in offline mode</Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Keep Local Version"
            onPress={handleKeepLocal}
            variant="primary"
            style={styles.actionButton}
          />
          <Button
            title="Keep Server Version"
            onPress={handleKeepServer}
            variant="outline"
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  warningCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 32,
    gap: 12,
  },
  warningIcon: {
    fontSize: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  dataCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 24,
    gap: 12,
  },
  dataLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  actions: {
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    width: '100%',
  },
});
