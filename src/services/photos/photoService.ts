import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

const MIN_FREE_BYTES = 150 * 1024 * 1024;
const dirs = FileSystem as typeof FileSystem & {
  documentDirectory?: string | null;
  cacheDirectory?: string | null;
};
const BASE_DIR = dirs.documentDirectory ?? dirs.cacheDirectory ?? '';
export const PHOTOS_DIR = `${BASE_DIR}inspections/photos/`;

async function getFreeSpace(): Promise<number> {
  try {
    if (FileSystem.getFreeDiskStorageAsync) {
      return await FileSystem.getFreeDiskStorageAsync();
    }
  } catch (error) {
    console.warn('[photoService] Failed to read free disk storage', error);
  }
  return Number.MAX_SAFE_INTEGER;
}

export async function checkStorageAvailable(): Promise<boolean> {
  const freeBytes = await getFreeSpace();
  if (freeBytes < MIN_FREE_BYTES) {
    Alert.alert('Storage Low', 'You are running out of space. Please free up storage to continue capturing evidence.');
    return false;
  }
  return true;
}

export async function ensurePhotosDirectory(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

async function persistAsset(assetUri: string, inspectionLocalId: string, fieldId: string): Promise<string> {
  const filename = `inspection_${inspectionLocalId}_${fieldId}_${Date.now()}.jpg`;
  const destination = `${PHOTOS_DIR}${filename}`;
  await FileSystem.copyAsync({ from: assetUri, to: destination });
  return destination;
}

export async function capturePhoto(inspectionLocalId: string, fieldId: string): Promise<string | null> {
  if (!(await checkStorageAvailable())) {
    return null;
  }
  await ensurePhotosDirectory();

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: false,
    exif: false,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];
  return persistAsset(asset.uri, inspectionLocalId, fieldId);
}

export async function selectFromGallery(inspectionLocalId: string, fieldId: string): Promise<string | null> {
  if (!(await checkStorageAvailable())) {
    return null;
  }
  await ensurePhotosDirectory();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: false,
    exif: false,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];
  return persistAsset(asset.uri, inspectionLocalId, fieldId);
}

export async function deleteLocalPhoto(localUri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  } catch (error) {
    console.warn('[photoService] Failed to delete local photo', error);
  }
}
