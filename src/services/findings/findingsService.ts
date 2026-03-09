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
      console.clear();
      console.log('\n========== FINDINGS SUBMISSION PAYLOAD ==========');
      console.log('\n[REQUEST ID]:', params.requestId);
      console.log('\n[GPS COORDINATES]:', JSON.stringify(params.gpsCoordinates, null, 2));
      console.log('\n[OVERALL STATUS]:', params.overallStatus);
      console.log('\n[FINDING DATA]:', JSON.stringify(params.findingData, null, 2));
      console.log('\n[PHOTOS BY FIELD]:');
      Object.entries(params.photosByField).forEach(([fieldKey, uris]) => {
        console.log(`  - Field: "${fieldKey}" → ${uris.length} image(s)`);
        uris.forEach((uri, idx) => {
          console.log(`    [${idx + 1}] ${uri}`);
        });
      });
      console.log('\n[FORM DATA ENTRIES]:');
      console.log('  - findingData: [JSON stringified object]');
      console.log('  - overallStatus:', params.overallStatus);
      console.log('  - gpsLatitude:', latitude.toString());
      console.log('  - gpsLongitude:', longitude.toString());
      console.log('  - Images attached:', Object.values(params.photosByField).flat().length);
      console.log('\n[PAYLOAD VALIDATION]:');
      console.log('  - Request ID valid:', !!params.requestId);
      console.log('  - GPS valid:', !!(latitude && longitude));
      console.log('  - Finding data valid:', Object.keys(params.findingData).length > 0);
      console.log('  - Overall status set:', !!params.overallStatus);
      console.log('\n================================================\n');
    }

    try {
      console.log('[findingsService] Initiating submission to:', `/inspections/${params.requestId}/submit-findings`);
      const response = await apiClient.post(`/inspections/${params.requestId}/submit-findings`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Extended timeout for large uploads (§6.4)
        timeout: 180000,
      });
      console.log('[findingsService] ✅ Submission successful:', response.status);
    } catch (err: any) {
      console.error('[findingsService] ❌ Submission failed');
      if (err?.response) {
        console.error('[findingsService] Server Error Response:', JSON.stringify(err.response.data, null, 2));
        console.error('[findingsService] Server Status:', err.response.status);
        console.error('[findingsService] Server Headers:', err.response.headers);
      } else if (err?.request) {
        console.error('[findingsService] No response received from server');
        console.error('[findingsService] Request config:', err.config?.url);
      } else {
        console.error('[findingsService] Request setup error:', err.message);
      }
      throw err;
    }
  },
};