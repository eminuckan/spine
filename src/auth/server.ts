/**
 * Auth Module - Server-side exports
 * 
 * Bu modül server-side'da kullanılacak auth utilities içerir.
 * React Router loaders/actions içinde kullanılır.
 * 
 * @example
 * ```typescript
 * import { requireAuth, protectRoute, getAccessToken } from '@propmate/core/auth/server';
 * 
 * // Route loader'da
 * export async function loader({ request }: LoaderFunctionArgs) {
 *   return protectRoute(request, 'auth', async (user) => {
 *     // user authenticated
 *     return { user };
 *   });
 * }
 * ```
 */

export * from './auth.server';
export * from './redis-session-storage.server';
export * from './route-protection.server';
export * from './token-refresh.server';
export * from './types';
