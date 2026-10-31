import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Repeat,
  Receipt,
  FileSpreadsheet,
  Layers,
  Settings,
  Users,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
  { name: 'Invoices', path: '/invoices', icon: Receipt },
  { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet },
  { name: 'Plans & Products', path: '/plans', icon: Layers },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col p-4">
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-800">
        <div className="bg-slate-800/60 rounded-lg p-3 text-xs text-slate-400">
          <p className="font-semibold text-slate-200">Dev Phase 1: Foundation</p>
          <p className="mt-1">Prepared for parallel development across Dev 1, Dev 2 & Dev 3.</p>
        </div>
      </div>
    </aside>
  );
}
