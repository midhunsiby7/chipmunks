import React from 'react';
import { AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while communicating with the service.',
  onRetry,
  actionText = 'Try Again',
  isNetworkError = false,
  className = '',
}) {
  const Icon = isNetworkError ? WifiOff : AlertTriangle;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-xl border border-rose-200/80 shadow-2xs ${className}`}
      role="alert"
    >
      <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-2xs">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-md">{message}</p>

      {onRetry && (
        <div className="mt-6">
          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            onClick={onRetry}
            className="border-slate-300 hover:bg-slate-50"
          >
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
}
