import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getRoleBadgeConfig, formatDate, formatDateTime } from '../../utils/formatters';
import { Mail, Phone, Building, Calendar } from 'lucide-react';

/**
 * User Profile Details Modal
 *
 * @param {{
 *   user: any|null,
 *   isOpen: boolean,
 *   onClose: () => void
 * }} props
 */
export default function UserProfileModal({ user, isOpen, onClose }) {
  if (!user) return null;

  const roleConfig = getRoleBadgeConfig(user.role);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Profile Details"
      description="Inspect verified identity attributes and operational role."
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Header Pill */}
        <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shrink-0">
            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-900 truncate">
              {user.full_name || 'Anonymous User'}
            </h3>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${roleConfig.className}`}>
              {roleConfig.label}
            </span>
            <Badge variant={user.is_active ? 'success' : 'danger'} size="sm">
              {user.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              Email Address
            </span>
            <p className="font-semibold text-slate-900 truncate">{user.email}</p>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              Phone Number
            </span>
            <p className="font-semibold text-slate-900 truncate">{user.phone_number || '—'}</p>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              Company / Department
            </span>
            <p className="font-semibold text-slate-900 truncate">{user.company_name || '—'}</p>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Joined Date
            </span>
            <p className="font-semibold text-slate-900 truncate">{formatDate(user.created_at)}</p>
          </div>
        </div>

        {/* Security & System Identifiers */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Record UUID:</span>
            <span className="font-mono text-[11px] text-slate-700">{user.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Last Profile Update:</span>
            <span className="text-slate-700">{formatDateTime(user.updated_at)}</span>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
