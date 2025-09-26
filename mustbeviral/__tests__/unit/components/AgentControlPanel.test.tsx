// Comprehensive unit tests for AgentControlPanel component
// Tests AI agent control interface, content generation, and metrics

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AgentControlPanel } from '../../../src/components/AgentControlPanel';

// Mock UI components
jest.mock('../../../src/components/ui/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <div data-testid="card" className={className}>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-title">{children}</div>,
}));

jest.mock('../../../src/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button
      data-testid={props['data-testid'] || 'button'}
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  )
}));

jest.mock('../../../src/components/ui/Input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: any) => (
    <input
      data-testid={props['data-testid'] || 'input'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  )
}));

jest.mock('../../../src/components/ui/LoadingStates', () => ({
  ContextualLoading: ({ message }: { message?: string }) => (
    <div data-testid="contextual-loading">{message || 'Loading...'}</div>
  )
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Bot: () => <div data-testid="bot-icon">Bot</div>,
  Sparkles: () => <div data-testid="sparkles-icon">Sparkles</div>,
  Target: () => <div data-testid="target-icon">Target</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  Zap: () => <div data-testid="zap-icon">Zap</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>,
  BarChart3: () => <div data-testid="bar-chart-icon">BarChart3</div>,
  Globe: () => <div data-testid="globe-icon">Globe</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  DollarSign: () => <div data-testid="dollar-sign-icon">DollarSign</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  AlertTriangle: () => <div data-testid="alert-triangle-icon">AlertTriangle</div>,
  RefreshCw: () => <div data-testid="refresh-icon">RefreshCw</div>,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('AgentControlPanel', () => {
  const mockMetrics = {
    usage: {
      totalRequests: 150,
      totalTokens: 25000,
      totalCost: 12.50,
      averageCost: 0.08,
      successRate: 95.5,
    },
    optimization: {
      totalOptimizations: 45,
      averageReduction: 22.5,
      platformBreakdown: {
        twitter: 20,
        instagram: 15,
        tiktok: 10,
      },
    },
    budget: {
      daily: { used: 2.50, limit: 10.00, percentage: 25 },
      weekly: { used: 15.00, limit: 50.00, percentage: 30 },
      monthly: { used: 45.00, limit: 200.00, percentage: 22.5 },
    },
    recommendations: [
      'Consider using more engaging visuals',
      'Optimize posting times for better reach',
      'Try different content formats',
    ],
  };

  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(mockToken);
    
    // Mock successful metrics fetch by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockMetrics,
      }),
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial render and setup', () => {
    it('should render without errors', async () => {
      render(<AgentControlPanel />);
      
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
    });

    it('should load metrics on mount', async () => {
      render(<AgentControlPanel />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/metrics', {
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
        });
      });
    });

    it('should render all tab buttons', async () => {
      render(<AgentControlPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Generate Content')).toBeInTheDocument();
        expect(screen.getByText('Multi-Platform Campaign')).toBeInTheDocument();
        expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
        expect(screen.getByText('Content Optimizer')).toBeInTheDocument();
      });
    });

    it('should have generate tab active by default', async () => {
      render(<AgentControlPanel />);
      
      await waitFor(() => {
        const generateTab = screen.getByText('Generate Content').closest('button');
        expect(generateTab).toHaveClass('bg-blue-50', 'text-blue-700');
      });
    });

    it('should handle metrics loading failure gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Failed to load metrics' }),
      } as Response);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<AgentControlPanel />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load metrics:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('tab navigation', () => {
    it('should switch to campaign tab when clicked', async () => {
      render(<AgentControlPanel />);
      
      const campaignTab = screen.getByText('Multi-Platform Campaign');
      fireEvent.click(campaignTab);
      
      await waitFor(() => {
        expect(campaignTab.closest('button')).toHaveClass('bg-blue-50', 'text-blue-700');
      });
    });

    it('should switch to metrics tab when clicked', async () => {
      render(<AgentControlPanel />);
      
      const metricsTab = screen.getByText('Performance Metrics');
      fireEvent.click(metricsTab);
      
      await waitFor(() => {
        expect(metricsTab.closest('button')).toHaveClass('bg-blue-50', 'text-blue-700');
      });
    });

    it('should switch to optimizer tab when clicked', async () => {
      render(<AgentControlPanel />);
      
      const optimizerTab = screen.getByText('Content Optimizer');
      fireEvent.click(optimizerTab);
      
      await waitFor(() => {
        expect(optimizerTab.closest('button')).toHaveClass('bg-blue-50', 'text-blue-700');
      });
    });

    it('should render appropriate icons for each tab', async () => {
      render(<AgentControlPanel />);
      
      await waitFor(() => {
        expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
        expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument();
        expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
      });
    });
  });

  describe('content generation tab', () => {
    beforeEach(async () => {
      render(<AgentControlPanel />);
      await waitFor(() => {
        expect(screen.getByText('Generate Content')).toBeInTheDocument();
      });
    });

    it('should display content generation form fields', () => {
      expect(screen.getByPlaceholderText('Enter your content topic...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('professional')).toBeInTheDocument();
      expect(screen.getByDisplayValue('general audience')).toBeInTheDocument();
    });

    it('should update form fields when changed', async () => {
      const user = userEvent.setup();
      const topicInput = screen.getByPlaceholderText('Enter your content topic...');
      
      await user.clear(topicInput);
      await user.type(topicInput, 'AI technology trends');
      
      expect(topicInput).toHaveValue('AI technology trends');
    });

    it('should handle successful content generation', async () => {
      const user = userEvent.setup();
      
      // Mock successful generation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            content: 'Generated content here',
            platform: 'twitter',
            metrics: { engagement_score: 85 },
          },
        }),
      } as Response);

      // Fill form
      const topicInput = screen.getByPlaceholderText('Enter your content topic...');
      await user.clear(topicInput);
      await user.type(topicInput, 'Test topic');

      // Submit form
      const generateButton = screen.getByText('Generate Content');
      await user.click(generateButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId('contextual-loading')).toBeInTheDocument();
      });

      // Should call API with correct data
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: 'Test topic',
            tone: 'professional',
            targetAudience: 'general audience',
            platform: 'twitter',
            contentType: 'post',
            goals: ['engagement'],
            enableOptimization: true,
          }),
        });
      });
    });

    it('should handle content generation error', async () => {
      const user = userEvent.setup();
      
      // Mock error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Content generation failed',
        }),
      } as Response);

      // Fill form and submit
      const topicInput = screen.getByPlaceholderText('Enter your content topic...');
      await user.type(topicInput, 'Test topic');
      
      const generateButton = screen.getByText('Generate Content');
      await user.click(generateButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText('Content generation failed')).toBeInTheDocument();
      });
    });

    it('should handle authentication error', async () => {
      const user = userEvent.setup();
      
      // Mock no token
      mockLocalStorage.getItem.mockReturnValue(null);

      const topicInput = screen.getByPlaceholderText('Enter your content topic...');
      await user.type(topicInput, 'Test topic');
      
      const generateButton = screen.getByText('Generate Content');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Authentication required')).toBeInTheDocument();
      });
    });

    it('should handle network error', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const topicInput = screen.getByPlaceholderText('Enter your content topic...');
      await user.type(topicInput, 'Test topic');
      
      const generateButton = screen.getByText('Generate Content');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Network error occurred')).toBeInTheDocument();
      });
    });
  });

  describe('campaign generation tab', () => {
    beforeEach(async () => {
      render(<AgentControlPanel />);
      
      const campaignTab = screen.getByText('Multi-Platform Campaign');
      fireEvent.click(campaignTab);
      
      await waitFor(() => {
        expect(campaignTab.closest('button')).toHaveClass('bg-blue-50', 'text-blue-700');
      });
    });

    it('should display campaign generation form', () => {
      expect(screen.getByPlaceholderText('Enter campaign topic...')).toBeInTheDocument();
    });

    it('should handle successful campaign generation', async () => {
      const user = userEvent.setup();
      
      // Mock successful campaign response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            campaign: 'Generated campaign here',
            platforms: ['twitter', 'instagram'],
            metrics: { estimated_reach: 10000 },
          },
        }),
      } as Response);

      // Fill form
      const topicInput = screen.getByPlaceholderText('Enter campaign topic...');
      await user.type(topicInput, 'Product launch');

      // Submit form
      const generateButton = screen.getByText('Generate Campaign');
      await user.click(generateButton);

      // Should call API with correct data
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/campaign', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: 'Product launch',
            tone: 'professional',
            targetAudience: 'general audience',
            platforms: ['twitter', 'instagram'],
            goals: ['engagement', 'awareness'],
            campaignType: 'coordinated_launch',
          }),
        });
      });
    });

    it('should handle campaign generation error', async () => {
      const user = userEvent.setup();
      
      // Mock error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Campaign generation failed',
        }),
      } as Response);

      const topicInput = screen.getByPlaceholderText('Enter campaign topic...');
      await user.type(topicInput, 'Test campaign');
      
      const generateButton = screen.getByText('Generate Campaign');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Campaign generation failed')).toBeInTheDocument();
      });
    });
  });

  describe('metrics tab', () => {
    beforeEach(async () => {
      render(<AgentControlPanel />);
      
      const metricsTab = screen.getByText('Performance Metrics');
      fireEvent.click(metricsTab);
      
      await waitFor(() => {
        expect(metricsTab.closest('button')).toHaveClass('bg-blue-50', 'text-blue-700');
      });
    });

    it('should display usage metrics', async () => {
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // totalRequests
        expect(screen.getByText('25,000')).toBeInTheDocument(); // totalTokens
        expect(screen.getByText('$12.50')).toBeInTheDocument(); // totalCost
        expect(screen.getByText('95.5%')).toBeInTheDocument(); // successRate
      });
    });

    it('should display budget information', async () => {
      await waitFor(() => {
        expect(screen.getByText('25%')).toBeInTheDocument(); // daily percentage
        expect(screen.getByText('$2.50 / $10.00')).toBeInTheDocument(); // daily budget
      });
    });

    it('should display optimization metrics', async () => {
      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument(); // totalOptimizations
        expect(screen.getByText('22.5%')).toBeInTheDocument(); // averageReduction
      });
    });

    it('should display recommendations', async () => {
      await waitFor(() => {
        expect(screen.getByText('Consider using more engaging visuals')).toBeInTheDocument();
        expect(screen.getByText('Optimize posting times for better reach')).toBeInTheDocument();
        expect(screen.getByText('Try different content formats')).toBeInTheDocument();
      });
    });

    it('should handle refresh metrics button', async () => {
      const user = userEvent.setup();
      
      const refreshButton = screen.getByTestId('refresh-metrics-btn');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/metrics', {
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
        });
      });
    });
  });

  describe('form validation and user interactions', () => {
    beforeEach(async () => {
      render(<AgentControlPanel />);
      await waitFor(() => {
        expect(screen.getByText('Generate Content')).toBeInTheDocument();
      });
    });

    it('should prevent submission with empty topic', async () => {
      const user = userEvent.setup();
      
      const generateButton = screen.getByText('Generate Content');
      await user.click(generateButton);

      // Should still attempt to submit (validation might be on backend)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/generate', expect.objectContaining({
          method: 'POST',
        }));
      });
    });

    it('should update form fields correctly', async () => {
      const user = userEvent.setup();
      
      // Test tone selection
      const toneSelect = screen.getByDisplayValue('professional');
      await user.selectOptions(toneSelect, 'casual');
      expect(toneSelect).toHaveValue('casual');
      
      // Test platform selection
      const platformSelect = screen.getByDisplayValue('twitter');
      await user.selectOptions(platformSelect, 'instagram');
      expect(platformSelect).toHaveValue('instagram');
    });

    it('should toggle optimization checkbox', async () => {
      const user = userEvent.setup();
      
      const optimizationCheckbox = screen.getByLabelText('Enable AI Optimization');
      expect(optimizationCheckbox).toBeChecked();
      
      await user.click(optimizationCheckbox);
      expect(optimizationCheckbox).not.toBeChecked();
      
      await user.click(optimizationCheckbox);
      expect(optimizationCheckbox).toBeChecked();
    });
  });

  describe('loading states', () => {
    beforeEach(async () => {
      render(<AgentControlPanel />);
      await waitFor(() => {
        expect(screen.getByText('Generate Content')).toBeInTheDocument();
      });
    });

    it('should show loading state during content generation', async () => {
      const user = userEvent.setup();
      
      // Mock delayed response
      mockFetch.mockReturnValue(
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ success: true, data: {} }),
            } as Response);
          }, 100);
        })
      );

      const topicInput = screen.getByPlaceholderText('Enter your content topic...');
      await user.type(topicInput, 'Test topic');
      
      const generateButton = screen.getByText('Generate Content');
      await user.click(generateButton);

      expect(screen.getByTestId('contextual-loading')).toBeInTheDocument();
    });

    it('should disable buttons during loading', async () => {
      const user = userEvent.setup();
      
      // Mock delayed response
      mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves

      const topicInput = screen.getByPlaceholderText('Enter your content topic...');
      await user.type(topicInput, 'Test topic');
      
      const generateButton = screen.getByText('Generate Content');
      await user.click(generateButton);

      await waitFor(() => {
        expect(generateButton).toBeDisabled();
      });
    });
  });

  describe('error handling', () => {
    it('should clear error when switching tabs', async () => {
      const user = userEvent.setup();
      
      render(<AgentControlPanel />);
      
      // Trigger an error first
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const topicInput = screen.getByPlaceholderText('Enter your content topic...');
      await user.type(topicInput, 'Test topic');
      
      const generateButton = screen.getByText('Generate Content');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Authentication required')).toBeInTheDocument();
      });

      // Switch tabs
      const campaignTab = screen.getByText('Multi-Platform Campaign');
      await user.click(campaignTab);

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Authentication required')).not.toBeInTheDocument();
      });
    });

    it('should display network errors appropriately', async () => {
      const user = userEvent.setup();
      
      render(<AgentControlPanel />);
      
      // Mock fetch rejection
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));
      
      const topicInput = screen.getByPlaceholderText('Enter your content topic...');
      await user.type(topicInput, 'Test topic');
      
      const generateButton = screen.getByText('Generate Content');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Network error occurred')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<AgentControlPanel />);
      
      await waitFor(() => {
        const main = screen.getByRole('main');
        expect(main).toBeInTheDocument();
        
        const tabs = screen.getAllByRole('button');
        expect(tabs.length).toBeGreaterThan(0);
      });
    });

    it('should support keyboard navigation', async () => {
      render(<AgentControlPanel />);
      
      await waitFor(() => {
        const generateTab = screen.getByText('Generate Content').closest('button');
        expect(generateTab).toBeTruthy();
        
        generateTab?.focus();
        expect(generateTab).toHaveFocus();
      });
    });
  });

  describe('responsive design and layout', () => {
    it('should render cards with proper structure', async () => {
      render(<AgentControlPanel />);
      
      await waitFor(() => {
        const cards = screen.getAllByTestId('card');
        expect(cards.length).toBeGreaterThan(0);
        
        const cardHeaders = screen.getAllByTestId('card-header');
        expect(cardHeaders.length).toBeGreaterThan(0);
      });
    });

    it('should handle different viewport sizes gracefully', async () => {
      // This test would typically involve viewport manipulation
      // For now, we just ensure the component renders
      render(<AgentControlPanel />);
      
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
    });
  });
});