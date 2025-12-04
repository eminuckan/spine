/**
 * OAuth2/OIDC Authentication Server Module
 * 
 * Bu modül OAuth2/OIDC authentication flow'unu yönetir:
 * - Login flow (PKCE)
 * - Token exchange
 * - Token refresh
 * - Logout
 * - Session management
 */

import * as oauth from 'oauth4webapi';
import { redirect } from 'react-router';

import {
  createAuthSession,
  getAuthSession,
  updateAuthSession,
  destroyAuthSession,
  isSessionValid,
  createOAuthState,
  getOAuthState,
  deleteOAuthState,
} from './redis-session-storage.server';
import type { 
  AuthConfig, 
  UserInfo, 
  SessionData, 
  OAuthState,
  TokenRefreshResult 
} from './types';
import { logger } from '../logging';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Create OAuth configuration from environment variables
 */
function createAuthConfig(): AuthConfig {
  const requiredEnvVars = {
    authority: process.env.OIDC_AUTHORITY,
    clientId: process.env.OIDC_CLIENT_ID,
    redirectUri: process.env.OIDC_REDIRECT_URI,
  };

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      throw new Error(`Missing required environment variable: OIDC_${key.toUpperCase()}`);
    }
  }

  return {
    authority: requiredEnvVars.authority!,
    clientId: requiredEnvVars.clientId!,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    redirectUri: requiredEnvVars.redirectUri!,
    scope: process.env.OIDC_SCOPE || 'openid offline_access api',
    postLogoutRedirectUri: process.env.OIDC_POST_LOGOUT_REDIRECT_URI,
  };
}

let OIDC_CONFIG: AuthConfig | null = null;

function getAuthConfig(): AuthConfig {
  if (!OIDC_CONFIG) {
    OIDC_CONFIG = createAuthConfig();
  }
  return OIDC_CONFIG;
}

// ============================================================================
// OAuth Discovery Cache
// ============================================================================

let authServerCache: {
  authorizationServer: oauth.AuthorizationServer;
  client: oauth.Client;
  cachedAt: number;
} | null = null;

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get OAuth configuration with caching
 */
