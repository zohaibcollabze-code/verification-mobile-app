import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Image, Dimensions, StyleSheet, Modal, Platform, ActionSheetIOS, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/constants/colors';
import { useInspectionStore } from '@/stores/inspectionStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BottomSheetPicker } from '@/components/ui/BottomSheetPicker';
import type { PhotoItem } from '@/types/store.types';

interface Props {
  onNext: () => void;
  onBack: () => void;
  requestId: string;
}

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 48 - 12) / 3; // 48 is total padding (24*2), 12 is gap (6*2)

export default function Step4Photos({ onNext, onBack, requestId }: Props) {
  const colors = useColors();
  const storedDraft = useInspectionStore((s) => s.drafts[requestId]);
  const addPhoto = useInspectionStore((s) => s.addPhoto);
  const removePhoto = useInspectionStore((s) => s.removePhoto);
  const updatePhoto = useInspectionStore((s) => s.updatePhoto);

  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isUploadModalVisible, setUploadModalVisible] = useState(false);
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [fieldPickerVisible, setFieldPickerVisible] = useState(false);

  const photos = useMemo(() => storedDraft?.photos || [], [storedDraft]);
  const selectedPhoto = useMemo(() =>
    photos.find(p => p.id === selectedPhotoId),
    [photos, selectedPhotoId]);

  const schemaFields = useMemo(() => {
    const schema = storedDraft?.schemaSnapshot || [];
    return schema.map(field => ({
      label: field.label || field.key,
      value: field.key,
    }));
  }, [storedDraft?.schemaSnapshot]);

  const getFieldLabel = useCallback((fieldKey: string | null) => {
    if (!fieldKey) return 'General Evidence';
    const field = schemaFields.find(f => f.value === fieldKey);
    return field ? field.label : 'General Evidence';
  }, [schemaFields]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgScreen,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 4,
      paddingBottom: 160, // Grid + Detail section needs more clearance
    },
    // ── Page Header ──────────────────────────────────────
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 6,
    },
    pageTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    photoCount: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '700',
      letterSpacing: 1,
    },
    pageSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 28,
    },
    // ── Photo Grid ───────────────────────────────────────
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 36,
    },
    addCard: {
      width: GRID_SIZE,
      height: GRID_SIZE,
      borderRadius: 24, // Increased to 24px for premium feel
      backgroundColor: colors.bgCard,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    addIcon: {
      fontSize: 22,
    },
    addText: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    photoCard: {
      width: GRID_SIZE,
      height: GRID_SIZE,
      borderRadius: 24, // Consistent 24px radius
      overflow: 'hidden',
      backgroundColor: colors.bgCard,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    photoCardActive: {
      borderColor: colors.primary,
    },
    thumbnail: {
      width: '100%',
      height: '100%',
    },
    mediaOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    playSmall: {
      fontSize: 20,
      color: '#FFF',
    },
    uploadText: {
      color: '#FFF',
      fontSize: 9,
      fontWeight: '800',
    },
    // ── Detail Card ──────────────────────────────────────
    detailCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1.5,
      borderColor: colors.borderDefault,
      gap: 0,
    },
    detailTitle: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 1.5,
      marginBottom: 16,
      textTransform: 'uppercase',
    },
    previewWrapper: {
      height: 200,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: '#000',
      marginBottom: 20,
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    videoPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: '#0B1221',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    previewOverlays: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      flexDirection: 'row',
      gap: 8,
    },
    overlayBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    deleteBtn: {
      backgroundColor: 'rgba(239, 68, 68, 0.9)',
    },
    btnText: {
      color: '#FFF',
      fontSize: 16,
    },
    helperText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    fieldSelector: {
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.borderDefault,
      backgroundColor: colors.bgScreen,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: 8,
    },
    fieldValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    fieldArrow: {
      fontSize: 16,
      color: colors.textMuted,
    },
    // ── Footer ───────────────────────────────────────────
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      padding: 20,
      paddingBottom: 40,
      backgroundColor: colors.bgScreen,
      borderTopWidth: 1,
      borderTopColor: colors.borderDefault,
      gap: 12,
    },
    backBtn: { flex: 1 },
    nextBtn: { flex: 2 },
    // ── Modal ────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 32,
      paddingBottom: 48,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 32,
    },
    optionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 32,
    },
    option: {
      alignItems: 'center',
      gap: 12,
    },
    optionCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: colors.bgScreen,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    optionText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
  }), [colors]);

  const processMediaResult = (result: ImagePicker.ImagePickerResult, existingPhotoId?: string) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      if (existingPhotoId) {
        updatePhoto(requestId, existingPhotoId, {
          localUri: asset.uri,
          fileSizeBytes: asset.fileSize || 0,
          mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
        });
      } else {
        const newId = `media_${Date.now()}`;
        addPhoto(requestId, {
          id: newId,
          localUri: asset.uri,  
          attachmentId: null,
          s3Key: null,
          caption: '',
          remarks: '',
          fieldKey: null,
          uploadStatus: 'pending',
          uploadProgress: 0,
          mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
          fileSizeBytes: asset.fileSize || 0,
        });
        setSelectedPhotoId(newId);
      }
    }
  };

  const handleCapture = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    processMediaResult(result, editPhotoId || undefined);
    setUploadModalVisible(false);
    setEditPhotoId(null);
  };

  const handleRecordVideo = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 120,
    });
    processMediaResult(result, editPhotoId || undefined);
    setUploadModalVisible(false);
    setEditPhotoId(null);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    processMediaResult(result, editPhotoId || undefined);
    setUploadModalVisible(false);
    setEditPhotoId(null);
  };

  const openUploadOptions = (photoId?: string) => {
    setEditPhotoId(photoId || null);
    setUploadModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Media Evidence</Text>
          <Text style={styles.photoCount}>{photos.length} / 20</Text>
        </View>
        <Text style={styles.pageSubtitle}>
          Capture high-resolution evidence of the asset and site conditions.
        </Text>

        {/* Photo Grid */}
        <View style={styles.grid}>
          <Pressable onPress={() => openUploadOptions()} style={styles.addCard}>
            <Text style={styles.addIcon}>📷</Text>
            <Text style={styles.addText}>Add Media</Text>
          </Pressable>

          {photos.map((photo) => {
            const isActive = selectedPhotoId === photo.id;
            const isVideo = photo.mimeType?.startsWith('video');
            return (
              <Pressable
                key={photo.id}
                onPress={() => setSelectedPhotoId(isActive ? null : photo.id)}
                style={[styles.photoCard, isActive && styles.photoCardActive]}
              >
                <Image source={{ uri: photo.localUri }} style={styles.thumbnail} />
                {isVideo && (
                  <View style={styles.mediaOverlay}>
                    <Text style={styles.playSmall}>▶</Text>
                  </View>
                )}
                {photo.uploadStatus === 'uploading' && (
                  <View style={styles.mediaOverlay}>
                    <Text style={styles.uploadText}>Uploading...</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Media Detail Card */}
        {selectedPhoto && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>MEDIA SELECTION</Text>

            <View style={styles.previewWrapper}>
              {selectedPhoto.mimeType?.startsWith('video') ? (
                <View style={styles.videoPlaceholder}>
                  <Text style={{ fontSize: 48 }}>▶</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>VIDEO RECORDING</Text>
                </View>
              ) : (
                <Image source={{ uri: selectedPhoto.localUri }} style={styles.previewImage} />
              )}
              <View style={styles.previewOverlays}>
                <Pressable onPress={() => openUploadOptions(selectedPhoto.id)} style={styles.overlayBtn}>
                  <Text style={styles.btnText}>✎</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    removePhoto(requestId, selectedPhoto.id);
                    setSelectedPhotoId(null);
                  }}
                  style={[styles.overlayBtn, styles.deleteBtn]}
                >
                  <Text style={styles.btnText}>🗑</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={styles.fieldLabel}>RELATED FIELD</Text>
              <Pressable onPress={() => setFieldPickerVisible(true)} style={styles.fieldSelector}>
                <Text style={styles.fieldValue}>{getFieldLabel(selectedPhoto.fieldKey)}</Text>
                <Text style={styles.fieldArrow}>▼</Text>
              </Pressable>
              <Text style={styles.helperText}>
                Select which inspection field this image relates to, or leave as "General Evidence".
              </Text>
            </View>

            <Input
              label="Evidence Title"
              value={selectedPhoto.caption || ''}
              onChangeText={(val) => updatePhoto(requestId, selectedPhoto.id, { caption: val })}
              placeholder="e.g. Front View of Machinery"
            />

            <Input
              label="Observations"
              value={selectedPhoto.remarks || ''}
              onChangeText={(val) => updatePhoto(requestId, selectedPhoto.id, { remarks: val })}
              placeholder="Detail any technical observations seen here..."
              multiline
              inputHeight={80}
            />
          </View>
        )}
      </ScrollView>

      {/* Upload Modal */}
      <Modal visible={isUploadModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setUploadModalVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Capture Evidence</Text>
            <View style={styles.optionsRow}>
              <Pressable onPress={handleCapture} style={styles.option}>
                <View style={styles.optionCircle}><Text style={{ fontSize: 26 }}>📸</Text></View>
                <Text style={styles.optionText}>Photo</Text>
              </Pressable>
              <Pressable onPress={handleRecordVideo} style={styles.option}>
                <View style={[styles.optionCircle, { backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                  <Text style={{ fontSize: 26 }}>🎥</Text>
                </View>
                <Text style={styles.optionText}>Video</Text>
              </Pressable>
              <Pressable onPress={handlePickImage} style={styles.option}>
                <View style={styles.optionCircle}><Text style={{ fontSize: 26 }}>🖼️</Text></View>
                <Text style={styles.optionText}>Gallery</Text>
              </Pressable>
            </View>
            <Button title="Dismiss" variant="outline" onPress={() => setUploadModalVisible(false)} />
          </View>
        </Pressable>
      </Modal>

      <BottomSheetPicker
        visible={fieldPickerVisible}
        title="Select Related Field"
        options={[
          { label: 'General Evidence', value: null },
          ...schemaFields,
        ]}
        selected={selectedPhoto?.fieldKey}
        onSelect={(value) => {
          if (selectedPhoto) {
            updatePhoto(requestId, selectedPhoto.id, { fieldKey: value });
          }
          setFieldPickerVisible(false);
        }}
        onClose={() => setFieldPickerVisible(false)}
      />

      <View style={styles.footer}>
        <Button title="Back" variant="outline" onPress={onBack} style={styles.backBtn} />
        <Button title="Review Report →" onPress={onNext} style={styles.nextBtn} />
      </View>
    </View>
  );
}
