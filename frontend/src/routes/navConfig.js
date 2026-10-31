import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  FileSpreadsheet,
  Repeat,
  Receipt,
  Tag,
  CreditCard,
  BarChart3,
  Settings,
  Percent,
} from 'lucide-react';

/**
 * Centralized navigation configuration for the Brightloop Application Shell.
 * Supports role filtering for Admin, Staff, and Customer users.
 */
export const NAV_ITEMS = [
  {
    id: 'overview',
    name: 'Overview',
    path: '/',
    icon: LayoutDashboard,
    section: 'Main',
    roles: ['admin', 'staff', 'customer'],
    status: 'active',
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions',
    path: '/subscriptions',
    icon: Repeat,
    section: 'Billing',
    roles: ['admin', 'staff', 'customer'],
    status: 'active',
  },
  {
    id: 'invoices',
    name: 'Invoices',
    path: '/invoices',
    icon: Receipt,
    section: 'Billing',
    roles: ['admin', 'staff', 'customer'],
    status: 'active',
  },
  {
    id: 'customers',
    name: 'Users & Customers',
    path: '/customers',
    icon: Users,
    section: 'Operations',
    roles: ['admin', 'staff'],
    status: 'active',
  },
  {
    id: 'products',
    name: 'Products',
    path: '/products',
    icon: Package,
    section: 'Catalog',
    roles: ['admin', 'staff'],
    status: 'active',
  },
  {
    id: 'plans',
    name: 'Subscription Plans',
    path: '/plans',
    icon: Layers,
    section: 'Catalog',
    roles: ['admin', 'staff'],
    status: 'active',
  },
  {
    id: 'taxes',
    name: 'Tax Rules',
    path: '/taxes',
    icon: Percent,
    section: 'System',
    roles: ['admin', 'staff'],
    status: 'active',
  },
  {
    id: 'quotations',
    name: 'Quotations',
    path: '/quotations',
    icon: FileSpreadsheet,
    section: 'Sales',
    roles: ['admin', 'staff'],
    status: 'planned',
    plannedPhase: 'Phase 4',
  },
  {
    id: 'discounts',
    name: 'Discounts',
    path: '/discounts',
    icon: Tag,
    section: 'Sales',
    roles: ['admin', 'staff'],
    status: 'planned',
    plannedPhase: 'Phase 5',
  },
  {
    id: 'payments',
    name: 'Payments',
    path: '/payments',
    icon: CreditCard,
    section: 'Billing',
    roles: ['admin', 'staff', 'customer'],
    status: 'planned',
    plannedPhase: 'Phase 6',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    path: '/analytics',
    icon: BarChart3,
    section: 'Intelligence',
    roles: ['admin', 'staff'],
    status: 'planned',
    plannedPhase: 'Phase 7',
  },
  {
    id: 'settings',
    name: 'Settings',
    path: '/settings',
    icon: Settings,
    section: 'System',
    roles: ['admin'],
    status: 'planned',
    plannedPhase: 'Phase 8',
  },
];

/**
 * Filter navigation items based on the current user role.
 * Defaults to all items if no role is supplied.
 */
export function getNavItemsForRole(role = 'admin') {
  if (!role) return NAV_ITEMS;
  return NAV_ITEMS.filter((item) => item.roles.includes(role.toLowerCase()));
}
