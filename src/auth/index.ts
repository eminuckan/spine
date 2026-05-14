/**
 * Auth Module - Client-side exports
 *
 * Client-side auth types live here.
 * For server-side auth primitives, use `@eminuckan/spine/auth/server`.
 */

// Types
export type {
  UserInfo,
  AuthSessionSummary,
  AuthConfig,
  SessionData,
  OAuthState,
  LoginOptions,
  AuthError,
  ApplicationType,
  BackChannelLogoutResult,
  FrontChannelLogoutResult,
  OidcClientAuthMethod,
} from './types';

// Client-side hooks (if any future hooks are added)
// Currently auth is mostly server-side
