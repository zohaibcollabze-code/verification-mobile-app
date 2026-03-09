import { refreshAccessToken } from './tokenManager';
import { AppState, AppStateStatus } from 'react-native';

const REFRESH_INTERVAL = 14 * 60 * 1000;

class TokenRefreshService {
  private intervalId: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private isRunning = false;

  start() {
    if (this.isRunning) {
      if (__DEV__) {
        console.log('[TokenRefreshService] Already running');
      }
      return;
    }

    this.isRunning = true;
    
    this.scheduleRefresh();
    
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    
    if (__DEV__) {
      console.log('[TokenRefreshService] Started - will refresh every 14 minutes');
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.isRunning = false;
    
    if (__DEV__) {
      console.log('[TokenRefreshService] Stopped');
    }
  }

  private scheduleRefresh = () => {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      try {
        await refreshAccessToken();
        if (__DEV__) {
          console.log('[TokenRefreshService] Token refreshed successfully');
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[TokenRefreshService] Refresh failed:', error);
        }
        this.stop();
      }
    }, REFRESH_INTERVAL);
  };

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && this.isRunning) {
      this.scheduleRefresh();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }
  };
}

export const tokenRefreshService = new TokenRefreshService();
