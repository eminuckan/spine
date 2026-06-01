/**
 * Tenant Types
 */

export interface TenantInfo {
  id: string;
  name?: string;
  role?: string;
}

export interface TenantMembership {
  tenantId: string;
  tenantName?: string;
  tenantSlug?: string | null;
  organizationName?: string;
  role?: string;
  roles?: string[];
  ownerUserId?: string | null;
  isOwner?: boolean;
  [key: string]: unknown;
}

export interface TenantBranding {
  logoUrl?: string | null;
  themePrimary?: string | null;
  themeMode?: string | null;
  emailBranding?: string | null;
}

export interface TenantData {
  id?: string;
  tenantId?: string;
  organizationId?: string;
  name?: string;
  slug?: string | null;
  timeZone?: string | null;
  currency?: string | null;
  branding?: TenantBranding | null;
  ownerUserId?: string | null;
  ownerAssignedAtUtc?: string | null;
  defaultOperatingAccountId?: string | null;
  [key: string]: unknown;
}

/** @deprecated Use TenantBranding instead. */
export type OrganizationBranding = TenantBranding;

/** @deprecated Use TenantData instead. */
export type OrganizationData = TenantData & {
  organizationId: string;
  name: string;
  branding?: OrganizationBranding | null;
};

export interface TenantContextType {
  currentTenant: string | null;
  availableTenants: string[];
  memberships: Map<string, TenantMembership>;
  currentTenantData: TenantData | null;
  tenantData: Map<string, TenantData>;
  currentMembership: TenantMembership | null;
  isLoading: boolean;
  switchTenant: (tenantId: string) => void;
  refreshTenants: () => void;
  refreshTenantData: () => void;
  getTenantData: (tenantId: string) => TenantData | null;
  getMembership: (tenantId: string) => TenantMembership | null;
  getTenantName: (tenantId: string) => string;
  /** @deprecated Use currentTenantData instead. */
  currentOrganization: OrganizationData | null;
  /** @deprecated Use tenantData instead. */
  organizations: Map<string, OrganizationData>;
  /** @deprecated Use refreshTenantData instead. */
  refreshOrganization: () => void;
  /** @deprecated Use getTenantData instead. */
  getOrganization: (tenantId: string) => OrganizationData | null;
}
