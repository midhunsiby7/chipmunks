import React from 'react';

export function Table({ className = '', children, ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white">
      <table className={`w-full text-left border-collapse text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className = '', children, ...props }) {
  return (
    <thead className={`bg-slate-50 border-b border-slate-200 ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className = '', children, ...props }) {
  return (
    <tbody className={`divide-y divide-slate-200 bg-white ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className = '', isHoverable = true, children, ...props }) {
  return (
    <tr
      className={`transition-colors ${isHoverable ? 'hover:bg-slate-50/80' : ''} ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className = '', children, ...props }) {
  return (
    <th
      scope="col"
      className={`px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-600 ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className = '', children, ...props }) {
  return (
    <td className={`px-6 py-4 text-slate-700 whitespace-nowrap ${className}`} {...props}>
      {children}
    </td>
  );
}

export default Table;
