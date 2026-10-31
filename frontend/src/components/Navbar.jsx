import React, { useState, useEffect } from 'react';
import { healthService } from '../services/apiClient';
import { Menu, Bell, User, Search } from 'lucide-react';
import Badge from './ui/Badge';

export default function Navbar({ onToggleSidebar, currentRole = 'admin' }) {
  const [backendHealth, setBackendHealth] = useState({
    status: 'checking',
    text: 'Checking API...',
  });

  useEffect(() => {
    let isMounted = true;
    healthService
      .checkHealth()
      .then((data) => {
        if (isMounted) {
          setBackendHealth({
            status: 'healthy',
            text: `Backend v${data.version || '0.1.0'} Connected`,
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setBackendHealth({
            status: 'unreachable',
            text: 'Backend Offline (Mock Preview)',
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-2xs">
      {/* Left side: Brand & Mobile Menu Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            B
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight hidden sm:inline">
            Brightloop
          </span>
        </div>

        <Badge variant="primary" size="sm" className="hidden md:inline-flex ml-1">
          Odoo x Make-A-Ton 9.0
        </Badge>
      </div>

      {/* Middle: Global Search Placeholder */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" aria-hidden="true" />
          </div>
          <input
            type="text"
            readOnly
            placeholder="Quick search subscriptions, customers, invoices... (Ctrl + K)"
            className="w-full text-xs rounded-lg bg-slate-50 border border-slate-200 pl-9 pr-3 py-1.5 text-slate-600 cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
          />
        </div>
      </div>

      {/* Right side: Health Status, Notifications, and Profile */}
      <div className="flex items-center gap-3">
        {/* Backend Health Badge */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              backendHealth.status === 'healthy'
                ? 'bg-emerald-500 animate-pulse'
                : backendHealth.status === 'checking'
                ? 'bg-amber-400 animate-ping'
                : 'bg-rose-500'
            }`}
            aria-hidden="true"
          />
          <span className="truncate max-w-[150px]">{backendHealth.text}</span>
        </div>

        {/* Notifications Icon Button */}
        <button
          type="button"
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full" />
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 leading-tight">Admin User</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider capitalize">
              {currentRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
