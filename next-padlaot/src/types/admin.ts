export type UserRole = 'user' | 'admin' | 'super admin';

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  playerId?: string;
}

export interface AdminContextType {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminUser: AdminUser | null;
  loading: boolean;
  error: string | null;
} 