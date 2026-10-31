import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ErrorBoundary from '../components/common/ErrorBoundary';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentRole = 'admin'; // Prepared for dynamic AuthContext role integration

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
      {/* Top Navigation Bar */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        currentRole={currentRole}
      />

      {/* Main Body Shell */}
      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentRole={currentRole}
        />

        {/* Content Container (padded on desktop to account for w-64 fixed sidebar) */}
        <main className="flex-1 lg:pl-64 min-w-0 flex flex-col">
          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
