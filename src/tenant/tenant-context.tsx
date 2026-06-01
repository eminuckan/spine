/**
 * Tenant Context Provider
 * 
 * React context for tenant management.
 */

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { getTenantCookieName, useTenantStore } from './tenant-store';
import type { OrganizationData, TenantContextType, TenantData, TenantMembership } from './types';

const TenantContext = createContext<TenantContextType | null>(null);

interface TenantProviderProps {
  children: ReactNode;
  initialTenant?: string | null;
  initialTenants?: string[];
  initialMemberships?: TenantMembership[];
  onTenantChange?: () => void;
}

export function TenantProvider({
  children,
  initialTenant = null,
  initialTenants = [],
  initialMemberships = [],
  onTenantChange,
}: TenantProviderProps) {
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const availableTenants = useTenantStore((state) => state.availableTenants);
  const memberships = useTenantStore((state) => state.memberships);
  const tenantData = useTenantStore((state) => state.tenantData);
  const organizations = useTenantStore((state) => state.organizations);
  const isLoading = useTenantStore((state) => state.isLoading || state.isSwitching);
  const currentTenantData = useTenantStore((state) => state.getCurrentTenantData());
  const currentMembership = useTenantStore((state) => state.getCurrentMembership());

  const setCurrentTenant = useTenantStore((state) => state.setCurrentTenant);
  const setAvailableTenants = useTenantStore((state) => state.setAvailableTenants);
  const setMemberships = useTenantStore((state) => state.setMemberships);
  const switchTenantAction = useTenantStore((state) => state.switchTenant);
  const fetchTenantData = useTenantStore((state) => state.fetchTenantData);
  const getTenantData = useTenantStore((state) => state.getTenantData);
  const getOrganization = useTenantStore((state) => state.getOrganization);
  const getMembership = useTenantStore((state) => state.getMembership);
  const getTenantName = useTenantStore((state) => state.getTenantName);

  // Initialize store with initial values
  useEffect(() => {
    if (initialTenant) {
      setCurrentTenant(initialTenant);
    }
    if (initialTenants.length > 0) {
      setAvailableTenants(initialTenants);
    }
    if (initialMemberships.length > 0) {
      setMemberships(initialMemberships);
    }
  }, [
    initialTenant,
    initialTenants.join(','),
    initialMemberships.map((membership) => membership.tenantId).join(','),
    setCurrentTenant,
    setAvailableTenants,
    setMemberships,
  ]);

  // Read tenant from cookie (client-side)
  useEffect(() => {
    const getCookieTenant = () => {
      const cookies = document.cookie.split(';');
      const cookieName = getTenantCookieName();
      const tenantCookie = cookies.find((cookie) =>
        cookie.trim().startsWith(`${cookieName}=`)
      );

      if (tenantCookie) {
        const value = tenantCookie.split('=')[1];
        return decodeURIComponent(value);
      }

      return null;
    };

    if (!currentTenant) {
      const cookieTenant = getCookieTenant();
      if (cookieTenant && availableTenants.includes(cookieTenant)) {
        setCurrentTenant(cookieTenant);
      }
    }
  }, [currentTenant, availableTenants, setCurrentTenant]);

  // Switch tenant handler
  const switchTenant = (tenantId: string) => {
    switchTenantAction(tenantId).then(() => {
      if (onTenantChange) {
        onTenantChange();
      }
    });
  };

  // Refresh tenants (handled by identity context)
  const refreshTenants = () => {
    console.log('Tenant refresh requested - should be handled by identity context');
  };

  // Refresh tenant data
  const refreshTenantData = () => {
    if (currentTenant) {
      fetchTenantData(currentTenant);
    }
  };

  const refreshOrganization = refreshTenantData;

  // Load tenant data when tenant is set
  useEffect(() => {
    if (currentTenant && !currentTenantData) {
      refreshTenantData();
    }
  }, [currentTenant, currentTenantData]);

  const currentOrganization = currentTenantData as OrganizationData | null;

  const value: TenantContextType = {
    currentTenant,
    availableTenants,
    memberships,
    currentTenantData,
    tenantData,
    currentMembership,
    isLoading,
    switchTenant,
    refreshTenants,
    refreshTenantData,
    getTenantData,
    getMembership,
    getTenantName,
    currentOrganization,
    organizations,
    refreshOrganization,
    getOrganization,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook for using tenant context
 */
export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }

  return context;
}

/**
 * Hook for current tenant only
 */
export function useCurrentTenant(): string | null {
  const { currentTenant } = useTenant();
  return currentTenant;
}

/**
 * Hook for tenant switching
 */
export function useTenantSwitcher() {
  const { switchTenant, isLoading, availableTenants } = useTenant();
  return { switchTenant, isLoading, availableTenants };
}

/**
 * Hook for current tenant data
 */
export function useCurrentTenantData(): TenantData | null {
  const { currentTenantData } = useTenant();
  return currentTenantData;
}

/**
 * Hook for tenant data operations
 */
export function useTenantData() {
  const { currentTenantData, refreshTenantData, isLoading } = useTenant();

  return {
    tenantData: currentTenantData,
    refreshTenantData,
    isLoading,
  };
}

/**
 * Hook for current organization
 *
 * @deprecated Use useCurrentTenantData instead.
 */
export function useCurrentOrganization(): OrganizationData | null {
  const { currentOrganization } = useTenant();
  return currentOrganization;
}

/**
 * Hook for organization operations
 *
 * @deprecated Use useTenantData instead.
 */
export function useOrganization() {
  const { currentOrganization, refreshOrganization, isLoading } = useTenant();

  return {
    organization: currentOrganization,
    refreshOrganization,
    isLoading,
  };
}
