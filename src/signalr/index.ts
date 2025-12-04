/**
 * SignalR Module
 * 
 * Real-time communication via SignalR.
 */

// Types
export type {
  IdentityContextChangedEvent,
  IdentityContextChangeHandler,
  SignalREventHandler,
  SignalRConnectionState,
  SignalRClientConfig,
} from './types';

// Client
export {
  SignalRClient,
  IdentitySignalRClient,
  createIdentitySignalRClient,
  getIdentitySignalRClient,
  initializeSignalR,
  cleanupSignalR,
} from './signalr-client';
