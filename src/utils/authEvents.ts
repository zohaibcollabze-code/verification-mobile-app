/**
 * MPVP — Auth Events
 * Simple event emitter to handle global auth state changes
 * from non-hook environments (like apiClient) without circular dependencies.
 */

type AuthCallback = () => void;

class AuthEventEmitter {
  private listeners: AuthCallback[] = [];

  subscribe(callback: AuthCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  emitLogout() {
    this.listeners.forEach(l => l());
  }
}

export const authEvents = new AuthEventEmitter();
