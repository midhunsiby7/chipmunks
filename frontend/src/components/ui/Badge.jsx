import React from 'react';

const BADGE_VARIANTS = {
  default: {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  primary: {
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-600',
  },
  success: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-600',
  },
  warning: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-600',
  },
  danger: {
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-600',
  },
  info: {
    bg: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-600',
  },
};

const SIZES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export default function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  children,
  ...props
}) {
  const selectedVariant = BADGE_VARIANTS[variant] || BADGE_VARIANTS.default;
  const sizeStyles = SIZES[size] || SIZES.md;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${selectedVariant.bg} ${sizeStyles} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedVariant.dot}`} aria-hidden="true" />
      )}
      <span>{children}</span>
    </span>
  );
}
