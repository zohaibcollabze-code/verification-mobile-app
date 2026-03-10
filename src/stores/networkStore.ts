import { create } from 'zustand';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
type BannerType = 'offline' | 'syncing' | 'success' | 'error';

interface NetworkState {
  isOnline: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  bannerVisible: boolean;
  bannerMessage: string;
  bannerType: BannerType;

  setOnline: (value: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setLastSyncedAt: (ts: string) => void;
  showSuccessBanner: () => void;
}

let successTimeout: NodeJS.Timeout | null = null;

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isOnline: true,
  syncStatus: 'idle',
  lastSyncedAt: null,
  bannerVisible: false,
  bannerMessage: '',
  bannerType: 'offline',

  setOnline: (value) => {
    if (!value) {
      set({
        isOnline: false,
        bannerVisible: true,
        bannerMessage: 'You are offline. Changes will sync when connected.',
        bannerType: 'offline',
      });
    } else {
      set((state) => ({
        isOnline: true,
        bannerVisible: state.bannerType === 'offline' ? false : state.bannerVisible,
      }));
    }
  },

  setSyncStatus: (status) => {
    const hideSuccessTimer = () => {
      if (successTimeout) {
        clearTimeout(successTimeout);
        successTimeout = null;
      }
    };

    hideSuccessTimer();

    switch (status) {
      case 'syncing':
        set({
          syncStatus: 'syncing',
          bannerVisible: true,
          bannerMessage: 'Syncing your data…',
          bannerType: 'syncing',
        });
        break;
      case 'success':
        set({
          syncStatus: 'success',
          bannerVisible: true,
          bannerMessage: 'All caught up.',
          bannerType: 'success',
        });
        successTimeout = setTimeout(() => {
          set((state) =>
            state.bannerType === 'success'
              ? { bannerVisible: false, syncStatus: 'idle' }
              : state,
          );
          successTimeout = null;
        }, 3000);
        break;
      case 'error':
        set({
          syncStatus: 'error',
          bannerVisible: true,
          bannerMessage: 'Sync failed. Will retry automatically.',
          bannerType: 'error',
        });
        break;
      case 'idle':
      default:
        set({
          syncStatus: 'idle',
          bannerVisible: false,
        });
        break;
    }
  },

  setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),

  showSuccessBanner: () => {
    const { setSyncStatus } = get();
    setSyncStatus('success');
  },
}));
