import { refreshAccessToken, isTokenExpiringSoon } from './tokenManager';
import { AppState, AppStateStatus } from 'react-native';
import { getAccessToken } from '../storage/secureStorage';

const REFRESH_INTERVAL = 10 * 60 * 1000; // conservative 10 minutes

class TokenRefreshService {
  private intervalId: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private isRunning = false;

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.scheduleRefresh();
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    
    // Initial check on start
    this.checkAndRefreshIfNeeded();
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
  }

  private checkAndRefreshIfNeeded = async () => {
    try {
      const token = await getAccessToken();
      if (token && isTokenExpiringSoon(token, 5)) {
        if (__DEV__) console.log('[TokenRefreshService] Token expiring soon, refreshing proactively...');
        await refreshAccessToken();
      }
    } catch (error) {
      if (__DEV__) console.warn('[TokenRefreshService] Proactive refresh check failed:', error);
    }
  };

  private scheduleRefresh = () => {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      try {
        await refreshAccessToken();
        if (__DEV__) console.log('[TokenRefreshService] Interval refresh successful');
      } catch (error) {
        if (__DEV__) console.warn('[TokenRefreshService] Interval refresh failed:', error);
        // Don't stop the service on interval failure, only on terminal auth failure
      }
    }, REFRESH_INTERVAL);
  };

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && this.isRunning) {
      this.checkAndRefreshIfNeeded();
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
