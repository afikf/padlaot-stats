type AuthEventType = 'LOGOUT' | 'PLAYER_UPDATE' | 'ROLE_UPDATE';

interface AuthEvent {
  type: AuthEventType;
  data?: any;
}

class AuthBroadcastService {
  private channel: BroadcastChannel;
  private listeners: Map<AuthEventType, Set<(data?: any) => void>>;

  constructor() {
    this.channel = new BroadcastChannel('auth_channel');
    this.listeners = new Map();

    // Listen to messages from other tabs
    this.channel.onmessage = (event) => {
      const { type, data } = event.data as AuthEvent;
      this.notifyListeners(type, data);
    };
  }

  // Add event listener
  on(eventType: AuthEventType, callback: (data?: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)?.add(callback);

    // Return cleanup function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  // Broadcast event to other tabs
  broadcast(eventType: AuthEventType, data?: any) {
    const event: AuthEvent = { type: eventType, data };
    this.channel.postMessage(event);
    // Also notify listeners in current tab
    this.notifyListeners(eventType, data);
  }

  private notifyListeners(eventType: AuthEventType, data?: any) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Clean up
  destroy() {
    this.channel.close();
    this.listeners.clear();
  }
}

// Create singleton instance
const authBroadcast = typeof window !== 'undefined' ? new AuthBroadcastService() : null;

export default authBroadcast; 