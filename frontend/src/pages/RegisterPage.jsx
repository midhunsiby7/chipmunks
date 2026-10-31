import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Phone,
  Building,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { validatePassword, PASSWORD_REQUIREMENTS } from '../utils/passwordPolicy';
import Button from '../components/ui/Button';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { registerCustomer, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const validation = validatePassword(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    validation.isValid &&
    passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!isFormValid) {
      setFormError('Please ensure all required fields and password security criteria are satisfied.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerCustomer({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        companyName: companyName.trim() || undefined,
      });

      // On successful registration and profile initialization, redirect to application shell
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(err.message || 'Customer registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 py-8">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl mx-auto shadow-sm">
            B
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900 tracking-tight">
            Create Customer Account
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Sign up to manage your SaaS subscriptions, quotations, and recurring invoices
          </p>
        </div>

        {/* Public Registration Scope Notice */}
        <div className="rounded-xl bg-indigo-50/70 border border-indigo-200/80 p-3 flex items-start gap-3 text-indigo-900 text-xs">
          <Shield className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Customer Portal:</strong> Public registration is strictly for customer accounts. Staff and Admin accounts are provisioned directly by organization administrators.
          </p>
        </div>

        {formError && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-3 text-rose-800 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{formError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="reg-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Sarah Connor"
                className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@cyberdyne.io"
                className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Phone Number & Company Name (Row) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="reg-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-company" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Company Name <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  id="reg-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corporation"
                  className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-10 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength Meter Bar */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      validation.strength === 'strong'
                        ? 'w-full bg-emerald-500'
                        : validation.strength === 'medium'
                        ? 'w-2/3 bg-amber-500'
                        : 'w-1/3 bg-rose-500'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Strength: {validation.strength}
                </span>
              </div>
            )}
          </div>

          {/* Interactive Password Policy Requirements */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Password Security Policy:
            </span>
            <ul className="text-xs space-y-1 text-slate-600">
              {PASSWORD_REQUIREMENTS.map((req) => {
                const met = validation.criteria[req.id];
                return (
                  <li key={req.id} className="flex items-center gap-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                        met ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {met ? '✓' : '•'}
                    </span>
                    <span className={met ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                      {req.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Confirm Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="reg-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full text-sm rounded-lg border pl-9 pr-10 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                  confirmPassword && !passwordsMatch
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                Passwords do not match
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || authLoading || !isFormValid}
            className="w-full justify-center py-2.5 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating Customer Profile...
              </>
            ) : (
              <>
                Create Customer Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          <div className="text-center pt-2">
            <span className="text-xs text-slate-500">
              Already have a Brightloop account?{' '}
              <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                Sign In
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
