// Content Page Component with Tabs
import { useState } from 'react';
import { Wrench, Target, TrendingUp } from 'lucide-react';
import { StrategyPlanner } from '../components/StrategyPlanner';
import { ToolSelector } from '../components/ToolSelector';
import { TrendsView } from '../components/TrendsView';

type TabType = 'tools' | 'strategies' | 'trends';

interface Tab {
  id: TabType;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const tabs: Tab[] = [
  { 
    id: 'tools', 
    name: 'Content Tools', 
    icon: Wrench,
    description: 'AI-powered content creation and editing tools'
  },
  { 
    id: 'strategies', 
    name: 'Strategies', 
    icon: Target,
    description: 'Strategic planning and campaign development'
  },
  { 
    id: 'trends', 
    name: 'Trends', 
    icon: TrendingUp,
    description: 'Latest trends and viral content insights'
  },
];

export function ContentPage() {
  const [activeTab, setActiveTab] = useState<TabType>('tools');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tools':
        return <ToolSelector />;
      case 'strategies':
        return <StrategyPlanner />;
      case 'trends':
        return <TrendsView />;
      default:
        return <ToolSelector />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Content Creation</h1>
            <p className="mt-2 text-gray-600">
              Create viral content using AI-powered tools and strategies
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Content tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    data-testid={`tab-${tab.id}`}
                    className={`${
                      isActive
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                    aria-current={isActive ? 'page' : undefined}
                    role="tab"
                    aria-selected={isActive}
                  >
                    <Icon 
                      className={`${
                        isActive 
                          ? 'text-indigo-500' 
                          : 'text-gray-400 group-hover:text-gray-500'
                      } -ml-0.5 mr-2 h-5 w-5 transition-colors`}
                      aria-hidden="true"
                    />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Tab Description */}
          <div className="mb-6">
            <p className="text-gray-600">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>

          {/* Content */}
          <div role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
            {renderTabContent()}
          </div>
        </div>
      </main>
    </div>
  );
}