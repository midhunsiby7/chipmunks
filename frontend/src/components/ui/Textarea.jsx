import React, { useId } from 'react';

export default function Textarea({
  id,
  name,
  label,
  rows = 3,
  error,
  helperText,
  disabled = false,
  required = false,
  className = '',
  ...props
}) {
  const generatedId = useId();
  const textareaId = id || name || generatedId;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-2xs">
        <textarea
          id={textareaId}
          name={name}
          rows={rows}
          disabled={disabled}
          required={required}
          className={`block w-full rounded-lg text-sm text-slate-900 bg-white p-3 border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
          } ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-desc` : undefined}
          {...props}
        />
      </div>

      {error ? (
        <p id={`${textareaId}-error`} className="text-xs text-rose-600 font-medium">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${textareaId}-desc`} className="text-xs text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
