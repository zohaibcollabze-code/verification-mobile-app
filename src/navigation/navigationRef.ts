import { createNavigationContainerRef } from '@react-navigation/native';

type PendingNavigation = {
  routeName: string;
  params?: Record<string, any>;
} | null;

export const navigationRef = createNavigationContainerRef<any>();
let pendingNavigation: PendingNavigation = null;

export const navigate = (routeName: string, params?: Record<string, any>) => {
  if (navigationRef.isReady()) {
    (navigationRef.navigate as any)(routeName, params);
  } else {
    pendingNavigation = { routeName, params };
  }
};

export const flushPendingNavigation = () => {
  if (pendingNavigation && navigationRef.isReady()) {
    (navigationRef.navigate as any)(pendingNavigation.routeName, pendingNavigation.params);
    pendingNavigation = null;
  }
};
