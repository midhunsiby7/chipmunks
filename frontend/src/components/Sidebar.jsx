import React from 'react';
import { NavLink } from 'react-router-dom';
import { getNavItemsForRole } from '../routes/navConfig';
import { X } from 'lucide-react';

export default function Sidebar({ isOpen, onClose, currentRole = 'admin' }) {
  const normalizedRole = currentRole ? String(currentRole).toLowerCase() : 'customer';
  // Filter items by current role and apply customer portal mapping
  const allowedItems = getNavItemsForRole(normalizedRole);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-slate-950 text-slate-300 border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar navigation"
      >
        {/* Mobile Header Close */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/60 lg:hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Navigation</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024 && onClose) {
                    onClose();
                  }
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.name}</span>
                </div>

                {item.status === 'planned' && (
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0">
                    {item.plannedPhase || 'Soon'}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer / Dynamic Role Context Notice */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50">
          <div className="rounded-lg p-2.5 text-xs text-slate-400 bg-slate-800/50 border border-slate-700/40">
            <div className="flex items-center justify-between font-semibold text-slate-200">
              <span className="capitalize">{normalizedRole} Portal</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">Phase 2 RBAC</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 leading-tight">
              {normalizedRole === 'admin'
                ? 'Full administrative privileges across all catalog, billing, and settings modules.'
                : normalizedRole === 'staff'
                ? 'Operational staff privileges for customer and subscription management.'
                : 'Customer self-service portal for subscriptions, quotations, and invoices.'}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
