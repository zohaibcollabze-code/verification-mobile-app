/**
 * MPVP — GPS & Location Service
 * Handles high-accuracy geotagging and permission management.
 * §14 Rule 4: GPS location is mandatory for all photo evidence.
 */
import * as Location from 'expo-location';
import { IS_PRODUCTION_API } from '@/config/environment';

export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  isMocked?: boolean;
  /** In __DEV__, if we substitute coordinates, we store the original here for audit/transparency */
  rawCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

const PAKISTAN_BOUNDS = {
  lat: { min: 23, max: 37 },
  lng: { min: 60, max: 77 }
};

// Karachi, Pakistan — safe mock for dev/emulator testing when out of bounds
const MOCK_KARACHI: GeoPoint = {
  latitude: 24.8607,
  longitude: 67.0011,
  accuracy: 5,
  timestamp: Date.now(),
  isMocked: true,
};

export type GPSPermissionState = 'granted' | 'denied' | 'blocked' | 'unavailable';

/** Helper to validate bounds without circular reference */
const validatePakistanBounds = (lat: number, lng: number): boolean => {
  return (
    lat >= PAKISTAN_BOUNDS.lat.min && lat <= PAKISTAN_BOUNDS.lat.max &&
    lng >= PAKISTAN_BOUNDS.lng.min && lng <= PAKISTAN_BOUNDS.lng.max
  );
};

export const GPSService = {
  /** Check permission status without requesting */
  getPermissionStatus: async (): Promise<Location.PermissionStatus> => {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status;
  },

  /** Request foreground location permissions with explicit states */
  requestPermissions: async (): Promise<GPSPermissionState> => {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') return 'granted';
      if (!canAskAgain) return 'blocked';
      return 'denied';
    } catch (error) {
      return 'unavailable';
    }
  },

  /** Pakistan Bounds Helper */
  validatePakistanBounds,

  /** 
   * Get current location with environment-aware validation.
   * - In Production: Strictly enforces Pakistan bounds.
   * - In Development (__DEV__): Automatically substitutes Karachi mock if out of bounds.
   */
  getCurrentLocation: async (isProduction: boolean = IS_PRODUCTION_API): Promise<GeoPoint> => {
    // 1. Check services
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) throw new Error('GPS_UNAVAILABLE');

    // 2. Fetch fresh location with Highest Accuracy and No Cache
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });

    if (!location) throw new Error('GPS_CAPTURE_FAILED');

    const coords: GeoPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || 0,
      timestamp: location.timestamp,
      isMocked: location.mocked || false,
    };

    console.log('[GPSService] Raw Device GPS:', coords.latitude, coords.longitude, '| Accuracy:', coords.accuracy, 'm');

    // 3. Environment-Aware Strictness
    // Production builds must always be real, within bounds, and not mocked at OS level.
    if (isProduction && !__DEV__) {
      if (coords.isMocked) throw new Error('MOCK_GPS_FORBIDDEN');
      if (!validatePakistanBounds(coords.latitude, coords.longitude)) {
        throw new Error('OUT_OF_PAKISTAN_BOUNDS');
      }
    }

    // 4. Bounds Check & Development Bypass
    const inBounds = validatePakistanBounds(coords.latitude, coords.longitude);

    if (!inBounds) {
      if (__DEV__) {
        // Emulator/Office testing outside Pakistan -> Use Karachi Mock point
        console.warn(
          `[GPSService] Location (${coords.latitude}, ${coords.longitude}) outside Pakistan bounds. ` +
          `Substituting verified Karachi mock point for development.`
        );
        return { 
          ...MOCK_KARACHI, 
          timestamp: Date.now(),
          rawCoordinates: {
            latitude: coords.latitude,
            longitude: coords.longitude
          }
        };
      }
      // If we got here and it's not __DEV__, it's a validation failure
      throw new Error('INVALID_GPS');
    }

    return coords;
  }
};
