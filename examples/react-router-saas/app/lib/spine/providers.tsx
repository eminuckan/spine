import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  IdentityContextProvider,
  PermissionInitializer,
  TenantProvider,
  createQueryClient,
} from '@eminuckan/spine';
import type { TenantMembership } from '@eminuckan/spine/tenant';

const queryClient = createQueryClient();

export interface SpineClientProvidersProps {
  children: ReactNode;
  tenant: {
    currentTenant: string | null;
    availableTenants: string[];
    memberships: TenantMembership[];
  };
  identity: {
    permissions: string[];
    isLoading?: boolean;
    [key: string]: unknown;
  };
  accessToken?: string | null;
}

export function SpineClientProviders({
  children,
  tenant,
  identity,
  accessToken,
}: SpineClientProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider
        initialTenant={tenant.currentTenant}
        initialTenants={tenant.availableTenants}
        initialMemberships={tenant.memberships}
      >
        <IdentityContextProvider initialContext={identity} accessToken={accessToken}>
          <PermissionInitializer permissions={identity.permissions} isLoading={Boolean(identity.isLoading)}>
            {children}
          </PermissionInitializer>
        </IdentityContextProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}
