import { useState, useCallback } from 'react';
import { Linking } from 'react-native';
import * as Location from 'expo-location';
import { GPSService, GeoPoint, GPSPermissionState } from '@/services/gpsService';
import { IS_PRODUCTION_API } from '@/config/environment';

export const useGPS = () => {
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [permissionState, setPermissionState] = useState<GPSPermissionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);

  const refreshLocation = useCallback(async (isProduction: boolean = IS_PRODUCTION_API) => {
    setLoading(true);
    setError(null);
    try {
      const status = await GPSService.requestPermissions();
      setPermissionState(status);

      if (status !== 'granted') {
        setError({
          message: status === 'blocked' ? 'Location access is blocked in system settings.' : 'Location permission is required.',
          code: status.toUpperCase()
        });
        return null;
      }

      const coords = await GPSService.getCurrentLocation(isProduction);
      setLocation(coords);
      return coords;
    } catch (err: any) {
      let message = 'Unable to capture location.';
      if (err.message === 'GPS_UNAVAILABLE') message = 'GPS services are disabled. Please enable location.';
      if (err.message === 'MOCK_GPS_FORBIDDEN') message = 'Mocked location is not allowed in production.';
      if (err.message === 'OUT_OF_PAKISTAN_BOUNDS' || err.message === 'INVALID_GPS') {
        message = 'Location must be within Pakistan bounds.';
      }
      
      setError({ message, code: err.message });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return {
    location,
    permissionStatus: permissionState === 'granted' ? Location.PermissionStatus.GRANTED : Location.PermissionStatus.DENIED,
    loading,
    error,
    refreshLocation,
    openSettings,
  };
};
