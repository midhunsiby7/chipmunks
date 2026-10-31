import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
      <h2 className="text-4xl font-bold text-slate-800">404</h2>
      <p className="mt-2 text-slate-600">The requested page or resource could not be found.</p>
      <Link
        to="/"
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