async function getOAuthConfig(): Promise<{
  authorizationServer: oauth.AuthorizationServer;
  client: oauth.Client;
}> {
  const config = getAuthConfig();
  const now = Date.now();

  if (authServerCache && now - authServerCache.cachedAt < CACHE_TTL) {
    return {
      authorizationServer: authServerCache.authorizationServer,
      client: authServerCache.client,
    };
  }

  try {
    const issuer = new URL(config.authority);
    const discoveryResponse = await oauth.discoveryRequest(issuer, {
      algorithm: 'oidc',
    });

    if (!discoveryResponse.ok) {
      const errorText = await discoveryResponse.text().catch(() => 'Unable to read response');
      logger.error('OAuth discovery error', undefined, { errorText });
      throw new Error(`OAuth discovery failed with status ${discoveryResponse.status}`);
    }

    const authorizationServer = await oauth.processDiscoveryResponse(issuer, discoveryResponse);

    const client: oauth.Client = {
      client_id: config.clientId,
    };

    authServerCache = {
      authorizationServer,
      client,
      cachedAt: now,
    };

    logger.info('OAuth discovery completed successfully');
    return { authorizationServer, client };
  } catch (error) {
    logger.error('OAuth discovery failed', error instanceof Error ? error : undefined);
    throw new Error(`OAuth discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get client authentication method (None for public client with PKCE)
 */
function getClientAuth(): oauth.ClientAuth {
  return oauth.None();
}

// ============================================================================
// Claim Extraction
// ============================================================================

/**
 * Parse JSON safely
 */
function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Convert value to string array
 */
function toStringArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : `${item}`.trim()))
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
      const parsed = parseJson(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item.trim() : `${item}`.trim()))
          .filter((item) => item.length > 0);
      }
    }

    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    return [trimmed];
  }

  return [];
}

/**
 * Extract user info from ID token claims
 */
export function extractUserInfo(claims: Record<string, unknown>): {
  tenants: string[];
  currentTenant?: string;
  isOnboarded: boolean;
  tenantRoles: Record<string, string[]>;
  permissions: string[];
} {
  // Extract tenant_ids
  let tenants: string[] = [];
  if ('tenant_ids' in claims) {
    const rawTenantIds = claims['tenant_ids'];
    if (typeof rawTenantIds === 'string' && rawTenantIds.trim().startsWith('[')) {
      const parsed = parseJson(rawTenantIds.trim());
      if (Array.isArray(parsed)) {
        tenants = parsed
          .map((id) => (typeof id === 'string' ? id.trim() : `${id}`.trim()))
          .filter((id) => id.length > 0);
      }
    } else {
      tenants = toStringArray(rawTenantIds);
    }
  }

  // Extract tenant_roles
  const tenantRoles: Record<string, string[]> = {};
  if ('tenant_roles' in claims) {
    const rawRoles = claims['tenant_roles'];
    let parsedRoles: unknown = rawRoles;

    if (typeof rawRoles === 'string' && rawRoles.trim().startsWith('{')) {
      parsedRoles = parseJson(rawRoles.trim()) ?? rawRoles;
    }

    if (parsedRoles && typeof parsedRoles === 'object' && !Array.isArray(parsedRoles)) {
      for (const [tenantId, roleValue] of Object.entries(parsedRoles as Record<string, unknown>)) {
        const roleIds = toStringArray(roleValue);
        if (roleIds.length > 0) {
          tenantRoles[tenantId] = roleIds;
        }
      }
    }
  }

  // Extract permissions
  const permissions = 'app_perms' in claims ? toStringArray(claims['app_perms']) : [];

  // Extract onboarding status
  const isOnboarded = claims.is_onboarded === true || claims.is_onboarded === 'true';

  return { tenants, isOnboarded, tenantRoles, permissions };
}

// ============================================================================
// Session Data Creation
// ============================================================================

/**
 * Create session data from token result
 */
async function createSessionData(
  tokenResult: oauth.TokenEndpointResponse,
  claims: Record<string, unknown>
): Promise<Partial<SessionData>> {
  const baseUser: UserInfo = {
    sub: (claims.sub as string) || 'unknown',
    name: (claims.name as string) || (claims.email as string) || 'User',
    email: (claims.email as string) || undefined,
    givenName: (claims.given_name as string) || (claims.givenName as string),
    familyName: (claims.family_name as string) || (claims.familyName as string),
    picture: claims.picture as string,
    locale: claims.locale as string,
    zoneinfo: claims.zoneinfo as string,
    updated_at: claims.updated_at as number,
  };

  const expiresAt = tokenResult.expires_in
    ? Date.now() + tokenResult.expires_in * 1000
    : undefined;

  return {
    userId: baseUser.sub,
    accessToken: tokenResult.access_token,
    refreshToken: tokenResult.refresh_token,
    idToken: tokenResult.id_token,
    expiresAt,
    user: baseUser,
    lastActivity: Date.now(),
  };
}

// ============================================================================
// Auth Functions
// ============================================================================

/**
 * Initiate OAuth login flow
 */
export async function login(request: Request, returnUrl?: string): Promise<Response> {
  try {
    const config = getAuthConfig();
    const { authorizationServer, client } = await getOAuthConfig();

    // Generate PKCE challenge
    const codeVerifier = oauth.generateRandomCodeVerifier();
    const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);

    // Generate secure state and nonce
    const state = oauth.generateRandomState();
    const nonce = oauth.generateRandomNonce();

    // Create OAuth state object
    const oauthState: OAuthState = {
      state,
      codeVerifier,
      nonce,
      returnUrl,
      createdAt: Date.now(),
    };

    logger.info('Creating OAuth state', { returnUrl });

    // Store OAuth state in Redis
    const stateId = await createOAuthState(oauthState);

    // Build authorization URL
    const authorizationUrl = new URL(authorizationServer.authorization_endpoint!);
    authorizationUrl.searchParams.set('client_id', client.client_id);
    authorizationUrl.searchParams.set('redirect_uri', config.redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', config.scope);
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');
    authorizationUrl.searchParams.set('nonce', nonce);

    // Store stateId in cookie for callback
    const headers = new Headers();
    headers.append('Set-Cookie', `oauth_state_id=${stateId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

    logger.info('OAuth authorization flow initiated', { state, stateId });
    return redirect(authorizationUrl.toString(), { headers });
  } catch (error) {
    logger.error('Failed to initiate OAuth login', error instanceof Error ? error : undefined);
    throw new Error('Login failed');
  }
}

/**
 * Handle OAuth callback
 */
export async function handleCallback(request: Request): Promise<Response> {
  try {
    const config = getAuthConfig();
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      logger.error('OAuth callback error', undefined, { error });
      throw new Error(`OAuth error: ${error}`);
    }

    // Validate required parameters
    if (!code || !state) {
      throw new Error('Missing required callback parameters');
    }

    // Get stateId from cookie
    const cookies = request.headers.get('Cookie');
    const cookieMatch = cookies?.match(/oauth_state_id=([^;]+)/);
    const stateId = cookieMatch?.[1];

    if (!stateId) {
      throw new Error('OAuth state ID not found in cookie');
    }

    // Retrieve OAuth state from Redis
    const oauthState = await getOAuthState(stateId);

    if (!oauthState) {
      throw new Error('No OAuth state found - state may have expired');
    }

    if (oauthState.state !== state) {
      throw new Error(`OAuth state mismatch`);
    }

    // Check state age (10 minutes max)
    const stateAge = Date.now() - oauthState.createdAt;
    if (stateAge > 10 * 60 * 1000) {
      throw new Error('OAuth state expired');
    }

    const { authorizationServer, client } = await getOAuthConfig();
    const clientAuth = getClientAuth();

    logger.info('Initiating token exchange');

    // Validate authorization response
    const currentUrl = new URL(request.url);
    const callbackParameters = oauth.validateAuthResponse(
      authorizationServer,
      client,
      currentUrl,
      oauthState.state
    );

    // Exchange authorization code for tokens
    const tokenEndpointResponse = await oauth.authorizationCodeGrantRequest(
      authorizationServer,
      client,
      clientAuth,
      callbackParameters,
      config.redirectUri,
      oauthState.codeVerifier
    );

    if (!tokenEndpointResponse.ok) {
      const errorText = await tokenEndpointResponse.text().catch(() => 'Unable to read response');
      logger.error('Token endpoint error', undefined, { errorText });
      throw new Error('Token exchange failed');
    }

    // Process token response
    const tokenResult = await oauth.processAuthorizationCodeResponse(
      authorizationServer,
      client,
      tokenEndpointResponse,
      { expectedNonce: oauthState.nonce }
    );

    logger.info('Token exchange completed successfully');

    // Extract claims from ID token
    let claims: Record<string, unknown> = {};
    if (tokenResult.id_token) {
      try {
        const payload = tokenResult.id_token.split('.')[1];
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        claims = JSON.parse(new TextDecoder('utf-8').decode(bytes));
      } catch (decodeError) {
        logger.error('Failed to decode ID token', decodeError instanceof Error ? decodeError : undefined);
        throw new Error('Invalid ID token received');
      }
    }

    // Create session data
    const newSessionData = await createSessionData(tokenResult, claims);

    // Create new session
    const sessionHeaders = await createAuthSession(request, newSessionData);

    // Clean up OAuth state from Redis
    await deleteOAuthState(stateId);

    // Combine headers and clear OAuth state cookie
    const headers = new Headers(sessionHeaders);
    headers.append('Set-Cookie', 'oauth_state_id=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

    logger.info('OAuth callback processed successfully');

    // Redirect to return URL or default location
    const redirectUrl = oauthState.returnUrl || '/';
    return redirect(redirectUrl, { headers });
  } catch (error) {
    logger.error('OAuth callback failed', error instanceof Error ? error : undefined);

    // Try to clean up OAuth state on error
    try {
      const cookies = request.headers.get('Cookie');
      const cookieMatch = cookies?.match(/oauth_state_id=([^;]+)/);
      const stateId = cookieMatch?.[1];
      if (stateId) {
        await deleteOAuthState(stateId);
      }
    } catch {
      // Ignore cleanup errors
    }

    await destroyAuthSession(request);
    throw new Error('Authentication failed');
  }
}

/**
 * Logout user
 */
export async function logout(request: Request): Promise<Response> {
  try {
    const config = getAuthConfig();
    logger.info('Logout initiated');
    
    const sessionData = await getAuthSession(request);
    const idToken = sessionData.idToken;

    const url = new URL(request.url);
    const returnUrl = url.searchParams.get('returnUrl');

    // Destroy session
    const sessionHeaders = await destroyAuthSession(request);
    const headers = new Headers(sessionHeaders);

    // Store returnUrl in cookie if provided
    if (returnUrl) {
      headers.append(
        'Set-Cookie',
        `logout_return_url=${encodeURIComponent(returnUrl)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300`
      );
    }

    // Redirect to OAuth end_session_endpoint if available
    if (idToken) {
      try {
        const { authorizationServer } = await getOAuthConfig();
        if (authorizationServer.end_session_endpoint) {
          const endSessionUrl = new URL(authorizationServer.end_session_endpoint);
          endSessionUrl.searchParams.set('id_token_hint', idToken);
          logger.info('Redirecting to OAuth end_session');
          return redirect(endSessionUrl.toString(), { headers });
        }
      } catch {
        // Ignore OAuth logout errors
      }
    }

    // Fallback redirect
    const baseUrl = new URL(request.url).origin;
    const registeredPath = config.postLogoutRedirectUri || '/';
    const finalRedirectUrl = registeredPath.startsWith('http') 
      ? registeredPath 
      : `${baseUrl}${registeredPath}`;

    logger.info('Logout completed', { redirectUrl: finalRedirectUrl });
    return redirect(finalRedirectUrl, { headers });
  } catch (error) {
    logger.error('Logout failed', error instanceof Error ? error : undefined);
    const headers = await destroyAuthSession(request);
    return redirect('/', { headers });
  }
}

/**
 * Get current user from session
 */
export async function getUser(request: Request): Promise<UserInfo | null> {
  try {
    const sessionData = await getAuthSession(request);
    return sessionData.user || null;
  } catch (error) {
    logger.error('Failed to get user', error instanceof Error ? error : undefined);
    return null;
  }
}

/**
 * Require authenticated user (throws redirect to login if not authenticated)
 */
export async function requireAuth(request: Request): Promise<UserInfo> {
  const user = await getUser(request);

  if (!user) {
    const url = new URL(request.url);
    const returnUrl = `${url.pathname}${url.search}`;
    logger.info('No user found, starting OAuth flow', { returnUrl });
    throw await login(request, returnUrl);
  }

  return user;
}

/**
 * Get access token from session
 */
export async function getAccessToken(request: Request): Promise<string | null> {
  try {
    const sessionData = await getAuthSession(request);
    return sessionData.accessToken || null;
  } catch (error) {
    logger.error('Failed to get access token', error instanceof Error ? error : undefined);
    return null;
  }
}

/**
 * Refresh tokens
 */
export async function refreshTokens(
  request: Request,
  refreshToken?: string
): Promise<TokenRefreshResult> {
  try {
    const sessionData = await getAuthSession(request);
    const tokenToRefresh = refreshToken || sessionData.refreshToken;

    if (!tokenToRefresh) {
      logger.warn('No refresh token available');
      return { success: false, error: 'No refresh token available', shouldLogout: true };
    }

    const { authorizationServer, client } = await getOAuthConfig();
    const clientAuth = getClientAuth();

    logger.info('Initiating token refresh');

    const refreshResponse = await oauth.refreshTokenGrantRequest(
      authorizationServer,
      client,
      clientAuth,
      tokenToRefresh
    );

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text().catch(() => 'Unknown error');
      logger.error('Token refresh failed', undefined, { status: refreshResponse.status, errorText });

      let errorData: Record<string, unknown> = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Ignore parse errors
      }

      const shouldLogout =
        refreshResponse.status === 400 ||
        errorData.error === 'invalid_grant' ||
        errorData.error === 'invalid_token' ||
        refreshResponse.status === 401;

      return {
        success: false,
        error: `Token refresh failed: ${errorData.error_description || errorData.error || 'Unknown'}`,
        shouldLogout,
      };
    }

    const refreshResult = await oauth.processRefreshTokenResponse(
      authorizationServer,
      client,
      refreshResponse
    );

    logger.info('Token refresh successful');

    const newRefreshToken = refreshResult.refresh_token || tokenToRefresh;
    const expiresAt = refreshResult.expires_in
      ? Date.now() + refreshResult.expires_in * 1000
      : sessionData.expiresAt;

    // Update session
    await updateAuthSession(request, {
      accessToken: refreshResult.access_token,
      refreshToken: newRefreshToken,
      idToken: refreshResult.id_token,
      expiresAt,
      lastActivity: Date.now(),
    });

    return {
      success: true,
      tokens: {
        access_token: refreshResult.access_token,
        refresh_token: newRefreshToken,
        id_token: refreshResult.id_token,
        expires_in: refreshResult.expires_in,
      },
    };
  } catch (error) {
    logger.error('Token refresh failed with exception', error instanceof Error ? error : undefined);

    const shouldLogout =
      error instanceof Error &&
      (error.message.includes('invalid_grant') ||
        error.message.includes('invalid_token') ||
        error.message.includes('unauthorized'));

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed',
      shouldLogout,
    };
  }
}

// Re-export session validation
export { isSessionValid };

/**
 * Clear auth server cache (useful for testing)
 */
export function clearAuthServerCache(): void {
  authServerCache = null;
}
