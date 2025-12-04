/**
 * SignalR Types
 */

// Re-export from identity to avoid duplication
export type { 
  IdentityContextChangedEvent, 
  IdentityContextChangeHandler 
} from '../identity/types';

/**
 * Generic SignalR event handler
 */
export type SignalREventHandler<T = unknown> = (event: T) => void;

/**
 * SignalR connection state
 */
export type SignalRConnectionState =
  | 'Connecting'
  | 'Connected'
  | 'Reconnecting'
  | 'Disconnected';

/**
 * SignalR client configuration
 */
export interface SignalRClientConfig {
  /**
   * Base URL for SignalR hub (defaults to API base URL)
   */
  baseUrl?: string;
  /**
   * Hub path (e.g., '/hubs/identity')
   */
  hubPath: string;
  /**
   * Maximum reconnect attempts
   */
  maxReconnectAttempts?: number;
  /**
   * Initial reconnect delay in ms
   */
  reconnectDelay?: number;
  /**
   * Whether to enable verbose logging
   */
  verbose?: boolean;
  /**
   * Whether to auto-reconnect on page visibility change
   */
  autoReconnectOnVisibility?: boolean;
}
