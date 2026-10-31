import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { healthService } from '../services/apiClient';
import { Menu, Bell, User, Search, LogOut } from 'lucide-react';
import Badge from './ui/Badge';

export default function Navbar({ onToggleSidebar, currentRole = 'admin', user = null, onLogout }) {
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

  const roleStyles = {
    admin: 'bg-purple-50 text-purple-700 border-purple-200',
    staff: 'bg-blue-50 text-blue-700 border-blue-200',
    customer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const currentRoleStyle = roleStyles[currentRole?.toLowerCase()] || roleStyles.customer;
  const displayName = user?.full_name || user?.email || 'Authenticated User';

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

        {/* User Profile Pill & Role Badge */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <Link
            to="/profile"
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors group"
            title="View Profile & Settings"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs group-hover:border-indigo-400 group-hover:text-indigo-600 transition-colors">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight max-w-[140px] truncate group-hover:text-indigo-600">
                {displayName}
              </span>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border w-fit ${currentRoleStyle}`}
              >
                {currentRole}
              </span>
            </div>
          </Link>

          {/* Quick Sign Out Action Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
              title="Sign Out of Brightloop"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
