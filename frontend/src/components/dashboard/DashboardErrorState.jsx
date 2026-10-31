import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import Button from '../ui/Button';

/**
 * Reusable Error State for Dashboard Panels
 *
 * @param {{
 *   title?: string,
 *   message?: string,
 *   onRetry?: () => void,
 *   className?: string
 * }} props
 */
export default function DashboardErrorState({
  title = 'Failed to Load Dashboard Data',
  message = 'An unexpected network error occurred while communicating with the backend API.',
  onRetry,
  className = '',
}) {
  return (
    <div
      className={`rounded-xl border border-rose-200 bg-rose-50/60 p-6 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div className="space-y-1 max-w-md">
        <h4 className="text-sm font-semibold text-rose-900">{title}</h4>
        <p className="text-xs text-rose-700 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-1 border-rose-300 text-rose-800 hover:bg-rose-100"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      )}
    </div>
  );
}
