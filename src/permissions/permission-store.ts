/**
 * Permission Store (Zustand)
 * 
 * State management for permissions.
 */

import { create } from 'zustand';
import { PermissionChecker } from './permission-service';
import type { PermissionCode } from './types';

/**
 * Permission store state interface
 */
interface PermissionState {
  checker: PermissionChecker;
  permissions: PermissionCode[];
  isLoading: boolean;
  setPermissions: (permissions: PermissionCode[]) => void;
  setLoading: (isLoading: boolean) => void;
  reset: () => void;
}

/**
 * Selectors for selective subscription
 */
export const selectChecker = (state: PermissionState) => state.checker;
export const selectPermissions = (state: PermissionState) => state.permissions;
export const selectIsLoading = (state: PermissionState) => state.isLoading;

/**
 * Initial state
 */
const initialState = {
  checker: new PermissionChecker([]),
  permissions: [] as PermissionCode[],
  isLoading: false,
};

/**
 * Permission store
 */
export const usePermissionStore = create<PermissionState>((set) => ({
  ...initialState,

  setPermissions: (permissions: PermissionCode[]) => {
    set({
      permissions,
      checker: new PermissionChecker(permissions),
    });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  reset: () => {
    set(initialState);
  },
}));

/**
 * Initialize permission store
 */
export function initializePermissions(
  permissions: PermissionCode[],
  isLoading: boolean = false
): void {
  usePermissionStore.getState().setPermissions(permissions);
  usePermissionStore.getState().setLoading(isLoading);
}

/**
 * Get permission checker outside React components
 */
export function getPermissionChecker(): PermissionChecker {
  return usePermissionStore.getState().checker;
}

/**
 * Get all permissions outside React components
 */
export function getPermissions(): PermissionCode[] {
  return usePermissionStore.getState().permissions;
}
