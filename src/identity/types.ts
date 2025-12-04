/**
 * Identity Types
 */

export interface AddressData {
  addressId: string;
  type: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
  attention?: string | null;
  region?: string | null;
}

export interface TenantMembership {
  tenantId: string;
  organizationName?: string;
  roles?: string[];
}

export interface IdentityContextData {
  hasAnyMembership: boolean;
  hasSubscription: boolean;
  isOnboarded: boolean;
  tenants: string[];
  currentTenant?: string;
  permissions: string[];
  contextVersion: number;
  isLoading: boolean;
  lastUpdated?: Date;
  // User profile fields
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profileImageUrl?: string;
  phoneNumber?: string;
  timeZone?: string;
  addresses?: AddressData[];
  hasOwnerMembership?: boolean;
  memberships?: TenantMembership[];
}

export interface IdentityContextChangedEvent {
  reason: string;
  tenantId?: string;
  triggeredByUserId?: string;
  contextVersion: number;
  timestamp: string;
}

export type IdentityContextChangeHandler = (event: IdentityContextChangedEvent) => void;
