// Main Dashboard Component with Performance Optimizations
import { useState, useMemo, lazy, Suspense, useCallback } from 'react';
import { LayoutDashboard, FileText, Users, TrendingUp, Settings } from 'lucide-react';
// Lazy load dashboard components for better performance
const Analytics = lazy(() => import('./Analytics').then(module => ({ default: module.Analytics })));
const MetricsDash = lazy(() => import('./MetricsDash').then(module => ({ default: module.MetricsDash })));
const GamificationWidget = lazy(() => import('./GamificationWidget').then(module => ({ default: module.GamificationWidget })));
const BoostDashboard = lazy(() => import('./BoostDashboard').then(module => ({ default: module.BoostDashboard })));
const EarningsDashboard = lazy(() => import('./EarningsDashboard').then(module => ({ default: module.EarningsDashboard })));

// Loading component for Suspense fallback
const TabLoadingState = () => (
  <div className="flex items-center justify-center min-h-[400px]" role="status" aria-live="polite">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" role="presentation"></div>
      <p className="mt-4 text-gray-600">Loading dashboard content...</p>
    </div>
  </div>
);

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'metrics' | 'boost' | 'earnings'>('overview');

  const tabs = [
    { id: 'overview', name: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', name: 'Analytics', icon: TrendingUp },
    { id: 'metrics', name: 'Metrics', icon: FileText },
    { id: 'boost', name: 'Boost', icon: Users },
    { id: 'earnings', name: 'Earnings', icon: Settings },
  ];

  const renderActiveTab = useCallback(() => {
    const TabContent = () => {
      switch (activeTab) {
        case 'analytics':
          return <Analytics />;
        case 'metrics':
          return <MetricsDash />;
        case 'boost':
          return <BoostDashboard />;
        case 'earnings':
          return <EarningsDashboard />;
        default:
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                  <h3 className="text-lg font-semibold">Content</h3>
                  <p className="text-2xl font-bold">24</p>
                  <p className="text-blue-100">Created this month</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                  <h3 className="text-lg font-semibold">Views</h3>
                  <p className="text-2xl font-bold">12.5K</p>
                  <p className="text-green-100">Total views</p>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                  <h3 className="text-lg font-semibold">Engagement</h3>
                  <p className="text-2xl font-bold">8.2%</p>
                  <p className="text-purple-100">Average rate</p>
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                  <h3 className="text-lg font-semibold">Strategies</h3>
                  <p className="text-2xl font-bold">15</p>
                  <p className="text-orange-100">Active strategies</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Content</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">AI-Generated Marketing Strategy</h4>
                    <p className="text-sm text-gray-500">Created 2 hours ago</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Published</span>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Social Media Campaign Ideas</h4>
                    <p className="text-sm text-gray-500">Created 5 hours ago</p>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Draft</span>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Content Calendar Template</h4>
                    <p className="text-sm text-gray-500">Created 1 day ago</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Published</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Suspense fallback={<div className="h-64 bg-gray-50 rounded-lg animate-pulse" />}>
                <GamificationWidget compact={true} />
              </Suspense>
            </div>
          </div>
        );
      }
    };
    
    return (
      <Suspense fallback={<TabLoadingState />}>
        <TabContent />
      </Suspense>
    );
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    data-testid={`tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${tab.id}`}
                    role="tab"
                    className={`${
                      isActive
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;