import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { formatDateTime, getRoleBadgeConfig } from '../utils/formatters';
import {
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  ShieldCheck,
  KeyRound,
  Check,
  Copy,
  Receipt,
  Repeat,
  CreditCard,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [profile, setProfile] = useState(authUser || null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Password reset state
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    let isMounted = true;
    userService
      .getCurrentUserProfile()
      .then((data) => {
        if (isMounted && data) {
          setProfile(data);
        }
      })
      .catch((err) => {
        console.warn('[Brightloop Profile] Could not fetch fresh profile from API:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyId = () => {
    if (!profile?.id) return;
    navigator.clipboard?.writeText(String(profile.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendPasswordReset = async () => {
    if (!profile?.email) return;
    setResetLoading(true);
    setResetSuccess('');
    setResetError('');

    try {
      await authService.sendPasswordReset(profile.email);
      setResetSuccess(
        `A secure password reset link has been dispatched to ${profile.email}. Please check your inbox and follow instructions.`
      );
    } catch (err) {
      setResetError(err?.message || 'Failed to dispatch password reset email. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="py-16 text-center">
        <LoadingIndicator message="Loading verified account profile..." />
      </div>
    );
  }

  const roleConfig = getRoleBadgeConfig(profile?.role);
  const isCustomer = (profile?.role || '').toLowerCase() === 'customer';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. TOP HEADER & IDENTITY HERO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2.5">
            <User className="w-6 h-6 text-indigo-600" />
            <span>{isCustomer ? 'My Account & Profile' : 'User Profile'}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Authoritative identity details, role authorization, and security credentials.
          </p>
        </div>
      </div>

      {/* 2. PROFILE HERO CARD */}
      <Card className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shrink-0">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {profile?.full_name || 'Subscriber Account'}
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${roleConfig.className}`}
                >
                  {roleConfig.label}
                </span>
                {profile?.is_active && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Active Account
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200">{profile?.email}</p>
              {profile?.company_name && (
                <p className="text-xs text-slate-400 font-medium">
                  {profile.company_name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-colors"
              title="Copy account UUID"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-sans">Copied ID</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>ID: {profile?.id ? String(profile.id).slice(0, 8) + '...' : '—'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Card>

      {/* 3. PROFILE ATTRIBUTES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Organization Information */}
        <Card className="p-5 space-y-4 border border-slate-200">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 text-slate-800">
            <Building className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Profile & Contact Attributes
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Full Legal Name:
              </span>
              <span className="font-semibold text-slate-900">{profile?.full_name || '—'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Primary Email:
              </span>
              <span className="font-semibold text-slate-900">{profile?.email || '—'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Phone Number:
              </span>
              <span className="font-semibold text-slate-900">{profile?.phone_number || 'Not provided'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Company / Organization:
              </span>
              <span className="font-semibold text-slate-900">{profile?.company_name || 'Personal Account'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Member Since:
              </span>
              <span className="font-medium text-slate-700">{formatDateTime(profile?.created_at)}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Last Profile Synchronization:
              </span>
              <span className="font-medium text-slate-700">{formatDateTime(profile?.updated_at)}</span>
            </div>
          </div>
        </Card>

        {/* Security & Password Management */}
        <Card className="p-5 space-y-4 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 text-slate-800">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Authentication & Security
              </h3>
            </div>

            <div className="space-y-3 mt-3 text-xs text-slate-600">
              <p>
                Your login credentials and account passwords are encrypted and managed through <strong>Firebase Authentication</strong>.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-semibold text-slate-700 block">Password Reset Policy:</span>
                <p className="text-[11px] text-slate-500">
                  You can request an encrypted password reset link sent to your registered email address ({profile?.email}) at any time.
                </p>
              </div>

              {resetSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-2 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              {resetError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendPasswordReset}
              disabled={resetLoading}
              className="w-full text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1.5" />
              {resetLoading ? 'Dispatching Reset Link...' : 'Send Password Reset Email'}
            </Button>
          </div>
        </Card>
      </div>

      {/* 4. CUSTOMER PORTAL SHORTCUTS */}
      {isCustomer && (
        <Card className="p-5 border border-slate-200 space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 text-slate-800">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Quick Customer Portal Navigation
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => navigate('/subscriptions')}
              className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl text-left transition-colors group"
            >
              <Repeat className="w-4 h-4 text-indigo-600 mb-1 group-hover:scale-105 transition-transform" />
              <span className="font-bold text-xs text-slate-800 block">My Subscriptions</span>
              <span className="text-[10px] text-slate-400">Contracts & Cadence</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl text-left transition-colors group"
            >
              <Receipt className="w-4 h-4 text-indigo-600 mb-1 group-hover:scale-105 transition-transform" />
              <span className="font-bold text-xs text-slate-800 block">My Invoices</span>
              <span className="text-[10px] text-slate-400">Statements & Pay Online</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/payments')}
              className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl text-left transition-colors group"
            >
              <CreditCard className="w-4 h-4 text-indigo-600 mb-1 group-hover:scale-105 transition-transform" />
              <span className="font-bold text-xs text-slate-800 block">My Payments</span>
              <span className="text-[10px] text-slate-400">Receipts & Razorpay</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/quotations')}
              className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl text-left transition-colors group"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600 mb-1 group-hover:scale-105 transition-transform" />
              <span className="font-bold text-xs text-slate-800 block">My Quotations</span>
              <span className="text-[10px] text-slate-400">Proposals & Approvals</span>
            </button>
          </div>
        </Card>
      )}

      {/* 5. AUDIT & PROFILE MODIFICATION NOTICE */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start space-x-3 text-slate-600 text-xs">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-700">Account Profile Management Note:</span>
          <p className="text-slate-500 leading-relaxed">
            Your customer identity is linked to official tax invoices and contractual billing records. To update your legal entity name, billing address, or registered tax details, please contact your account representative. Self-service profile editing endpoint (<code>PUT /api/v1/users/me</code>) is documented for Developer 1 in <code>PROJECT_CONTEXT.md</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
