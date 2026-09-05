import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';

export function AppLayout({ healthResult, loading }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Global Header with Synchronized Health Status */}
      <Header healthResult={healthResult} loading={loading} />

      {/* Main Container with Sidebar + Page Viewport */}
      <div className="flex-1 flex flex-col md:flex-row w-full min-h-0">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
