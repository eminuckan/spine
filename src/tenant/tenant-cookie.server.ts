/**
 * Tenant Cookie Server Module
 * 
 * Cookie-based tenant storage.
 */

const TENANT_COOKIE_NAME = '__active-org';
const TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Get active tenant from cookie
 */
export async function getActiveTenant(request: Request): Promise<string | null> {
  const cookies = request.headers.get('Cookie');
  if (!cookies) return null;

  const match = cookies.match(new RegExp(`${TENANT_COOKIE_NAME}=([^;]+)`));
  if (!match) return null;

  return decodeURIComponent(match[1]);
}

/**
 * Set active tenant cookie value
 */
export async function setActiveTenant(tenantId: string): Promise<string> {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${TENANT_COOKIE_NAME}=${encodeURIComponent(tenantId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TENANT_COOKIE_MAX_AGE}${secure}`;
}

/**
 * Clear active tenant cookie value
 */
export async function clearActiveTenant(): Promise<string> {
  return `${TENANT_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/**
 * Configure tenant cookie name
 */
export function configureTenantCookie(name: string): void {
  // Note: This would require making TENANT_COOKIE_NAME mutable
  // For now, this is a no-op placeholder
  console.log('Tenant cookie name configuration:', name);
}
