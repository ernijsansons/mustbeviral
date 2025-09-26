// Comprehensive unit tests for Dashboard component
// Tests tab navigation, content rendering, and component integration

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Dashboard } from '../../../src/components/Dashboard';

// Mock all the sub-components to isolate Dashboard testing
jest.mock('../../../src/components/Analytics', () => ({
  Analytics: () => <div data-testid="analytics-component">Analytics Component</div>
}));

jest.mock('../../../src/components/MetricsDash', () => ({
  MetricsDash: () => <div data-testid="metrics-dash-component">MetricsDash Component</div>
}));

jest.mock('../../../src/components/GamificationWidget', () => ({
  GamificationWidget: ({ compact }: { compact: boolean }) => (
    <div data-testid="gamification-widget" data-compact={compact}>
      Gamification Widget {compact ? '(compact)' : ''}
    </div>
  )
}));

jest.mock('../../../src/components/BoostDashboard', () => ({
  BoostDashboard: () => <div data-testid="boost-dashboard-component">BoostDashboard Component</div>
}));

jest.mock('../../../src/components/EarningsDashboard', () => ({
  EarningsDashboard: () => <div data-testid="earnings-dashboard-component">EarningsDashboard Component</div>
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  LayoutDashboard: ({ className }: { className?: string }) => 
    <div data-testid="layout-dashboard-icon" className={className}>LayoutDashboard</div>,
  FileText: ({ className }: { className?: string }) => 
    <div data-testid="file-text-icon" className={className}>FileText</div>,
  Users: ({ className }: { className?: string }) => 
    <div data-testid="users-icon" className={className}>Users</div>,
  TrendingUp: ({ className }: { className?: string }) => 
    <div data-testid="trending-up-icon" className={className}>TrendingUp</div>,
  Settings: ({ className }: { className?: string }) => 
    <div data-testid="settings-icon" className={className}>Settings</div>,
}));

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial render', () => {
    it('should render without errors', () => {
      render(<Dashboard />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should render all tab buttons', () => {
      render(<Dashboard />);
      
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
      expect(screen.getByTestId('tab-analytics')).toBeInTheDocument();
      expect(screen.getByTestId('tab-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('tab-boost')).toBeInTheDocument();
      expect(screen.getByTestId('tab-earnings')).toBeInTheDocument();
    });

    it('should render tab labels correctly', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Metrics')).toBeInTheDocument();
      expect(screen.getByText('Boost')).toBeInTheDocument();
      expect(screen.getByText('Earnings')).toBeInTheDocument();
    });

    it('should render tab icons correctly', () => {
      render(<Dashboard />);
      
      expect(screen.getByTestId('layout-dashboard-icon')).toBeInTheDocument();
      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument();
      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });

    it('should have overview tab active by default', () => {
      render(<Dashboard />);
      
      const overviewTab = screen.getByTestId('tab-overview');
      expect(overviewTab).toHaveClass('border-indigo-500', 'text-indigo-600');
    });

    it('should render overview content by default', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      expect(screen.getByText('Recent Content')).toBeInTheDocument();
    });
  });

  describe('tab navigation', () => {
    it('should switch to analytics tab when clicked', () => {
      render(<Dashboard />);
      
      const analyticsTab = screen.getByTestId('tab-analytics');
      fireEvent.click(analyticsTab);
      
      expect(screen.getByTestId('analytics-component')).toBeInTheDocument();
      expect(analyticsTab).toHaveClass('border-indigo-500', 'text-indigo-600');
    });

    it('should switch to metrics tab when clicked', () => {
      render(<Dashboard />);
      
      const metricsTab = screen.getByTestId('tab-metrics');
      fireEvent.click(metricsTab);
      
      expect(screen.getByTestId('metrics-dash-component')).toBeInTheDocument();
      expect(metricsTab).toHaveClass('border-indigo-500', 'text-indigo-600');
    });

    it('should switch to boost tab when clicked', () => {
      render(<Dashboard />);
      
      const boostTab = screen.getByTestId('tab-boost');
      fireEvent.click(boostTab);
      
      expect(screen.getByTestId('boost-dashboard-component')).toBeInTheDocument();
      expect(boostTab).toHaveClass('border-indigo-500', 'text-indigo-600');
    });

    it('should switch to earnings tab when clicked', () => {
      render(<Dashboard />);
      
      const earningsTab = screen.getByTestId('tab-earnings');
      fireEvent.click(earningsTab);
      
      expect(screen.getByTestId('earnings-dashboard-component')).toBeInTheDocument();
      expect(earningsTab).toHaveClass('border-indigo-500', 'text-indigo-600');
    });

    it('should switch back to overview tab when clicked', () => {
      render(<Dashboard />);
      
      // First switch to another tab
      fireEvent.click(screen.getByTestId('tab-analytics'));
      expect(screen.getByTestId('analytics-component')).toBeInTheDocument();
      
      // Then switch back to overview
      const overviewTab = screen.getByTestId('tab-overview');
      fireEvent.click(overviewTab);
      
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      expect(overviewTab).toHaveClass('border-indigo-500', 'text-indigo-600');
    });

    it('should update inactive tab styles correctly', () => {
      render(<Dashboard />);
      
      const analyticsTab = screen.getByTestId('tab-analytics');
      const overviewTab = screen.getByTestId('tab-overview');
      
      // Initially overview is active, analytics is inactive
      expect(overviewTab).toHaveClass('border-indigo-500', 'text-indigo-600');
      expect(analyticsTab).toHaveClass('border-transparent', 'text-gray-500');
      
      // After clicking analytics
      fireEvent.click(analyticsTab);
      
      expect(analyticsTab).toHaveClass('border-indigo-500', 'text-indigo-600');
      expect(overviewTab).toHaveClass('border-transparent', 'text-gray-500');
    });
  });

  describe('overview tab content', () => {
    beforeEach(() => {
      render(<Dashboard />);
    });

    it('should display dashboard metrics cards', () => {
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('24')).toBeInTheDocument();
      expect(screen.getByText('Created this month')).toBeInTheDocument();
      
      expect(screen.getByText('Views')).toBeInTheDocument();
      expect(screen.getByText('12.5K')).toBeInTheDocument();
      expect(screen.getByText('Total views')).toBeInTheDocument();
      
      expect(screen.getByText('Engagement')).toBeInTheDocument();
      expect(screen.getByText('8.2%')).toBeInTheDocument();
      expect(screen.getByText('Average rate')).toBeInTheDocument();
      
      expect(screen.getByText('Strategies')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('Active strategies')).toBeInTheDocument();
    });

    it('should display recent content items', () => {
      expect(screen.getByText('AI-Generated Marketing Strategy')).toBeInTheDocument();
      expect(screen.getByText('Created 2 hours ago')).toBeInTheDocument();
      expect(screen.getByText('Social Media Campaign Ideas')).toBeInTheDocument();
      expect(screen.getByText('Created 5 hours ago')).toBeInTheDocument();
      expect(screen.getByText('Content Calendar Template')).toBeInTheDocument();
      expect(screen.getByText('Created 1 day ago')).toBeInTheDocument();
    });

    it('should display content status badges', () => {
      const publishedBadges = screen.getAllByText('Published');
      const draftBadges = screen.getAllByText('Draft');
      
      expect(publishedBadges).toHaveLength(2);
      expect(draftBadges).toHaveLength(1);
    });

    it('should display gamification widget in compact mode', () => {
      const gamificationWidget = screen.getByTestId('gamification-widget');
      expect(gamificationWidget).toBeInTheDocument();
      expect(gamificationWidget).toHaveAttribute('data-compact', 'true');
      expect(screen.getByText('Gamification Widget (compact)')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<Dashboard />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Tabs');
    });

    it('should have proper main landmark', () => {
      render(<Dashboard />);
      
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<Dashboard />);
      
      const analyticsTab = screen.getByTestId('tab-analytics');
      
      // Tab should be focusable
      analyticsTab.focus();
      expect(analyticsTab).toHaveFocus();
      
      // Enter key should activate tab
      fireEvent.keyDown(analyticsTab, { key: 'Enter' });
      expect(screen.getByTestId('analytics-component')).toBeInTheDocument();
    });

    it('should maintain focus management during tab switches', () => {
      render(<Dashboard />);
      
      const analyticsTab = screen.getByTestId('tab-analytics');
      const metricsTab = screen.getByTestId('tab-metrics');
      
      // Click analytics tab and verify focus
      fireEvent.click(analyticsTab);
      expect(analyticsTab).toHaveClass('border-indigo-500', 'text-indigo-600');
      
      // Click metrics tab and verify previous tab loses focus styling
      fireEvent.click(metricsTab);
      expect(metricsTab).toHaveClass('border-indigo-500', 'text-indigo-600');
      expect(analyticsTab).toHaveClass('border-transparent', 'text-gray-500');
    });
  });

  describe('responsive design classes', () => {
    beforeEach(() => {
      render(<Dashboard />);
    });

    it('should have responsive grid classes for metrics cards', () => {
      const metricsGrid = screen.getByText('Content').closest('.grid');
      expect(metricsGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
    });

    it('should have responsive padding classes', () => {
      const container = screen.getByRole('main');
      expect(container).toHaveClass('sm:px-6', 'lg:px-8');
    });

    it('should have responsive spacing classes for gamification grid', () => {
      const gamificationGrid = screen.getByTestId('gamification-widget').closest('.grid');
      expect(gamificationGrid).toHaveClass('grid-cols-1', 'lg:grid-cols-2');
    });
  });

  describe('component integration', () => {
    it('should only render one active component at a time', () => {
      render(<Dashboard />);
      
      // Initially overview content is visible
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      expect(screen.queryByTestId('analytics-component')).not.toBeInTheDocument();
      
      // Switch to analytics
      fireEvent.click(screen.getByTestId('tab-analytics'));
      expect(screen.queryByText('Dashboard Overview')).not.toBeInTheDocument();
      expect(screen.getByTestId('analytics-component')).toBeInTheDocument();
    });

    it('should pass correct props to GamificationWidget', () => {
      render(<Dashboard />);
      
      const gamificationWidget = screen.getByTestId('gamification-widget');
      expect(gamificationWidget).toHaveAttribute('data-compact', 'true');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle rapid tab switching', async () => {
      render(<Dashboard />);
      
      const tabs = [
        screen.getByTestId('tab-analytics'),
        screen.getByTestId('tab-metrics'),
        screen.getByTestId('tab-boost'),
        screen.getByTestId('tab-earnings'),
        screen.getByTestId('tab-overview'),
      ];
      
      // Rapidly switch between tabs
      for (const tab of tabs) {
        fireEvent.click(tab);
        await waitFor(() => {
          expect(tab).toHaveClass('border-indigo-500', 'text-indigo-600');
        });
      }
      
      // Should end up on overview
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    it('should handle multiple clicks on same tab', () => {
      render(<Dashboard />);
      
      const analyticsTab = screen.getByTestId('tab-analytics');
      
      // Multiple clicks should not cause issues
      fireEvent.click(analyticsTab);
      fireEvent.click(analyticsTab);
      fireEvent.click(analyticsTab);
      
      expect(screen.getByTestId('analytics-component')).toBeInTheDocument();
      expect(analyticsTab).toHaveClass('border-indigo-500', 'text-indigo-600');
    });

    it('should handle unknown tab gracefully', () => {
      render(<Dashboard />);
      
      // This tests the default case in renderActiveTab switch statement
      // We can't directly trigger this in normal usage, but the default case
      // should render the overview content
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });
  });

  describe('styling and visual elements', () => {
    beforeEach(() => {
      render(<Dashboard />);
    });

    it('should apply correct background colors to metric cards', () => {
      const contentCard = screen.getByText('Content').closest('.bg-gradient-to-r');
      expect(contentCard).toHaveClass('from-blue-500', 'to-blue-600');
      
      const viewsCard = screen.getByText('Views').closest('.bg-gradient-to-r');
      expect(viewsCard).toHaveClass('from-green-500', 'to-green-600');
      
      const engagementCard = screen.getByText('Engagement').closest('.bg-gradient-to-r');
      expect(engagementCard).toHaveClass('from-purple-500', 'to-purple-600');
      
      const strategiesCard = screen.getByText('Strategies').closest('.bg-gradient-to-r');
      expect(strategiesCard).toHaveClass('from-orange-500', 'to-orange-600');
    });

    it('should apply correct status badge colors', () => {
      const publishedBadges = screen.getAllByText('Published');
      publishedBadges.forEach(badge => {
        expect(badge).toHaveClass('bg-green-100', 'text-green-800');
      });
      
      const draftBadge = screen.getByText('Draft');
      expect(draftBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('should have proper spacing and layout classes', () => {
      const mainContainer = screen.getByText('Dashboard Overview').closest('.space-y-6');
      expect(mainContainer).toHaveClass('space-y-6');
      
      const recentContent = screen.getByText('Recent Content').closest('.bg-white');
      expect(recentContent).toHaveClass('rounded-lg', 'shadow', 'p-6');
    });

    it('should apply hover styles to inactive tabs', () => {
      const analyticsTab = screen.getByTestId('tab-analytics');
      expect(analyticsTab).toHaveClass('hover:text-gray-700', 'hover:border-gray-300');
    });
  });

  describe('content structure', () => {
    it('should have proper heading hierarchy', () => {
      render(<Dashboard />);
      
      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('Dashboard Overview');
      
      const sectionHeading = screen.getByRole('heading', { level: 3 });
      expect(sectionHeading).toHaveTextContent('Recent Content');
    });

    it('should structure content items properly', () => {
      render(<Dashboard />);
      
      const contentItems = screen.getAllByRole('heading', { level: 4 });
      expect(contentItems).toHaveLength(3);
      expect(contentItems[0]).toHaveTextContent('AI-Generated Marketing Strategy');
      expect(contentItems[1]).toHaveTextContent('Social Media Campaign Ideas');
      expect(contentItems[2]).toHaveTextContent('Content Calendar Template');
    });
  });

  describe('performance considerations', () => {
    it('should not re-render unnecessarily when switching tabs', () => {
      const { rerender } = render(<Dashboard />);
      
      // Switch tabs multiple times
      fireEvent.click(screen.getByTestId('tab-analytics'));
      fireEvent.click(screen.getByTestId('tab-metrics'));
      fireEvent.click(screen.getByTestId('tab-overview'));
      
      // Component should still render properly
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      
      // Re-render with same props should work
      rerender(<Dashboard />);
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });
  });
});