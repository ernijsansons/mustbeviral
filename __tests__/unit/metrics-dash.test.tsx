// Unit tests for metrics dashboard
// LOG: TEST-METRICS-DASH-1 - Metrics dashboard unit tests

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MetricsDash, useMetrics } from '../../src/components/MetricsDash';

// Mock recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>
}));

// Mock fetch
global.fetch = jest.fn();

describe('MetricsDash Component', () => {
  beforeEach(() => {
    console.log('LOG: TEST-METRICS-DASH-SETUP-1 - Setting up metrics dashboard test');
    
    // Mock successful API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('type=conversions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              overview: {
                total_signups: 1247,
                total_published: 89,
                total_strategies: 156,
                conversion_rate: 7.1
              },
              trends: [
                { date: '2025-01-20', signups: 15, published_content: 3, strategies_generated: 8 },
                { date: '2025-01-21', signups: 12, published_content: 5, strategies_generated: 6 }
              ],
              funnel: [
                { stage: 'Visitors', count: 5420, conversion_rate: 100 },
                { stage: 'Signups', count: 1247, conversion_rate: 23.0 }
              ]
            }
          })
        });
      } else if (url.includes('type=matches')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              overview: {
                total_matches: 342,
                avg_match_score: 0.73,
                acceptance_rate: 68.4,
                completion_rate: 45.2
              },
              status_breakdown: [
                { status: 'pending', count: 89, percentage: 26.0 },
                { status: 'accepted', count: 134, percentage: 39.2 }
              ],
              top_content: [
                { content_id: 'content1', title: 'AI Revolution', matches: 23, avg_score: 0.89 }
              ],
              top_influencers: [
                { user_id: 'user1', username: 'tech_sarah', matches: 28, avg_score: 0.91 }
              ],
              trends: [
                { date: '2025-01-20', created: 12, accepted: 8, completed: 3 }
              ]
            }
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render dashboard with loading state', async () => {
      console.log('LOG: TEST-METRICS-DASH-RENDER-1 - Testing initial render');
      
      render(<MetricsDash />);
      
      expect(screen.getByText('Loading metrics...')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('Metrics Dashboard')).toBeInTheDocument();
      });
    });

    test('should render tabs correctly', async () => {
      console.log('LOG: TEST-METRICS-DASH-RENDER-2 - Testing tabs rendering');
      
      render(<MetricsDash />);
      
      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Conversions')).toBeInTheDocument();
        expect(screen.getByText('Matches')).toBeInTheDocument();
      });
    });

    test('should render time range selector', async () => {
      console.log('LOG: TEST-METRICS-DASH-RENDER-3 - Testing time range selector');
      
      render(<MetricsDash />);
      
      await waitFor(() => {
        const select = screen.getByDisplayValue('Last 30 days');
        expect(select).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    test('should load metrics data on mount', async () => {
      console.log('LOG: TEST-METRICS-DASH-DATA-1 - Testing data loading on mount');
      
      render(<MetricsDash />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/get-metrics?type=conversions')
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/get-metrics?type=matches')
        );
      });
    });

    test('should display conversion metrics after loading', async () => {
      console.log('LOG: TEST-METRICS-DASH-DATA-2 - Testing conversion metrics display');
      
      render(<MetricsDash />);
      
      await waitFor(() => {
        expect(screen.getByText('1.2K')).toBeInTheDocument(); // Total signups formatted
        expect(screen.getByText('89')).toBeInTheDocument(); // Total published
      });
    });

    test('should display match metrics after loading', async () => {
      console.log('LOG: TEST-METRICS-DASH-DATA-3 - Testing match metrics display');
      
      render(<MetricsDash />);
      
      await waitFor(() => {
        expect(screen.getByText('342')).toBeInTheDocument(); // Total matches
        expect(screen.getByText('68.4%')).toBeInTheDocument(); // Acceptance rate
      });
    });
  });

  describe('Tab Navigation', () => {
    test('should switch to conversions tab', async () => {
      console.log('LOG: TEST-METRICS-DASH-NAV-1 - Testing conversions tab switch');
      
      render(<MetricsDash />);
      
      await waitFor(() => {
        const conversionsTab = screen.getByText('Conversions');
        fireEvent.click(conversionsTab);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Conversion Trends Over Time')).toBeInTheDocument();
        expect(screen.getByText('User Journey Funnel')).toBeInTheDocument();
      });
    });

    test('should switch to matches tab', async () => {
      console.log('LOG: TEST-METRICS-DASH-NAV-2 - Testing matches tab switch');
      
      render(<MetricsDash />);
      
      await waitFor(() => {
        const matchesTab = screen.getByText('Matches');
        fireEvent.click(matchesTab);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Match Performance Over Time')).toBeInTheDocument();
        expect(screen.getByText('Status Breakdown')).toBeInTheDocument();
      });
    });
  });

  describe('Time Range Selection', () => {
    test('should change time range and reload data', async () => {
      console.log('LOG: TEST-METRICS-DASH-TIME-1 - Testing time range change');
      
      render(<MetricsDash />);
      
      await waitFor(() => {
        const select = screen.getByDisplayValue('Last 30 days');
        fireEvent.change(select, { target: { value: '7d' } });
      });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('timeRange=7d')
        );
      });
    });

    test('should handle refresh button click', async () => {
      console.log('LOG: TEST-METRICS-DASH-TIME-2 - Testing refresh button');
      
      render(<MetricsDash />);
      
      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh');
        fireEvent.click(refreshButton);
      });
      
      // Should trigger additional API calls
      expect(global.fetch).toHaveBeenCalledTimes(4); // Initial 2 + refresh 2
    });
  });

  describe('Chart Rendering', () => {
    test('should render charts in conversions tab', async () => {
      console.log('LOG: TEST-METRICS-DASH-CHARTS-1 - Testing conversions charts');
      
      render(<MetricsDash />);
      
      await waitFor(() => {
        const conversionsTab = screen.getByText('Conversions');
        fireEvent.click(conversionsTab);
      });
      
      await waitFor(() => {
        const conversionsTabPanel = screen.getByText('Conversion Trends Over Time').closest('.space-y-6');
        expect(within(conversionsTabPanel).getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    test('should render charts in matches tab', async () => {
      console.log('LOG: TEST-METRICS-DASH-CHARTS-2 - Testing matches charts');
      
      render(<MetricsDash />);
      
      await waitFor(() => {
        const matchesTab = screen.getByText('Matches');
        fireEvent.click(matchesTab);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      console.log('LOG: TEST-METRICS-DASH-ERROR-1 - Testing API error handling');
      
      (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));
      
      render(<MetricsDash />);
      
      await waitFor(() => {
        // Component should still render without crashing
        expect(screen.getByText('Metrics Dashboard')).toBeInTheDocument();
      });
    });

    test('should handle empty data gracefully', async () => {
      console.log('LOG: TEST-METRICS-DASH-ERROR-2 - Testing empty data handling');
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, data: null })
      });
      
      render(<MetricsDash />);
      
      await waitFor(() => {
        expect(screen.getByText('Metrics Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    test('should handle mobile viewport', async () => {
      console.log('LOG: TEST-METRICS-DASH-RESPONSIVE-1 - Testing mobile responsiveness');
      
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      
      render(<MetricsDash />);
      
      await waitFor(() => {
        expect(screen.getByText('Metrics Dashboard')).toBeInTheDocument();
        // Tabs should still be functional
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });
    });
  });
});

describe('useMetrics Hook', () => {
  beforeEach(() => {
    console.log('LOG: TEST-METRICS-HOOK-SETUP-1 - Setting up useMetrics hook test');
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { overview: { total_signups: 100 } }
      })
    });
    
    jest.clearAllMocks();
  });

  test('should fetch conversions data', async () => {
    console.log('LOG: TEST-METRICS-HOOK-1 - Testing conversions data fetch');
    
    const TestComponent = () => {
      const { data, loading, fetchMetrics } = useMetrics();
      
      React.useEffect(() => {
        fetchMetrics('conversions', '7d');
      }, []);
      
      return (
        <div>
          <span>{loading ? 'Loading' : 'Loaded'}</span>
          {data?.conversions && <span>Conversions: {data.conversions.overview.total_signups}</span>}
          }
        </div>
      );
    };
    
    render(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Conversions: 100')).toBeInTheDocument();
    });
  });

  test('should fetch matches data', async () => {
    console.log('LOG: TEST-METRICS-HOOK-2 - Testing matches data fetch');
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { overview: { total_matches: 50 } }
      })
    });
    
    const TestComponent = () => {
      const { data, loading, fetchMetrics } = useMetrics();
      
      React.useEffect(() => {
        fetchMetrics('matches', '30d');
      }, []);
      
      return (
        <div>
          <span>{loading ? 'Loading' : 'Loaded'}</span>
          {data?.matches && <span>Matches: {data.matches.overview.total_matches}</span>}
          }
        </div>
      );
    };
    
    render(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Matches: 50')).toBeInTheDocument();
    });
  });

  test('should handle fetch errors', async () => {
    console.log('LOG: TEST-METRICS-HOOK-3 - Testing fetch error handling');
    
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    const TestComponent = () => {
      const { data, loading, fetchMetrics } = useMetrics();
      
      React.useEffect(() => {
        fetchMetrics('both');
      }, []);
      
      return <span>{loading ? 'Loading' : 'Error handled'}</span>;
    };
    
    render(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Error handled')).toBeInTheDocument();
    });
  });
});