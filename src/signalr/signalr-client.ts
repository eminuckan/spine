/**
 * SignalR Client for Real-time Updates
 * 
 * This client connects to SignalR hub and listens for real-time events.
 * Supports identity context changes, permissions updates, etc.
 */

import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import type {
  SignalRClientConfig,
  SignalRConnectionState,
  SignalREventHandler,
  IdentityContextChangedEvent,
  IdentityContextChangeHandler,
} from './types';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<SignalRClientConfig, 'hubPath' | 'baseUrl'>> = {
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  verbose: false,
  autoReconnectOnVisibility: true,
};

/**
 * SignalR Client Class
 * 
 * Generic SignalR client that can be used for any hub connection.
 */
export class SignalRClient {
  private connection: HubConnection | null = null;
  private accessToken: string | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private config: Required<Omit<SignalRClientConfig, 'baseUrl'>> & { baseUrl?: string };
  private eventHandlers: Map<string, Set<SignalREventHandler>> = new Map();
  private visibilityHandler: (() => void) | null = null;

  constructor(config: SignalRClientConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // Auto-reconnect on page visibility change
    if (typeof document !== 'undefined' && this.config.autoReconnectOnVisibility) {
      this.visibilityHandler = () => {
        if (document.visibilityState === 'visible' && this.connection?.state === 'Disconnected') {
          this.log('🔄 Page became visible, attempting reconnection...');
          this.connect(this.accessToken);
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  /**
   * Connect to SignalR hub
   */
  async connect(accessToken: string | null): Promise<void> {
    if (!accessToken) {
      this.log('⚠️ No access token provided for SignalR connection', 'warn');
      return;
    }

    if (this.isConnecting) {
      this.log('🔄 Connection already in progress...');
      return;
    }

    if (this.connection?.state === 'Connected') {
      this.log('✅ Already connected');
      return;
    }

    this.accessToken = accessToken;
    this.isConnecting = true;

    try {
      const hubUrl = this.buildHubUrl();

      this.connection = new HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => accessToken,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s
            const delay = Math.min(
              this.config.reconnectDelay * Math.pow(2, retryContext.previousRetryCount),
              16000
            );
            this.log(`🔄 Reconnect attempt ${retryContext.previousRetryCount + 1} in ${delay}ms`);
            return delay;
          },
        })
        .configureLogging(this.config.verbose ? LogLevel.Information : LogLevel.Warning)
        .build();

      // Setup event handlers
      this.setupConnectionHandlers();

      // Connect
      this.log(`🔄 Connecting to SignalR hub: ${hubUrl}`);
      await this.connection.start();

      this.log(`✅ Connected successfully (ID: ${this.connection.connectionId})`);
      this.reconnectAttempts = 0;
    } catch (error) {
      this.log(`❌ Connection failed: ${error}`, 'error');
      this.reconnectAttempts++;

      // Retry with exponential backoff
      if (this.reconnectAttempts <= this.config.maxReconnectAttempts) {
        const delay = Math.min(
          this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
          30000
        );
        this.log(
          `🔄 Retrying in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
        );

        setTimeout(() => {
          this.connect(accessToken);
        }, delay);
      } else {
        this.log('❌ Max reconnection attempts reached', 'error');
      }
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Build hub URL
   */
  private buildHubUrl(): string {
    let baseUrl = this.config.baseUrl;

    // Auto-detect base URL if not provided
    if (!baseUrl && typeof window !== 'undefined') {
      baseUrl =
        window.location.hostname === 'localhost'
          ? 'https://localhost:5001' // Development
          : window.location.origin; // Production
    }

    return `${baseUrl}${this.config.hubPath}`;
  }

  /**
   * Setup connection lifecycle handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.onreconnecting((error) => {
      this.log(`🔄 Reconnecting... ${error?.message || ''}`);
    });

    this.connection.onreconnected((connectionId) => {
      this.log(`✅ Reconnected (ID: ${connectionId})`);
      this.reconnectAttempts = 0;
    });

    this.connection.onclose((error) => {
      this.log(`🔌 Connection closed: ${error?.message || 'No error'}`);

      // Auto-reconnect if we have a token and it wasn't a manual disconnect
      if (this.accessToken && error) {
        setTimeout(() => {
          this.connect(this.accessToken);
        }, 5000);
      }
    });

    // Re-register all event handlers
    this.eventHandlers.forEach((handlers, eventName) => {
      this.connection!.on(eventName, (event: unknown) => {
        handlers.forEach((handler) => {
          try {
            handler(event);
          } catch (err) {
            this.log(`❌ Error in ${eventName} handler: ${err}`, 'error');
          }
        });
      });
    });
  }

  /**
   * Disconnect from SignalR hub
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      this.log('🔌 Disconnecting...');
      await this.connection.stop();
      this.connection = null;
      this.accessToken = null;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Register event handler
   */
  on<T = unknown>(eventName: string, handler: SignalREventHandler<T>): () => void {
    // Add to handlers map
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set());
    }
    this.eventHandlers.get(eventName)!.add(handler as SignalREventHandler);

    // If already connected, register immediately
    if (this.connection) {
      this.connection.on(eventName, handler);
    }

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(eventName)?.delete(handler as SignalREventHandler);
      this.connection?.off(eventName, handler);
    };
  }

  /**
   * Invoke hub method
   */
  async invoke<T = void>(methodName: string, ...args: unknown[]): Promise<T> {
    if (!this.connection || this.connection.state !== 'Connected') {
      throw new Error('SignalR not connected');
    }
    return this.connection.invoke<T>(methodName, ...args);
  }

  /**
   * Get current connection state
   */
  get connectionState(): SignalRConnectionState {
    return (this.connection?.state as SignalRConnectionState) || 'Disconnected';
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.connection?.state === 'Connected';
  }

  /**
   * Get connection ID
   */
  get connectionId(): string | null {
    return this.connection?.connectionId || null;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    this.disconnect();
    this.eventHandlers.clear();
  }

  /**
   * Log message
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.config.verbose && level === 'info') return;

    const prefix = '[SignalR]';
    switch (level) {
      case 'warn':
        console.warn(prefix, message);
        break;
      case 'error':
        console.error(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }
}

/**
 * Create Identity SignalR Client
 * 
 * Factory function to create a SignalR client for identity hub.
 */
export function createIdentitySignalRClient(
  options: Omit<SignalRClientConfig, 'hubPath'> = {}
): SignalRClient {
  return new SignalRClient({
    ...options,
    hubPath: '/hubs/identity',
  });
}

/**
 * Identity SignalR Client
 * 
 * Specialized client for identity context changes.
 */
export class IdentitySignalRClient extends SignalRClient {
  private identityHandlers: IdentityContextChangeHandler[] = [];

  constructor(options: Omit<SignalRClientConfig, 'hubPath'> = {}) {
    super({
      ...options,
      hubPath: '/hubs/identity',
    });

    // Register identity context change handler
    this.on<IdentityContextChangedEvent>('IdentityContextChanged', (event) => {
      this.identityHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in identity context change handler:', error);
        }
      });
    });
  }

  /**
   * Add handler for identity context changes
   */
  onIdentityContextChanged(handler: IdentityContextChangeHandler): () => void {
    this.identityHandlers.push(handler);

    return () => {
      const index = this.identityHandlers.indexOf(handler);
      if (index > -1) {
        this.identityHandlers.splice(index, 1);
      }
    };
  }
}

/**
 * Singleton identity client instance
 */
let identityClientInstance: IdentitySignalRClient | null = null;

/**
 * Get or create singleton identity SignalR client
 */
export function getIdentitySignalRClient(
  options: Omit<SignalRClientConfig, 'hubPath'> = {}
): IdentitySignalRClient {
  if (!identityClientInstance) {
    identityClientInstance = new IdentitySignalRClient(options);
  }
  return identityClientInstance;
}

/**
 * Initialize SignalR with access token
 */
export async function initializeSignalR(
  accessToken: string | null,
  options: Omit<SignalRClientConfig, 'hubPath'> = {}
): Promise<IdentitySignalRClient> {
  if (typeof window === 'undefined') {
    throw new Error('SignalR can only be initialized on the client');
  }

  const client = getIdentitySignalRClient(options);
  await client.connect(accessToken);
  return client;
}

/**
 * Cleanup SignalR connection
 */
export async function cleanupSignalR(): Promise<void> {
  if (identityClientInstance) {
    await identityClientInstance.disconnect();
    identityClientInstance.dispose();
    identityClientInstance = null;
  }
}
