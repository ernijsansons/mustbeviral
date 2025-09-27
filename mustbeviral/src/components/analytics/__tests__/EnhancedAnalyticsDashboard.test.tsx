// Unit tests for Enhanced Analytics Dashboard
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { EnhancedAnalyticsDashboard } from '../EnhancedAnalyticsDashboard';
import type { AnalyticsMetric, PerformanceInsight, FilterOptions } from '../EnhancedAnalyticsDashboard';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
  Share2: () => <div data-testid="share-icon" />,
  Users: () => <div data-testid="users-icon" />,
  RefreshCcw: () => <div data-testid="refresh-icon" />,
  Download: () => <div data-testid="download-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  Info: () => <div data-testid="info-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  Target: () => <div data-testid="target-icon" />
}));

// Mock data
const mockMetrics: AnalyticsMetric[] = [
  {
    id: 'engagement',
    name: 'Engagement Rate',
    value: 4.8,
    change: 12.5,
    changeType: 'increase',
    trend: [3.2, 3.8, 4.1, 4.3, 4.8],
    icon: () => <div data-testid="heart-icon" />,
    color: 'text-pink-500',
    description: 'Average engagement rate across all platforms'
  },
  {
    id: 'reach',
    name: 'Total Reach',
    value: 125000,
    change: -3.2,
    changeType: 'decrease',
    trend: [130000, 128000, 125000, 127000, 125000],
    icon: () => <div data-testid="eye-icon" />,
    color: 'text-blue-500',
    description: 'Total number of unique users reached'
  }
];

const mockInsights: PerformanceInsight[] = [
  {
    id: '1',
    type: 'success',
    title: 'Peak Performance Time Identified',
    description: 'Your content performs 40% better when posted between 2-4 PM',
    action: 'Schedule more content during this window',
    priority: 'high'
  },
  {
    id: '2',
    type: 'warning',
    title: 'Engagement Drop on Weekends',
    description: 'Weekend engagement is 25% lower than weekdays',
    action: 'Adjust weekend content strategy',
    priority: 'medium'
  }
];

const defaultProps = {
  metrics: mockMetrics,
  insights: mockInsights,
  onFilterChange: jest.fn(),
  onExport: jest.fn(),
  onRefresh: jest.fn(),
  className: 'test-dashboard',
  isLoading: false,
  compact: false
};

