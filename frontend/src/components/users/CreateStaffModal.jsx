import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { userService } from '../../services/userService';
import {
  UserPlus,
  Mail,
  User,
  Phone,
  Building,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Shield,
  Loader2,
} from 'lucide-react';

/**
 * Admin-Only Staff Account Provisioning Modal
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSuccess?: () => void
 * }} props
 */
export default function CreateStaffModal({ isOpen, onClose, onSuccess }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdResponse, setCreatedResponse] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhoneNumber('');
    setCompanyName('');
    setErrorMessage('');
    setCreatedResponse(null);
    setCopiedLink(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim() || !email.trim()) {
      setErrorMessage('Full name and email address are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await userService.createStaff({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        companyName: companyName.trim() || undefined,
      });

      setCreatedResponse(response);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setErrorMessage(
        err.detail || err.message || 'Failed to create staff account. Please verify input fields.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Provision Staff Account"
      description="Create a staff identity in Firebase and PostgreSQL with operational privileges."
      maxWidth="md"
    >
      {createdResponse ? (
        <div className="space-y-5 text-center py-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-2xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Staff Account Provisioned Successfully
            </h3>
            <p className="text-xs text-slate-500">
              Account created for <strong className="text-slate-800">{createdResponse.user?.full_name}</strong> ({createdResponse.user?.email}) with role <span className="font-semibold text-blue-700 uppercase">Staff</span>.
            </p>
          </div>

          {/* Onboarding Password Setup Link Display */}
          {createdResponse.password_setup_link && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Credential Setup Link:
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdResponse.password_setup_link)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs font-mono bg-white p-2.5 rounded-lg border border-slate-200 break-all text-slate-700 select-all">
                {createdResponse.password_setup_link}
              </p>
              <p className="text-[10px] text-slate-400">
                Share this secure one-time link with the staff member to configure their initial credentials.
              </p>
            </div>
          )}

          <div className="pt-2">
            <Button variant="primary" className="w-full justify-center" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Role Isolation:</strong> This form strictly creates Staff accounts. Role elevation to Admin is forbidden.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          <div>
            <label htmlFor="staff-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                id="staff-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="staff-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Staff Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                id="staff-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.m@brightloop.io"
                className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="staff-phone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  id="staff-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="staff-company" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Department / Team <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  id="staff-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Billing Operations"
                  className="w-full text-sm rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Creating Identity...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Create Staff Account
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
