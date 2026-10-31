import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { authService } from '../services/authService';
import { validatePassword, PASSWORD_REQUIREMENTS } from '../utils/passwordPolicy';
import Button from '../components/ui/Button';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const oobCode = searchParams.get('oobCode');

  const [verifyingCode, setVerifyingCode] = useState(() => Boolean(oobCode));
  const [accountEmail, setAccountEmail] = useState('');
  const [codeError, setCodeError] = useState(() =>
    !oobCode
      ? 'Missing password reset security code. Please use the exact link sent to your email.'
      : ''
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Validate action code on initial load
  useEffect(() => {
    if (!oobCode) return;

    let isMounted = true;
    authService
      .verifyResetCode(oobCode)
      .then((email) => {
        if (isMounted) {
          setAccountEmail(email);
          setVerifyingCode(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setCodeError(err.message || 'The password reset link is invalid or has expired.');
          setVerifyingCode(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [oobCode]);

  const validation = validatePassword(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = validation.isValid && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!isFormValid) {
      setSubmitError('Please satisfy all password security requirements and confirm matching passwords.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.confirmNewPassword(oobCode, newPassword);
      setIsSuccess(true);
    } catch (err) {
      setSubmitError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl mx-auto shadow-sm">
            B
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900 tracking-tight">
            Create New Password
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {accountEmail
              ? `Updating credentials for ${accountEmail}`
              : 'Choose a strong, secure password for your Brightloop account'}
          </p>
        </div>

        {verifyingCode ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs font-medium text-slate-500">
              Validating security token...
            </p>
          </div>
        ) : codeError ? (
          <div className="space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600 shadow-xs">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-900">
                Invalid or Expired Link
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {codeError}
              </p>
            </div>

            <div className="pt-2">
              <Link to="/forgot-password">
                <Button variant="primary" className="w-full justify-center">
                  Request New Reset Link
                </Button>
              </Link>
            </div>
          </div>
        ) : isSuccess ? (
          <div className="space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-900">
                Password Successfully Reset
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your Brightloop account password has been updated securely. You can now sign in with your new credentials.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={() => navigate('/login')}
              >
                Sign In Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-3 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">{submitError}</div>
              </div>
            )}

            {/* New Password */}
            <div>
              <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
            </div>

            {/* Live Security Requirements Checklist */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                Security Policy Requirements:
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

            {/* Confirm New Password */}
            <div>
              <label htmlFor="confirm-new-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirm-new-password"
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
              disabled={isSubmitting || !isFormValid}
              className="w-full justify-center py-2.5 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Updating Password...
                </>
              ) : (
                'Set New Password'
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
