import { UserRole } from '@/lib/firebase/users';

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];  // If not specified, available to all roles
  children?: NavItem[];  // For dropdown menus
}

export interface BreadcrumbItem {
  label: string;
  href?: string;  // Optional for current page
}

export interface TabItem {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
} 