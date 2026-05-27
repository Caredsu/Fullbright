import { useMemo } from 'react';

/**
 * Custom hook for role-based access control
 * Provides functions to check user permissions based on role
 */
export function useAuth() {
  const user = useMemo(() => {
    try {
      const userStr = localStorage.getItem('adminUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
      return null;
    }
  }, []);

  return useMemo(() => ({
    user,
    isAdmin: () => user?.role === 'admin',
    isSuperAdmin: () => user?.role === 'super_admin',
    
    // Permission checks
    canDelete: () => user?.role === 'super_admin',
    canAccessUsers: () => user?.role === 'super_admin',
    canAccessSettings: () => user?.role === 'super_admin',
    canEdit: () => !!user,
    
    // Advanced checks
    canManageAdmins: () => user?.role === 'super_admin',
    isSuperAdminOrMatchesId: (userId) => user?.role === 'super_admin' || user?.id === userId,
    hasPermission: (requiredRole) => {
      if (user?.role === 'super_admin') return true;
      return user?.role === requiredRole;
    }
  }), [user]);
}
