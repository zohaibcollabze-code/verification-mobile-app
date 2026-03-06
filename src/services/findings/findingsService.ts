import apiClient from '../api/apiClient';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export const findingsService = {
  submitFindings: async (params: {
    requestId: string;
    findingData: Record<string, any>;
    photosByField: Record<string, string[]>; // fieldKey -> localUri[]
    gpsCoordinates: { latitude: number; longitude: number; };
    overallStatus?: string;
  }): Promise<void> => {
    // GPS is already captured & validated by ReviewScreen via useGPS hook.
    const { latitude, longitude } = params.gpsCoordinates;

    // 1. Build Multipart Payload (§6.4)
    const formData = new FormData();
    formData.append('findingData', JSON.stringify(params.findingData));
    if (params.overallStatus) {
      formData.append('overallStatus', params.overallStatus);
    }
    formData.append('overallStatus', params.overallStatus);
    formData.append('gpsLatitude', latitude.toString());
    formData.append('gpsLongitude', longitude.toString());

    // 2. Process and Attach Photos — with resilient error handling
    for (const [fieldKey, uris] of Object.entries(params.photosByField)) {
      for (const uri of uris) {
        try {
          // Image compression (§16.4)
          const manipResult = await manipulateAsync(
            uri,
            [{ resize: { width: 1920 } }],
            { compress: 0.8, format: SaveFormat.JPEG }
          );

          const filename = `${fieldKey}_${Date.now()}.jpg`;
          // @ts-ignore: FormData in RN expects an object for files
          formData.append(fieldKey, {
            uri: manipResult.uri,
            name: filename,
            type: 'image/jpeg',
          });
        } catch (imgErr) {
          // If image manipulation fails (expired cache, corrupt file),
          // fall back to sending the original image without compression.
          console.warn(`[findingsService] Image compression failed for ${uri}, sending original.`, imgErr);
          const filename = `${fieldKey}_${Date.now()}.jpg`;
          // @ts-ignore: FormData in RN expects an object for files
          formData.append(fieldKey, {
            uri: uri,
            name: filename,
            type: 'image/jpeg',
          });
        }
      }
    }

    if (__DEV__) {
      console.log('[findingsService] Submitting with GPS:', params.gpsCoordinates);
      console.log('[findingsService] findingData keys:', Object.keys(params.findingData));
      console.log('[findingsService] overallStatus:', params.overallStatus);
      console.log('[findingsService] Photo fields:', Object.keys(params.photosByField));
    }

    await apiClient.post(`/inspections/${params.requestId}/submit-findings`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Extended timeout for large uploads (§6.4)
      timeout: 180000,
    }).catch((err: any) => {
      if (err?.response) {
        console.log('[findingsService] Server Error Response:', JSON.stringify(err.response.data, null, 2));
        console.log('[findingsService] Server Status:', err.response.status);
      }
      throw err;
    });
  },
  getPreviousInspection: async (requestId: string) => {
    try {
      const response = await apiClient.get(`/inspections/${requestId}/previous`);
      return response.data;
    } catch (err) {
      // If no previous data, return null
      return null;
    }
  },
};
