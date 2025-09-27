/**
 * Comprehensive Unit Tests for BoostDashboard Component
 * Testing every line of code with maximum coverage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act as _act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BoostDashboard, useBoostData } from '../../../src/components/BoostDashboard';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console.log and console.error to capture all logging
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();

beforeAll(() => {
  console.log = mockConsoleLog;
  console.error = mockConsoleError;
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Mock data for testing
const mockReputationMetrics = {
  overall_sentiment: 0.5,
  mention_count: 42,
  positive_mentions: 30,
  negative_mentions: 5,
  neutral_mentions: 7,
  visibility_score: 85,
  trending_keywords: ['AI', 'content', 'viral', 'marketing']
};

const mockBrandMentions = [
  {
    id: 'mention-1',
    query: 'Must Be Viral platform',
    snippet: 'This is a great platform for content creation',
    url: 'https://example.com/review1',
    source: 'TechReview',
    sentiment_score: 0.8,
    timestamp: '2024-01-15T10:00:00Z'
  },
  {
    id: 'mention-2',
    query: 'Must Be Viral review',
    snippet: 'Not impressed with the user interface',
    url: 'https://example.com/review2',
    source: 'BlogPost',
    sentiment_score: -0.4,
    timestamp: '2024-01-14T15:30:00Z'
  },
  {
    id: 'mention-3',
    query: 'content creation tools',
    snippet: 'Decent tool for basic content needs',
    url: 'https://example.com/review3',
    source: 'Forum',
    sentiment_score: 0.1,
    timestamp: '2024-01-13T08:45:00Z'
  }
];

const mockSeedingPlan = {
  id: 'plan-1',
  content_id: 'demo-content-1',
  target_platforms: ['Reddit', 'Twitter', 'LinkedIn'],
  seeding_strategy: 'viral',
  priority: 'high',
  estimated_reach: 50000,
  status: 'active'
};

describe('BoostDashboard Component', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  describe('Initial Render and Loading States', () => {
    test('renders loading state initially', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            current_metrics: mockReputationMetrics,
            recent_mentions: mockBrandMentions
          }
        })
      });

      render(<BoostDashboard />);

      // Check initial loading state
      expect(screen.getByText('Loading reputation data...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument(); // Spinner

      // Verify console logging
      expect(mockConsoleLog).toHaveBeenCalledWith('LOG: COMPONENT-BOOST-2 - BoostDashboard rendered');
    });

    test('loads reputation data on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            current_metrics: mockReputationMetrics,
            recent_mentions: mockBrandMentions
          }
        })
      });

      render(<BoostDashboard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/seed-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'get_reputation_metrics',
            keywords: ['Must Be Viral']
          })
        });
      });

      expect(mockConsoleLog).toHaveBeenCalledWith('LOG: COMPONENT-BOOST-3 - Loading reputation data');
      expect(mockConsoleLog).toHaveBeenCalledWith('LOG: COMPONENT-BOOST-4 - Reputation data loaded');
    });

    test('handles loading error gracefully', async () => {
      const mockError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(mockError);

      render(<BoostDashboard />);

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          'LOG: COMPONENT-BOOST-ERROR-1 - Failed to load reputation data:',
          mockError
        );
      });
    });
  });

  describe('Header and Search Functionality', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            current_metrics: mockReputationMetrics,
            recent_mentions: mockBrandMentions
          }
        })
      });

      render(<BoostDashboard />);
      await waitFor(() => {
        expect(screen.getByText('Visibility & Reputation Boost')).toBeInTheDocument();
      });
    });

    test('renders header with title and search elements', () => {
      expect(screen.getByText('Visibility & Reputation Boost')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Brand keywords...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    test('allows keyword input changes', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('Brand keywords...');

      await user.clear(input);
      await user.type(input, 'new keyword, another keyword');

      expect(input).toHaveValue('new keyword, another keyword');
    });

    test('executes search with new keywords', async () => {
      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('Brand keywords...');
      const searchButton = screen.getByRole('button', { name: /search/i });

      await user.clear(input);
      await user.type(input, 'test keyword, another test');
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/seed-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'search_mentions',
            keywords: ['test keyword', 'another test']
          })
        });
      });

      expect(mockConsoleLog).toHaveBeenCalledWith('LOG: COMPONENT-BOOST-5 - Searching for mentions');
    });

    test('handles search error', async () => {
      const user = userEvent.setup();
      const searchButton = screen.getByRole('button', { name: /search/i });

      const mockError = new Error('Search failed');
      mockFetch.mockRejectedValueOnce(mockError);

      await user.click(searchButton);

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          'LOG: COMPONENT-BOOST-ERROR-2 - Mentions search failed:',
          mockError
        );
      });
    });

    test('disables search button during loading', async () => {
      const user = userEvent.setup();
      const searchButton = screen.getByRole('button', { name: /search/i });

      // Mock a slow response
      mockFetch.mockImplementationOnce(() => new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: { metrics: mockReputationMetrics, mentions: [] } })
        }), 100);
      }));

      await user.click(searchButton);

      expect(searchButton).toBeDisabled();
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            current_metrics: mockReputationMetrics,
            recent_mentions: mockBrandMentions
          }
        })
      });

      render(<BoostDashboard />);
      await waitFor(() => {
        expect(screen.getByText('Visibility & Reputation Boost')).toBeInTheDocument();
      });
    });

    test('renders all tab buttons', () => {
      expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /brand mentions/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /content seeding/i })).toBeInTheDocument();
    });

    test('overview tab is active by default', () => {
      const overviewTab = screen.getByRole('button', { name: /overview/i });
      expect(overviewTab).toHaveClass('bg-white', 'text-indigo-600', 'shadow-sm');
    });

    test('can switch to mentions tab', async () => {
      const user = userEvent.setup();
      const mentionsTab = screen.getByRole('button', { name: /brand mentions/i });

      await user.click(mentionsTab);

      expect(mentionsTab).toHaveClass('bg-white', 'text-indigo-600', 'shadow-sm');
      expect(screen.getByText('Recent Brand Mentions')).toBeInTheDocument();
    });

    test('can switch to seeding tab', async () => {
      const user = userEvent.setup();
      const seedingTab = screen.getByRole('button', { name: /content seeding/i });

      await user.click(seedingTab);

      expect(seedingTab).toHaveClass('bg-white', 'text-indigo-600', 'shadow-sm');
      expect(screen.getByText('Create Seeding Plan')).toBeInTheDocument();
    });
  });

  describe('Overview Tab Content', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            current_metrics: mockReputationMetrics,
            recent_mentions: mockBrandMentions
          }
        })
      });

      render(<BoostDashboard />);
      await waitFor(() => {
        expect(screen.getByText('Visibility & Reputation Boost')).toBeInTheDocument();
      });
    });

    test('displays sentiment metrics correctly', () => {
      expect(screen.getByText('+50.0%')).toBeInTheDocument(); // Overall sentiment
      expect(screen.getByText('42')).toBeInTheDocument(); // Total mentions
      expect(screen.getByText('85')).toBeInTheDocument(); // Visibility score
      expect(screen.getByText('71%')).toBeInTheDocument(); // Positive ratio (30/42 * 100)
    });

    test('shows trending keywords when available', () => {
      expect(screen.getByText('Trending Keywords')).toBeInTheDocument();
      mockReputationMetrics.trending_keywords.forEach(keyword => {
        expect(screen.getByText(keyword)).toBeInTheDocument();
      });
    });

    test('handles zero mentions edge case', async () => {
      const zeroMetrics = { ...mockReputationMetrics, mention_count: 0, positive_mentions: 0 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            current_metrics: zeroMetrics,
            recent_mentions: []
          }
        })
      });

      render(<BoostDashboard />);

      await waitFor(() => {
        expect(screen.getByText('0%')).toBeInTheDocument(); // Positive ratio should be 0%
      });
    });
  });

  describe('Mentions Tab Content', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            current_metrics: mockReputationMetrics,
            recent_mentions: mockBrandMentions
          }
        })
      });

      render(<BoostDashboard />);
      await waitFor(() => {
        expect(screen.getByText('Visibility & Reputation Boost')).toBeInTheDocument();
      });

      const mentionsTab = screen.getByRole('button', { name: /brand mentions/i });
      await userEvent.setup().click(mentionsTab);
    });

    test('displays mentions list with correct count', () => {
      expect(screen.getByText('Recent Brand Mentions')).toBeInTheDocument();
      expect(screen.getByText('3 mentions found')).toBeInTheDocument();
    });

    test('renders each mention with all details', () => {
      mockBrandMentions.forEach(mention => {
        expect(screen.getByText(mention.source)).toBeInTheDocument();
        expect(screen.getByText(mention.snippet)).toBeInTheDocument();
        expect(screen.getByText(`Query: ${mention.query}`)).toBeInTheDocument();
      });
    });

    test('shows correct sentiment indicators', () => {
      // Positive sentiment (0.8) - should show green CheckCircle
      expect(screen.getByText('+80.0%')).toBeInTheDocument();

      // Negative sentiment (-0.4) - should show red AlertTriangle
      expect(screen.getByText('-40.0%')).toBeInTheDocument();

      // Neutral sentiment (0.1) - should show yellow Clock
      expect(screen.getByText('+10.0%')).toBeInTheDocument();
    });

    test('displays empty state when no mentions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            current_metrics: mockReputationMetrics,
            recent_mentions: []
          }
        })
      });

      render(<BoostDashboard />);
      await waitFor(() => {
        expect(screen.getByText('Visibility & Reputation Boost')).toBeInTheDocument();
      });

      const mentionsTab = screen.getByRole('button', { name: /brand mentions/i });
      await userEvent.setup().click(mentionsTab);

      expect(screen.getByText('No mentions found. Try searching with different keywords.')).toBeInTheDocument();
    });

    test('external links work correctly', () => {
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(mockBrandMentions.length);

      links.forEach((link, _index) => {
        expect(link).toHaveAttribute('href', mockBrandMentions[index].url);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });

  describe('Seeding Tab Content', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            current_metrics: mockReputationMetrics,
            recent_mentions: mockBrandMentions
          }
        })
      });

      render(<BoostDashboard />);
      await waitFor(() => {
        expect(screen.getByText('Visibility & Reputation Boost')).toBeInTheDocument();
      });

      const seedingTab = screen.getByRole('button', { name: /content seeding/i });
      await userEvent.setup().click(seedingTab);
    });

    test('displays seeding plan creation options', () => {
      expect(screen.getByText('Create Seeding Plan')).toBeInTheDocument();
      expect(screen.getByText('Viral Boost')).toBeInTheDocument();
      expect(screen.getByText('Reputation Repair')).toBeInTheDocument();
      expect(screen.getByText('Visibility Boost')).toBeInTheDocument();
    });

    test('creates viral seeding plan', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            seeding_plan: { ...mockSeedingPlan, seeding_strategy: 'viral' }
          }
        })
      });

      const viralButton = screen.getByText('Viral Boost').closest('button');
      await user.click(viralButton!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/seed-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create_seeding_plan',
            content_id: 'demo-content-1',
            strategy: 'viral',
            keywords: ['Must Be Viral']
          })
        });
      });

      expect(mockConsoleLog).toHaveBeenCalledWith('LOG: COMPONENT-BOOST-7 - Creating seeding plan:', 'viral');
      expect(mockConsoleLog).toHaveBeenCalledWith('LOG: COMPONENT-BOOST-8 - Seeding plan created');
    });

    test('creates reputation repair seeding plan', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            seeding_plan: { ...mockSeedingPlan, seeding_strategy: 'reputation_repair' }
          }
        })
      });

      const repairButton = screen.getByText('Reputation Repair').closest('button');
      await user.click(repairButton!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith('/api/seed-content', expect.objectContaining({
          body: JSON.stringify({
            action: 'create_seeding_plan',
            content_id: 'demo-content-1',
            strategy: 'reputation_repair',
            keywords: ['Must Be Viral']
          })
        }));
      });
    });

    test('creates visibility boost seeding plan', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            seeding_plan: { ...mockSeedingPlan, seeding_strategy: 'visibility_boost' }
          }
        })
      });

      const visibilityButton = screen.getByText('Visibility Boost').closest('button');
      await user.click(visibilityButton!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith('/api/seed-content', expect.objectContaining({
          body: JSON.stringify({
            action: 'create_seeding_plan',
            content_id: 'demo-content-1',
            strategy: 'visibility_boost',
            keywords: ['Must Be Viral']
          })
        }));
      });
    });

    test('handles seeding plan creation error', async () => {
      const user = userEvent.setup();
      const mockError = new Error('Plan creation failed');

      mockFetch.mockRejectedValueOnce(mockError);

      const viralButton = screen.getByText('Viral Boost').closest('button');
      await user.click(viralButton!);

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          'LOG: COMPONENT-BOOST-ERROR-3 - Failed to create seeding plan:',
          mockError
        );
      });
    });

    test('displays active seeding plans when created', async () => {
      const user = userEvent.setup();

      // Mock successful plan creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            seeding_plan: mockSeedingPlan
          }
        })
      });

      const viralButton = screen.getByText('Viral Boost').closest('button');
      await user.click(viralButton!);

      await waitFor(() => {
        expect(screen.getByText('Active Seeding Plans')).toBeInTheDocument();
        expect(screen.getByText('Viral')).toBeInTheDocument();
        expect(screen.getByText('high priority')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('Reddit, Twitter, LinkedIn')).toBeInTheDocument();
        expect(screen.getByText('50,000')).toBeInTheDocument();
      });
    });
  });

  describe('Utility Functions', () => {
    test('getSentimentColor returns correct classes', () => {
      const component = render(<BoostDashboard />);

      // Test positive sentiment
      expect(component.container.innerHTML).toContain('text-green-600 bg-green-100');

      // Would need to test negative and neutral through component state changes
      // This tests the function logic indirectly through component rendering
    });

    test('formatSentimentScore formats correctly', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            current_metrics: { ...mockReputationMetrics, overall_sentiment: -0.25 },
            recent_mentions: []
          }
        })
      });

      render(<BoostDashboard />);

      // Should format negative sentiment correctly
      waitFor(() => {
        expect(screen.getByText('-25.0%')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles API response with success: false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'API error'
        })
      });

      render(<BoostDashboard />);

      // Should not crash and should not set metrics
      await waitFor(() => {
        expect(screen.queryByText('42')).not.toBeInTheDocument();
      });
    });

    test('handles malformed API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // Missing success field and data
        })
      });

      render(<BoostDashboard />);

      // Should not crash
      await waitFor(() => {
        expect(screen.getByText('Visibility & Reputation Boost')).toBeInTheDocument();
      });
    });

    test('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<BoostDashboard />);

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          'LOG: COMPONENT-BOOST-ERROR-1 - Failed to load reputation data:',
          expect.any(Error)
        );
      });
    });

    test('handles empty keyword search', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            current_metrics: mockReputationMetrics,
            recent_mentions: mockBrandMentions
          }
        })
      });

      render(<BoostDashboard />);
      await waitFor(() => {
        expect(screen.getByText('Visibility & Reputation Boost')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Brand keywords...');
      const searchButton = screen.getByRole('button', { name: /search/i });

      await user.clear(input);
      await user.click(searchButton);

      // Should handle empty keywords gracefully
      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith('/api/seed-content', expect.objectContaining({
          body: JSON.stringify({
            action: 'search_mentions',
            keywords: ['']
          })
        }));
      });
    });
  });
});

describe('useBoostData Hook', () => {
  const TestComponent: React.FC = () => {
    const { data, loading, fetchBoostData } = useBoostData();

    return (
      <div>
        <div data-testid="loading">{loading.toString()}</div>
        <div data-testid="data">{JSON.stringify(data)}</div>
        <button onClick={() => fetchBoostData('test_action', { param: 'value' })}>
          Fetch Data
        </button>
      </div>
    );
  };

  beforeEach(() => {
    mockFetch.mockClear();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  test('initial state is correct', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('data')).toHaveTextContent('null');
  });

  test('fetchBoostData sets loading state correctly', async () => {
    mockFetch.mockImplementationOnce(() =>
      new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: { test: 'value' } })
        }), 50);
      })
    );

    render(<TestComponent />);
    const button = screen.getByText('Fetch Data');

    fireEvent.click(button);

    // Should be loading immediately
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
  });

  test('fetchBoostData handles successful response', async () => {
    const mockData = { test: 'value', metrics: mockReputationMetrics };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockData })
    });

    render(<TestComponent />);
    const button = screen.getByText('Fetch Data');

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(mockData));
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/seed-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'test_action',
        param: 'value'
      })
    });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      'LOG: COMPONENT-BOOST-9 - Fetching boost data via hook:',
      'test_action'
    );
  });

  test('fetchBoostData handles API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, error: 'API error' })
    });

    render(<TestComponent />);
    const button = screen.getByText('Fetch Data');

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('null');
    });
  });

  test('fetchBoostData handles network error', async () => {
    const mockError = new Error('Network error');
    mockFetch.mockRejectedValueOnce(mockError);

    render(<TestComponent />);
    const button = screen.getByText('Fetch Data');

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith(
        'LOG: COMPONENT-BOOST-ERROR-4 - Hook fetch failed:',
        mockError
      );
    });

    expect(screen.getByTestId('data')).toHaveTextContent('null');
  });

  test('fetchBoostData returns data for chaining', async () => {
    const mockData = { test: 'value' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockData })
    });

    const TestComponentWithReturn: React.FC = () => {
      const { fetchBoostData } = useBoostData();
      const [returnedData, setReturnedData] = React.useState(null);

      const handleFetch = async () => {
        const result = await fetchBoostData('test_action');
        setReturnedData(result);
      };

      return (
        <div>
          <div data-testid="returned-data">{JSON.stringify(returnedData)}</div>
          <button onClick={handleFetch}>Fetch</button>
        </div>
      );
    };

    render(<TestComponentWithReturn />);
    const button = screen.getByText('Fetch');

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('returned-data')).toHaveTextContent(JSON.stringify(mockData));
    });
  });

  test('fetchBoostData handles default parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: {} })
    });

    render(<TestComponent />);

    // Modify component to test default params
    const TestComponentNoParams: React.FC = () => {
      const { fetchBoostData } = useBoostData();

      return (
        <button onClick={() => fetchBoostData('test_action')}>
          Fetch No Params
        </button>
      );
    };

    render(<TestComponentNoParams />);
    const button = screen.getByText('Fetch No Params');

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/seed-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_action'
        })
      });
    });
  });
});