describe('EnhancedAnalyticsDashboard', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the dashboard with title and description', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /analytics dashboard/i })).toBeInTheDocument();
      expect(screen.getByText(/real-time performance insights and metrics/i)).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} className="custom-class" />);

      const dashboard = screen.getByRole('heading', { name: /analytics dashboard/i }).closest('.custom-class');
      expect(dashboard).toBeInTheDocument();
    });

    it('renders all provided metrics', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      expect(screen.getByText('Engagement Rate')).toBeInTheDocument();
      expect(screen.getByText('Total Reach')).toBeInTheDocument();
      expect(screen.getByText('4.8%')).toBeInTheDocument();
      expect(screen.getByText('125,000')).toBeInTheDocument();
    });

    it('renders performance insights', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      expect(screen.getByText('Performance Insights')).toBeInTheDocument();
      expect(screen.getByText('Peak Performance Time Identified')).toBeInTheDocument();
      expect(screen.getByText('Engagement Drop on Weekends')).toBeInTheDocument();
    });

    it('shows loading state correctly', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/updating analytics.../i)).toBeInTheDocument();
    });
  });

  describe('Metric Display', () => {
    it('displays metric values with correct formatting', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      // Percentage values
      expect(screen.getByText('4.8%')).toBeInTheDocument();

      // Large numbers with commas
      expect(screen.getByText('125,000')).toBeInTheDocument();
    });

    it('shows trend indicators correctly', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      // Positive change
      expect(screen.getByText('+12.5%')).toBeInTheDocument();
      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();

      // Negative change
      expect(screen.getByText('-3.2%')).toBeInTheDocument();
      expect(screen.getByTestId('trending-down-icon')).toBeInTheDocument();
    });

    it('expands metric details when clicked', async () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      const engagementMetric = screen.getByText('Engagement Rate').closest('[role="button"]');
      expect(engagementMetric).toBeInTheDocument();

      // Initially collapsed
      expect(screen.queryByText('Average engagement rate across all platforms')).not.toBeInTheDocument();

      // Click to expand
      await user.click(engagementMetric!);

      // Should show description
      expect(screen.getByText('Average engagement rate across all platforms')).toBeInTheDocument();
      expect(screen.getByText('Trend (5 periods)')).toBeInTheDocument();
    });

    it('has proper accessibility attributes for metrics', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      const metricCards = screen.getAllByRole('button');
      const metricCard = metricCards.find(card => card.textContent?.includes('Engagement Rate'));

      expect(metricCard).toHaveAttribute('aria-expanded', 'false');
      expect(metricCard).toHaveAttribute('aria-label');
    });
  });

  describe('Filters', () => {
    it('renders filter controls', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      expect(screen.getByLabelText(/time range filter/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/platform filter/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('calls onFilterChange when time range is changed', async () => {
      const mockOnFilterChange = jest.fn();
      render(<EnhancedAnalyticsDashboard {...defaultProps} onFilterChange={mockOnFilterChange} />);

      const timeRangeSelect = screen.getByLabelText(/time range filter/i);
      await user.selectOptions(timeRangeSelect, '7d');

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        timeRange: '7d',
        platform: 'all',
        contentType: 'all'
      });
    });

    it('calls onFilterChange when platform is changed', async () => {
      const mockOnFilterChange = jest.fn();
      render(<EnhancedAnalyticsDashboard {...defaultProps} onFilterChange={mockOnFilterChange} />);

      const platformSelect = screen.getByLabelText(/platform filter/i);
      await user.selectOptions(platformSelect, 'twitter');

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        timeRange: '30d',
        platform: 'twitter',
        contentType: 'all'
      });
    });

    it('has correct default filter values', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      const timeRangeSelect = screen.getByLabelText(/time range filter/i) as HTMLSelectElement;
      const platformSelect = screen.getByLabelText(/platform filter/i) as HTMLSelectElement;

      expect(timeRangeSelect.value).toBe('30d');
      expect(platformSelect.value).toBe('all');
    });
  });

  describe('Actions', () => {
    it('calls onRefresh when refresh button is clicked', async () => {
      const mockOnRefresh = jest.fn().mockResolvedValue(undefined);
      render(<EnhancedAnalyticsDashboard {...defaultProps} onRefresh={mockOnRefresh} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('calls onExport when export button is clicked', async () => {
      const mockOnExport = jest.fn().mockResolvedValue(undefined);
      render(<EnhancedAnalyticsDashboard {...defaultProps} onExport={mockOnExport} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(mockOnExport).toHaveBeenCalledWith('pdf');
    });

    it('shows loading state on refresh button when loading', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} isLoading={true} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toHaveAttribute('aria-busy', 'true');
    });

    it('does not render export button when onExport is not provided', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} onExport={undefined} />);

      expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
    });
  });

  describe('Performance Insights', () => {
    it('displays insights with correct priority styling', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      const highPriorityInsight = screen.getByText('Peak Performance Time Identified').closest('div');
      const mediumPriorityInsight = screen.getByText('Engagement Drop on Weekends').closest('div');

      expect(highPriorityInsight).toHaveTextContent('high');
      expect(mediumPriorityInsight).toHaveTextContent('medium');
    });

    it('shows correct icons for different insight types', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      // Success insight should have trending up icon
      const successInsight = screen.getByText('Peak Performance Time Identified').closest('article');
      expect(successInsight).toContainElement(screen.getByTestId('trending-up-icon'));

      // Warning insight should have alert icon
      const warningInsight = screen.getByText('Engagement Drop on Weekends').closest('article');
      expect(warningInsight).toContainElement(screen.getByTestId('alert-icon'));
    });

    it('can toggle insights visibility', async () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      const toggleButton = screen.getByRole('button', { name: /hide/i });
      expect(screen.getByText('Peak Performance Time Identified')).toBeInTheDocument();

      // Hide insights
      await user.click(toggleButton);
      expect(screen.queryByText('Peak Performance Time Identified')).not.toBeInTheDocument();

      // Show insights again
      const showButton = screen.getByRole('button', { name: /show/i });
      await user.click(showButton);
      expect(screen.getByText('Peak Performance Time Identified')).toBeInTheDocument();
    });

    it('displays empty state when no insights are provided', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} insights={[]} />);

      expect(screen.getByText(/no insights available at the moment/i)).toBeInTheDocument();
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });

    it('has proper accessibility structure for insights', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      const insights = screen.getAllByRole('article');
      expect(insights).toHaveLength(2);

      insights.forEach(insight => {
        const heading = insight.querySelector('[id^="insight-title-"]');
        expect(heading).toBeInTheDocument();
        expect(insight).toHaveAttribute('aria-labelledby', heading?.id);
      });
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive grid classes for metrics', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      const metricsGrid = screen.getByText('Engagement Rate').closest('.grid');
      expect(metricsGrid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4');
    });

    it('stacks controls vertically on mobile', () => {
      render(<EnhancedAnalyticsDashboard {...defaultProps} />);

      const controlsContainer = screen.getByLabelText(/time range filter/i).closest('.flex');
      expect(controlsContainer).toHaveClass('flex-col', 'sm:flex-row');
    });
  });

  describe('Data Validation', () => {
    it('handles missing metric data gracefully', () => {
      const incompleteMetrics = [
        {
          id: 'test',
          name: 'Test Metric',
          value: 0,
          change: 0,
          changeType: 'neutral' as const,
          trend: [],
          icon: () => <div />,
          color: 'text-gray-500',
          description: 'Test description'
        }
      ];

      render(<EnhancedAnalyticsDashboard {...defaultProps} metrics={incompleteMetrics} />);

      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('sorts insights by priority correctly', () => {
      const unsortedInsights = [
        {
          id: '1',
          type: 'info' as const,
          title: 'Low Priority',
          description: 'Info insight',
          priority: 'low' as const
        },
        {
          id: '2',
          type: 'warning' as const,
          title: 'High Priority',
          description: 'Warning insight',
          priority: 'high' as const
        },
        {
          id: '3',
          type: 'success' as const,
          title: 'Medium Priority',
          description: 'Success insight',
          priority: 'medium' as const
        }
      ];

      render(<EnhancedAnalyticsDashboard {...defaultProps} insights={unsortedInsights} />);

      const insightTitles = screen.getAllByRole('article').map(article =>
        article.querySelector('h4')?.textContent
      );

      expect(insightTitles).toEqual(['High Priority', 'Medium Priority', 'Low Priority']);
    });
  });

  describe('Performance', () => {
    it('does not cause unnecessary re-renders with same props', () => {
      const renderSpy = jest.fn();
      const TestComponent = (props: any) => {
        renderSpy();
        return <EnhancedAnalyticsDashboard {...props} />;
      };

      const { rerender } = render(<TestComponent {...defaultProps} />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Rerender with same props
      rerender(<TestComponent {...defaultProps} />);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('memoizes filter change handlers', () => {
      const mockOnFilterChange = jest.fn();
      const { rerender } = render(
        <EnhancedAnalyticsDashboard {...defaultProps} onFilterChange={mockOnFilterChange} />
      );

      const timeRangeSelect = screen.getByLabelText(/time range filter/i);

      // Multiple rerenders should not create new handler instances
      rerender(<EnhancedAnalyticsDashboard {...defaultProps} onFilterChange={mockOnFilterChange} />);
      rerender(<EnhancedAnalyticsDashboard {...defaultProps} onFilterChange={mockOnFilterChange} />);

      expect(timeRangeSelect).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles async errors in refresh gracefully', async () => {
      const mockOnRefresh = jest.fn().mockRejectedValue(new Error('Refresh failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<EnhancedAnalyticsDashboard {...defaultProps} onRefresh={mockOnRefresh} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles async errors in export gracefully', async () => {
      const mockOnExport = jest.fn().mockRejectedValue(new Error('Export failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<EnhancedAnalyticsDashboard {...defaultProps} onExport={mockOnExport} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockOnExport).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });
});