import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { useNetworkStore } from '@/stores/networkStore';

let netInfoUnsubscribe: NetInfoSubscription | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

export function startNetworkListener(onConnectivityRestored: () => void): void {
  if (netInfoUnsubscribe || appStateSubscription) {
    return;
  }

  const handleConnectivity = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => {
    const isReachable = state.isConnected === true && state.isInternetReachable !== false;
    const store = useNetworkStore.getState();
    const wasOnline = store.isOnline;

    store.setOnline(isReachable);

    if (isReachable && !wasOnline) {
      onConnectivityRestored();
    }
  };

  netInfoUnsubscribe = NetInfo.addEventListener(handleConnectivity);

  NetInfo.fetch().then(handleConnectivity).catch((error) => {
    console.warn('[NetworkListener] Initial fetch failed', error);
  });

  const handleAppStateChange = (nextState: AppStateStatus) => {
    if (nextState === 'active' && useNetworkStore.getState().isOnline) {
      onConnectivityRestored();
    }
  };

  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
}

export function stopNetworkListener(): void {
  if (netInfoUnsubscribe) {
    netInfoUnsubscribe();
    netInfoUnsubscribe = null;
  }

  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}
