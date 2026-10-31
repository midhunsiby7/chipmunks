import React, { useState, useEffect } from 'react';
import { healthService } from '../api/client';
import { Activity, Bell, User } from 'lucide-react';

export default function Navbar() {
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', text: 'Checking API...' });

  useEffect(() => {
    let isMounted = true;
    healthService.checkHealth()
      .then((data) => {
        if (isMounted) {
          setBackendHealth({ status: 'healthy', text: `Backend v${data.version} Connected` });
        }
      })
      .catch(() => {
        if (isMounted) {
          setBackendHealth({ status: 'unreachable', text: 'Backend Offline (Mock Mode)' });
        }
      });

    return () => { isMounted = false; };
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
          Brightloop
        </h1>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
          Hackathon Init
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* API Health indicator */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
          <span
            className={`w-2 h-2 rounded-full ${
              backendHealth.status === 'healthy'
                ? 'bg-emerald-500 animate-pulse'
                : backendHealth.status === 'checking'
                ? 'bg-amber-400'
                : 'bg-rose-500'
            }`}
          />
          <span>{backendHealth.text}</span>
        </div>

        {/* User profile placeholder */}
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}
