import React from 'react';
import { Loader2 } from 'lucide-react';

const SIZES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function LoadingIndicator({
  size = 'md',
  label = 'Loading...',
  fullPage = false,
  className = '',
}) {
  const sizeClass = SIZES[size] || SIZES.md;

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 p-6 ${className}`}>
      <Loader2 className={`${sizeClass} animate-spin text-indigo-600`} aria-hidden="true" />
      {label && <p className="text-sm font-medium text-slate-500">{label}</p>}
      <span className="sr-only">Loading</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-xs">
        {content}
      </div>
    );
  }

  return content;
}

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}

export default LoadingIndicator;
