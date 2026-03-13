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
    const offerLetter = (assignment as any)?.offerLetterUrl ?? (assignment as any)?.fieldData?.offerLetterPdf;
    if (offerLetter) {
      fallbackDocs.push({ id: 'offer-letter', title: 'Offer Letter', url: offerLetter });
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

          <View style={styles.quickInfoGrid}>
            <View style={styles.quickInfoItem}>
              <Text style={[styles.quickLabel, { color: Colors.textMuted }]}>BANK</Text>
              <Text style={[styles.quickValue, { color: Colors.textSecondary }]}>{assignment.bankName}</Text>
            </View>
            <View style={styles.quickInfoItem}>
              <Text style={[styles.quickLabel, { color: Colors.textMuted }]}>CONTRACT</Text>
              <Text style={[styles.quickValue, { color: Colors.textSecondary }]}>{assignment.contractType?.name || 'Standard'}</Text>
            </View>
          </View>

          <View style={styles.quickInfoGrid}>
            <View style={styles.quickInfoItem}>
              <Text style={[styles.quickLabel, { color: Colors.textMuted }]}>ASSIGNMENT CREATED</Text>
              <Text style={[styles.quickValue, { color: Colors.textPrimary }]}>{formatDate(assignment.createdAt)}</Text>
            </View>
            <View style={styles.quickInfoItem}>
              <Text style={[styles.quickLabel, { color: Colors.textMuted }]}>DEADLINE</Text>
              <Text style={[styles.quickValue, assignment.dueDate ? { color: Colors.primary } : { color: Colors.textMuted }]}>
                {assignment.dueDate ? formatDate(assignment.dueDate) : '—'}
              </Text>
            </View>
          </View>

          <View style={styles.timelineInline}>
            <View style={styles.timelineInlineItem}>
              <View style={[styles.timelineInlineDot, { backgroundColor: Colors.success }]} />
              <View>
                <Text style={[styles.timelineInlineLabel, { color: Colors.textPrimary }]}>Created</Text>
                <Text style={[styles.timelineInlineValue, { color: Colors.textMuted }]}>{formatDate(assignment.createdAt)}</Text>
              </View>
            </View>
            {assignment.status?.toLowerCase() === 'accepted' && (
              <View style={styles.timelineInlineItem}>
                <View style={[styles.timelineInlineDot, { backgroundColor: Colors.primary }]} />
                <View>
                  <Text style={[styles.timelineInlineLabel, { color: Colors.textPrimary }]}>Accepted</Text>
                  <Text style={[styles.timelineInlineValue, { color: Colors.textMuted }]}>Inspector In Progress</Text>
                </View>
              </View>
            )}
            {assignment.status?.toLowerCase() === 'returned' && (
              <View style={styles.timelineInlineItem}>
                <View style={[styles.timelineInlineDot, { backgroundColor: Colors.warning }]} />
                <View>
                  <Text style={[styles.timelineInlineLabel, { color: Colors.textPrimary }]}>Returned</Text>
                  <Text style={[styles.timelineInlineValue, { color: Colors.textMuted }]}>Awaiting Resubmission</Text>
                </View>
              </View>
            )}
            {assignment.dueDate && (
              <View style={styles.timelineInlineItem}>
                <View style={[styles.timelineInlineDot, { backgroundColor: Colors.danger }]} />
                <View>
                  <Text style={[styles.timelineInlineLabel, { color: Colors.textPrimary }]}>Deadline</Text>
                  <Text style={[styles.timelineInlineValue, { color: Colors.primary }]}>{formatDate(assignment.dueDate)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* PDF Dropdown */}
        <View style={[styles.pdfSection, { borderColor: Colors.borderDefault, backgroundColor: Colors.bgCard }]}>
          <Pressable style={styles.pdfHeader} onPress={() => setPdfExpanded((prev) => !prev)}>
            <View>
              <Text style={[styles.pdfTitle, { color: Colors.textPrimary }]}>Documents & PDFs</Text>
              <Text style={[styles.pdfSubtitle, { color: Colors.textMuted }]}>Offer letters, inspection packs, contracts</Text>
            </View>
            <Text style={[styles.pdfChevron, { color: Colors.textSecondary }]}>{pdfExpanded ? '▴' : '▾'}</Text>
          </Pressable>
          {pdfExpanded && (
            <View style={styles.pdfList}>
              {pdfOptions.length === 0 ? (
                <Text style={[styles.pdfEmptyText, { color: Colors.textMuted }]}>No documents available for this assignment.</Text>
              ) : (
                pdfOptions.map((doc) => (
                  <View key={doc.id} style={[styles.pdfItem, { borderColor: Colors.borderDefault }]}> 
                    <View style={styles.pdfItemInfo}>
                      <View style={[styles.pdfBadge, { backgroundColor: Colors.primaryGlow }]}> 
                        <Text style={[styles.pdfBadgeText, { color: Colors.primary }]}>PDF</Text>
                      </View>
                      <Text style={[styles.pdfItemTitle, { color: Colors.textPrimary }]}>{doc.title}</Text>
                    </View>
                    <View style={styles.pdfActions}>
                      <Pressable onPress={() => handlePreview(doc)} style={[styles.pdfActionBtn, { borderColor: Colors.primary }]}> 
                        <Text style={[styles.pdfActionText, { color: Colors.primary }]}>Preview</Text>
                      </Pressable>
                      <Pressable onPress={() => handleDownload(doc)} style={[styles.pdfActionBtn, { borderColor: Colors.textSecondary }]}> 
                        {isDownloading ? (
                          <ActivityIndicator size="small" color={Colors.textSecondary} />
                        ) : (
                          <Text style={[styles.pdfActionText, { color: Colors.textSecondary }]}>Download</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* Detailed Information Sections */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: Colors.textMuted }]}>LOCATION & CONTACT</Text>
          <DetailRow label="Site Address" value={assignment.siteAddress} color={Colors.textPrimary} labelColor={Colors.textSecondary} multiline />
          <DetailRow label="Site City" value={assignment.siteCity} color={Colors.textPrimary} labelColor={Colors.textSecondary} />
          <DetailRow label="Contact Person" value={assignment.contactPerson} color={Colors.textPrimary} labelColor={Colors.textSecondary} />
          <DetailRow label="Contact Number" value={assignment.siteContactNumber} color={Colors.textPrimary} labelColor={Colors.textSecondary} />
          <DetailRow label="Branch Manager" value={assignment.branchManagerName} color={Colors.textPrimary} labelColor={Colors.textSecondary} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: Colors.textMuted }]}>INSPECTION PARAMETERS</Text>
          <DetailRow label="Inspection Type" value={assignment.inspectionType} color={Colors.textPrimary} labelColor={Colors.textSecondary} />
          <DetailRow label="Scope" value={assignment.inspectionScope} color={Colors.textPrimary} labelColor={Colors.textSecondary} />
          <DetailRow label="Inventory Holding" value={`${assignment.inventoryHoldingDays} Days`} color={Colors.textPrimary} labelColor={Colors.textSecondary} />
          <DetailRow label="Past Inspections" value={assignment.totalInspectionsToDate.toString()} color={Colors.textPrimary} labelColor={Colors.textSecondary} />
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
  quickInfoGrid: {
    flexDirection: 'row',
  },
  quickInfoItem: {
    flex: 1,
  },
  quickLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  quickValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  rejectionBox: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  rejectionIcon: {
    fontSize: 18,
  },
  rejectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  rejectionMsg: {
    fontSize: 14,
    fontWeight: '600',
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 8,
  },
  rejectionFooter: {
    fontSize: 11,
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    marginLeft: 20,
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
