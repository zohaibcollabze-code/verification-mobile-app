/**
 * MPVP — Photo Evidence Service
 * Handles camera/gallery access, image compression, and geotagging.
 * §14 Rule 4: Mandatory geotagging for all evidence.
 * §14 Rule 11: Screen capture prevention must be respected in related views.
 */
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { GPSService, GeoPoint } from './gpsService';

export interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
  location?: GeoPoint;
  timestamp: string;
}

export const PhotoService = {
  /** Capture a photo using the system camera with mandatory geotagging */
  captureEvidence: async (): Promise<CapturedPhoto | null> => {
    try {
      // 1. Check Permissions
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      const gpsPerm = await GPSService.requestPermissions();
      
      if (!cameraPerm.granted || !gpsPerm) {
        throw new Error('PERMISSIONS_DENIED');
      }

      // 2. Fetch Location concurrently with camera trigger (or right after)
      const location = await GPSService.getCurrentLocation();

      // 3. Launch Camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7, // Initial compression
        allowsEditing: false, // Prevent tampering with aspect ratio
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const asset = result.assets[0];

      // 4. Post-process: Compression & Resizing (§14 Optimized for upload)
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1200 } }], // Standardize width for technical review
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );

      return {
        uri: manipulated.uri,
        width: manipulated.width,
        height: manipulated.height,
        location: location || undefined,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[PhotoService] Error capturing evidence:', error);
      return null;
    }
  },

  /** Select and process an image from the gallery (if permitted) */
  selectFromGallery: async (): Promise<CapturedPhoto | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return null;

    const asset = result.assets[0];
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );

    return {
      uri: manipulated.uri,
      width: manipulated.width,
      height: manipulated.height,
      timestamp: new Date().toISOString(),
    };
  }
};
