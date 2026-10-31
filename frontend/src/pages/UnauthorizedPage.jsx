import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, logout } = useAuth();

  const state = location.state || {};
  const currentRole = state.currentRole || role || 'unassigned';
  const requiredRoles = state.requiredRoles || ['Admin', 'Staff'];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/80">
            HTTP 403 Forbidden
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Access Restricted</h1>
          <p className="text-sm text-slate-600">
            You do not possess the required permissions to access this Brightloop module.
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Your Current Role:</span>
            <span className="font-semibold capitalize text-slate-900 bg-slate-200/70 px-2 py-0.5 rounded">
              {currentRole}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Required Roles:</span>
            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {requiredRoles.join(', ')}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="primary"
            className="flex-1 justify-center"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Return to Overview
          </Button>

          <Button
            variant="outline"
            className="flex-1 justify-center text-slate-700"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            Switch Account
          </Button>
        </div>

        <div className="text-xs text-slate-400">
          Need access? Contact your Brightloop administrator to update your account role.
        </div>
      </div>
    </div>
  );
}
