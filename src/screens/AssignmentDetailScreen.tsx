/**
 * PAVMP — Assignment Detail Screen (Dynamic Theme)
 * Shows full assignment details with status-driven CTAs.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useColors } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/utils/formatters';
import type { RequestModel } from '@/services/api/types/requestTypes';
import { GeometricIcon } from '@/components/ui/GeometricIcon';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';

import { useJobs } from '@/hooks/useJobs';
import { useInspectionStore } from '@/stores/inspectionStore';
import { jobsService } from '@/services/jobs/jobsService';
import { useAuthStore } from '@/stores/authStore';
import * as AssignmentCacheDB from '@/services/db/assignments';
import * as InspectionsDB from '@/services/db/inspections';
import { useNetworkStore } from '@/stores/networkStore';

export function AssignmentDetailScreen() {
  const Colors = useColors();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const requestId = route.params?.requestId;

  const { jobDetail: assignment, loading, error, fetchJobDetail } = useJobs();
  const initDraft = useInspectionStore((s) => s.initDraft);
  const user = useAuthStore((s) => s.user);
  const isOnline = useNetworkStore((s) => s.isOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [cachedSchema, setCachedSchema] = useState<any[] | null>(null);
  const [pdfExpanded, setPdfExpanded] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ id: string; title: string; url: string } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobDetail(requestId);
    setRefreshing(false);
  }, [fetchJobDetail, requestId]);

  React.useEffect(() => {
    if (requestId) {
      fetchJobDetail(requestId);
      const cached = AssignmentCacheDB.getAssignment(requestId);
      const existingInspection = InspectionsDB.getByAssignmentId(requestId);
      const schemaSource = cached?.schemaSnapshot || existingInspection?.schemaSnapshot;
      if (schemaSource) {
        try {
          setCachedSchema(JSON.parse(schemaSource));
        } catch {
          setCachedSchema(null);
        }
      }
    }
  }, [requestId, fetchJobDetail]);

  useFocusEffect(
    useCallback(() => {
      if (requestId) {
        fetchJobDetail(requestId);
      }
    }, [requestId, fetchJobDetail])
  );

  const handleCTA = useCallback(async () => {
    if (!assignment || !user) return;
    const status = assignment.status?.toLowerCase();
    switch (status) {
      case 'pending':
      case 'new':
      case 'assigned':
        navigation.navigate('AcceptReject', { requestId: assignment.id });
        break;
      case 'returned':
        navigation.navigate('AcceptReject', { requestId: assignment.id });
        break;
      case 'in_progress':
      case 'accepted':
        try {
          const existingInspection = InspectionsDB.getByAssignmentId(assignment.id);
          let schema = cachedSchema || (existingInspection?.schemaSnapshot ? JSON.parse(existingInspection.schemaSnapshot) : null);
          if (isOnline) {
            try {
              const schemaData = await jobsService.getFindingsSchema(assignment.id);
              schema = schemaData?.findingsSchema || [];
              AssignmentCacheDB.saveSchemaSnapshot(assignment.id, JSON.stringify(schema));
              setCachedSchema(schema);
              if (existingInspection) {
                InspectionsDB.updateSchemaSnapshot(existingInspection.localId, JSON.stringify(schema));
              }
            } catch (err) {
              console.warn('[AssignmentDetail] Failed to fetch schema, using cached', err);
            }
          }
          if (!schema || schema.length === 0) {
            console.error('[AssignmentDetail] No schema available');
            return;
          }
          await initDraft(assignment.id, user.id, schema, assignment);
          navigation.navigate('InspectionForm', { requestId: assignment.id });
        } catch (err) {
          console.error('[AssignmentDetail] Failed to init draft', err);
        }
        break;
      default:
        break;
    }
  }, [assignment, user, navigation, initDraft]);

  const pdfOptions = useMemo(() => {
    if (!assignment) return [];
    const rawDocuments = ((assignment as any)?.documents ?? (assignment as any)?.pdfDocuments ?? []) as any[];
    const flattened = Array.isArray(rawDocuments) ? rawDocuments : [];
    const mappedFromArray = flattened
      .map((entry, index) => {
        if (!entry) return null;
        if (typeof entry === 'string') {
          return { id: `doc-${index}`, title: `Document ${index + 1}`, url: entry };
        }
        if (typeof entry === 'object' && entry.url) {
          return {
            id: entry.id ?? `doc-${index}`,
            title: entry.title ?? entry.label ?? `Document ${index + 1}`,
            url: entry.url,
          };
        }
        return null;
      })
      .filter(Boolean) as { id: string; title: string; url: string }[];

    if (mappedFromArray.length > 0) {
      return mappedFromArray;
    }

    const fallbackDocs: { id: string; title: string; url: string }[] = [];
    const offerLetter = assignment.writtenOfferUrl || ((assignment as any)?.offerLetterUrl ?? (assignment as any)?.fieldData?.offerLetterPdf);
    if (offerLetter) {
      fallbackDocs.push({ id: 'offer-letter', title: 'Written Offer', url: offerLetter });
    }
    const noticeOfDelivery = assignment.noticeOfDeliveryUrl || (assignment as any)?.fieldData?.noticeOfDeliveryUrl;
    if (noticeOfDelivery) {
      fallbackDocs.push({ id: 'notice-of-delivery', title: 'Notice of Delivery', url: noticeOfDelivery });
    }
    const inspectionPack = (assignment as any)?.inspectionPackUrl ?? (assignment as any)?.fieldData?.inspectionPackPdf;
    if (inspectionPack) {
      fallbackDocs.push({ id: 'inspection-pack', title: 'Inspection Checklist', url: inspectionPack });
    }
    return fallbackDocs;
  }, [assignment]);

  const ctaLabel = useMemo(() => {
    if (!assignment) return null;
    const status = assignment.status?.toLowerCase();
    switch (status) {
      case 'pending':
      case 'new':
      case 'assigned':
        return 'Review Job Offer';
      case 'accepted':
      case 'approved':
        return 'Begin Verification →';
      case 'in_progress':
        return 'Continue Verification →';
      case 'returned':
        return 'RESUBMIT VERIFICATION';
      default:
        return null;
    }
  }, [assignment]);

  const handlePreview = useCallback((doc: { id: string; title: string; url: string }) => {
    setPreviewDoc(doc);
  }, []);

  const handleDownload = useCallback(async (doc: { id: string; title: string; url: string }) => {
    try {
      setIsDownloading(true);
      const fileName = doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'document';
      const storageDir = ((FileSystem as any).documentDirectory ?? (FileSystem as any).cacheDirectory ?? '') as string;
      const fileUri = `${storageDir}${fileName}_${Date.now()}.pdf`;
      const downloadResumable = FileSystem.createDownloadResumable(doc.url, fileUri);
      await downloadResumable.downloadAsync();
      Alert.alert('Download complete', `Saved to ${fileUri}`);
    } catch (error) {
      console.warn('[AssignmentDetail] PDF download failed', error);
      Alert.alert('Download failed', 'Unable to download the document. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  }, []);

  if (!assignment) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.bgScreen }]}>
        <Text style={[styles.errorText, { color: Colors.textMuted }]}>Assignment not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.bgScreen }]}>
      {/* Header Navigation */}
      <View style={[styles.navBar, { borderBottomColor: Colors.borderDefault }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={15}>
          <GeometricIcon type="Back" size={24} color={Colors.textSecondary} />
        </Pressable>
        <Text style={[styles.navTitle, { color: Colors.textPrimary }]}>Job Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Main Entity Card */}
        <View style={[styles.entityCard, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault }]}>
          <View style={styles.statusRow}>
            <StatusBadge status={assignment.status as any} />
            <PriorityBadge priority="NORMAL" />
          </View>
          <Text style={[styles.clientLabel, { color: Colors.textMuted }]}>CLIENT IDENTITY</Text>
          <Text style={[styles.clientName, { color: Colors.textPrimary }]}>{assignment.clientName}</Text>
          <Text style={[styles.refCode, { color: Colors.primary }]}>#{assignment.referenceNumber}</Text>

          <View style={[styles.divider, { backgroundColor: Colors.borderDefault }]} />

          {/* Site Identity Grid — Fix 3 */}
          <View style={styles.siteIdentityGrid}>
            {[
              { label: 'BANK NAME', value: assignment.bankName },
              { label: 'CONTRACT NAME', value: assignment.contractType?.name || 'Standard' },
              { label: 'ASSIGNMENT', value: assignment.referenceNumber },
              { label: 'CREATED', value: formatDate(assignment.createdAt) },
              { label: 'DEADLINE', value: assignment.dueDate ? formatDate(assignment.dueDate) : '—' },
              { label: 'RETURNED', value: assignment.status?.toLowerCase() === 'returned' ? 'Yes' : '—' },
              { label: 'DEALING', value: assignment.contactPerson || '—' },
            ].map((row, index, arr) => (
              <View
                key={row.label}
                style={[
                  styles.siteIdentityRow,
                  { borderBottomColor: Colors.borderDefault },
                  index === arr.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={[styles.siteIdentityLabel, { backgroundColor: Colors.bgElevated }]}>
                  <Text style={[styles.siteIdentityLabelText, { color: Colors.textMuted }]}>{row.label}</Text>
                </View>
                <View style={styles.siteIdentityValue}>
                  <Text style={[styles.siteIdentityValueText, { color: Colors.textPrimary }]}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* PDF Documents — Fix 2: Independent Tile Cards */}
        <View style={styles.pdfTilesRow}>
          {pdfOptions.length === 0 ? (
            <View style={[styles.pdfTile, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault }]}>
              <View style={[styles.pdfBadge, { backgroundColor: Colors.primaryGlow }]}>
                <Text style={[styles.pdfBadgeText, { color: Colors.primary }]}>PDF</Text>
              </View>
              <Text style={[styles.pdfTileTitle, { color: Colors.textMuted }]}>No documents available</Text>
            </View>
          ) : (
            pdfOptions.slice(0, 2).map((doc) => (
              <Pressable key={doc.id} onPress={() => handlePreview(doc)} style={[styles.pdfTile, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault }]}>
                <View style={[styles.pdfBadge, { backgroundColor: Colors.primaryGlow }]}>
                  <Text style={[styles.pdfBadgeText, { color: Colors.primary }]}>PDF</Text>
                </View>
                <Text style={[styles.pdfTileTitle, { color: Colors.textPrimary }]} numberOfLines={2}>{doc.title}</Text>
                <Text style={[styles.pdfTileSize, { color: Colors.textMuted }]}>Document</Text>
                <View style={styles.pdfTileActions}>
                  <Pressable onPress={() => handlePreview(doc)} style={[styles.pdfTileBtn, { borderColor: Colors.primary }]}>
                    <Text style={[styles.pdfTileBtnText, { color: Colors.primary }]}>View</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDownload(doc)} style={[styles.pdfTileBtn, { borderColor: Colors.textSecondary }]}>
                    {isDownloading ? (
                      <ActivityIndicator size="small" color={Colors.textSecondary} />
                    ) : (
                      <Text style={[styles.pdfTileBtnText, { color: Colors.textSecondary }]}>↓</Text>
                    )}
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* Location & Contact — Fix 4: Wrapped in card */}
        <View style={[styles.locationCard, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault }]}>
          <View style={styles.locationCardHeader}>
            <GeometricIcon type="Location" size={18} color={Colors.primary} />
            <Text style={[styles.locationCardTitle, { color: Colors.textPrimary }]}>Location & Contact</Text>
          </View>
          <View style={styles.locationFieldsList}>
            {[
              { label: 'SITE ADDRESS', value: assignment.siteAddress },
              { label: 'SITE CITY', value: (assignment as any).siteCity || '—' },
              { label: 'CONTACT PERSON', value: assignment.contactPerson },
              { label: 'CONTACT NUMBER', value: (assignment as any).siteContactNumber || (assignment as any).contact_phone || '—' },
              { label: 'BRANCH MANAGER', value: (assignment as any).branchManagerName || '—' },
            ].map((item) => (
              <View key={item.label} style={styles.locationFieldPair}>
                <Text style={[styles.locationFieldLabel, { color: Colors.textMuted }]}>{item.label}</Text>
                <Text style={[styles.locationFieldValue, { color: Colors.textPrimary }]}>{item.value || '—'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Inspection Parameters — Fix 4: 2-column grid in card */}
        <View style={[styles.paramsCard, { backgroundColor: Colors.bgCard, borderColor: Colors.borderDefault }]}>
          <Text style={[styles.paramsCardTitle, { color: Colors.textPrimary }]}>Inspection Parameters</Text>
          <View style={styles.paramsGrid}>
            {[
              { label: 'TYPE', value: (assignment as any).inspectionType || 'Standard' },
              { label: 'SCOPE', value: (assignment as any).inspectionScope || '—' },
              { label: 'INVENTORY', value: (assignment as any).inventoryHoldingDays ? `${(assignment as any).inventoryHoldingDays} Days` : '—' },
              { label: 'PAST INSPECTIONS', value: (assignment as any).totalInspectionsToDate?.toString() || '0' },
            ].map((param) => (
              <View key={param.label} style={[styles.paramTile, { backgroundColor: Colors.bgElevated, borderColor: Colors.borderDefault }]}>
                <Text style={[styles.paramTileLabel, { color: Colors.textMuted }]}>{param.label}</Text>
                <Text style={[styles.paramTileValue, { color: Colors.textPrimary }]}>{param.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Operational Notes */}
        {assignment.opsNotes && (
          <View style={[styles.notesBox, { backgroundColor: Colors.bgInput, borderColor: Colors.borderDefault }]}>
            <Text style={[styles.notesLabel, { color: Colors.warning }]}>OPERATIONAL DIRECTIVES</Text>
            <Text style={[styles.notesText, { color: Colors.textSecondary }]}>{assignment.opsNotes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Preview Modal */}
      <Modal visible={!!previewDoc} animationType="slide" onRequestClose={() => setPreviewDoc(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bgScreen }}>
          <View style={styles.previewHeader}>
            <Pressable onPress={() => setPreviewDoc(null)} hitSlop={15}>
              <GeometricIcon type="Close" size={24} color={Colors.textPrimary} />
            </Pressable>
            <Text style={[styles.previewTitle, { color: Colors.textPrimary }]}>{previewDoc?.title}</Text>
            <View style={{ width: 24 }} />
          </View>
          {previewDoc?.url ? (
            <WebView source={{ uri: previewDoc.url }} style={{ flex: 1 }} />
          ) : (
            <View style={[styles.center, { backgroundColor: Colors.bgScreen }]}>
              <Text style={{ color: Colors.textMuted }}>Unable to load document.</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Primary CTA */}
      {ctaLabel && (
        <View style={[styles.footer, { backgroundColor: Colors.bgScreen, borderTopColor: Colors.borderDefault, paddingBottom: insets.bottom + 20 }]}>
          <Button
            title={ctaLabel}
            onPress={handleCTA}
            variant="primary"
            style={styles.ctaButton}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function DetailRow({ label, value, valueColor, multiline, color, labelColor }: any) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.value, { color }, valueColor ? { color: valueColor } : undefined]} numberOfLines={multiline ? 4 : 1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
  },
  backButton: {
    padding: 4,
  },
  navTitle: {
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
  entityCard: {
    borderRadius: 24, // Consistent 24px radius
    padding: 24,
    borderWidth: 1.5,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  clientLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  clientName: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  refCode: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  // Fix 3: Site Identity Grid
  siteIdentityGrid: {
    marginTop: 4,
  },
  siteIdentityRow: {
    flexDirection: 'row' as const,
    minHeight: 44,
    borderBottomWidth: 1,
  },
  siteIdentityLabel: {
    width: 160,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center' as const,
  },
  siteIdentityLabelText: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  siteIdentityValue: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center' as const,
  },
  siteIdentityValueText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  rejectionBox: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  rejectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
    gap: 8,
  },
  rejectionIcon: {
    fontSize: 18,
  },
  rejectionTitle: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  rejectionMsg: {
    fontSize: 14,
    fontWeight: '600' as const,
    fontStyle: 'italic' as const,
    lineHeight: 22,
    marginBottom: 8,
  },
  rejectionFooter: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
    marginBottom: 16,
    textTransform: 'uppercase' as const,
  },
  row: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  value: {
    fontSize: 14,
    fontWeight: '700' as const,
    flex: 1,
    textAlign: 'right' as const,
    marginLeft: 20,
  },
  // Fix 2: PDF Tile Cards
  pdfTilesRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 24,
  },
  pdfTile: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
    alignItems: 'center' as const,
  },
  pdfTileTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  pdfTileSize: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  pdfTileActions: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 4,
  },
  pdfTileBtn: {
    borderRadius: 10,
    borderWidth: 1.2,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  pdfTileBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  // Fix 4: Location Card
  locationCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    marginBottom: 24,
  },
  locationCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 20,
  },
  locationCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  locationFieldsList: {
    gap: 14,
  },
  locationFieldPair: {
    gap: 4,
  },
  locationFieldLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  locationFieldValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  // Fix 4: Params Card
  paramsCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    marginBottom: 24,
  },
  paramsCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  paramsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  paramTile: {
    minWidth: '46%' as any,
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  paramTileLabel: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  paramTileValue: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  notesBox: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1.5,
  },
  ctaButton: {
    width: '100%',
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
  },
  timelineInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  timelineInlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  timelineInlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineInlineLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineInlineValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  pdfSection: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  pdfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pdfTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  pdfSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  pdfChevron: {
    fontSize: 20,
    fontWeight: '800',
  },
  pdfList: {
    marginTop: 16,
    gap: 14,
  },
  pdfItem: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  pdfItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pdfBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  pdfItemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  pdfActions: {
    flexDirection: 'row',
    gap: 10,
  },
  pdfActionBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.2,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pdfActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pdfEmptyText: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});
