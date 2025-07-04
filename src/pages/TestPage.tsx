import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function TestPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test Page</h1>
          <p className="text-gray-600 mt-2">
            This is a test page to verify DashboardLayout functionality
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">DashboardLayout Test</h2>
          <p className="text-gray-700">
            If you can see this content with a sidebar on the left, then DashboardLayout is working correctly.
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded">
            <p className="text-blue-800">
              ✅ Sidebar should be visible on the left side of the screen
            </p>
            <p className="text-blue-800">
              ✅ Navigation links should be functional
            </p>
            <p className="text-blue-800">
              ✅ Header should be visible at the top
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 