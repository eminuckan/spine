/**
 * Auth Types
 */

/**
 * OAuth Configuration
 */
export interface AuthConfig {
  authority: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  postLogoutRedirectUri?: string;
  scope: string;
}

/**
 * User Info from OAuth provider
 */
export interface UserInfo {
  sub: string;
  name?: string;
  email?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  locale?: string;
  zoneinfo?: string;
  updated_at?: number;
  [key: string]: unknown;
}

/**
 * OAuth State for PKCE flow
 */
export interface OAuthState {
  state: string;
  codeVerifier: string;
  nonce?: string;
  returnUrl?: string;
  createdAt: number;
}

/**
 * Session Data stored in Redis
 */
export interface SessionData {
  userId?: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: number;
  user?: UserInfo;
  lastActivity?: number;
}

/**
 * Session Flash Data for temporary messages
 */
export interface SessionFlashData {
  error: string;
  success: string;
}

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
  success: boolean;
  newAccessToken?: string;
  tokens?: {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: number;
  };
  error?: string;
  shouldLogout?: boolean;
}

/**
 * Route protection levels
 */
export type ProtectionLevel = 
  | 'public' 
  | 'auth' 
  | 'onboarding-required' 
  | 'subscription-required';

/**
 * Protected route loader function type
 */
export type ProtectedLoaderFn<T> = (user?: UserInfo) => Promise<T> | T;
