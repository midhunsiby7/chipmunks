import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Select({
  id,
  name,
  label,
  options = [],
  placeholder = 'Select an option',
  error,
  helperText,
  disabled = false,
  required = false,
  className = '',
  children,
  ...props
}) {
  const generatedId = useId();
  const selectId = id || name || generatedId;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-2xs">
        <select
          id={selectId}
          name={name}
          disabled={disabled}
          required={required}
          className={`block w-full appearance-none rounded-lg text-sm text-slate-900 bg-white pl-3 pr-9 py-2 border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
          } ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-desc` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.length > 0
            ? options.map((opt) => {
                const isObj = typeof opt === 'object' && opt !== null;
                const value = isObj ? opt.value : opt;
                const optLabel = isObj ? opt.label : opt;
                const optDisabled = isObj ? opt.disabled : false;
                return (
                  <option key={value} value={value} disabled={optDisabled}>
                    {optLabel}
                  </option>
                );
              })
            : children}
        </select>

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>

      {error ? (
        <p id={`${selectId}-error`} className="text-xs text-rose-600 font-medium">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${selectId}-desc`} className="text-xs text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
