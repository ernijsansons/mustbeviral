/**
 * Loading States Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner,
  PageLoading,
  LoadingButton,
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  ProgressBar,
  CircularProgress,
  DashboardLoading,
  ContentLoading,
  ContextualLoading
} from '../../../../src/components/ui/LoadingStates';

describe('LoadingStates Components', () => {
  describe('LoadingSpinner', () => {
    it('should render with default props', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should apply size classes correctly', () => {
      const { rerender } = render(<LoadingSpinner size="sm" />);
      expect(screen.getByTestId('loading-spinner')).toHaveClass('w-4', 'h-4');

      rerender(<LoadingSpinner size="lg" />);
      expect(screen.getByTestId('loading-spinner')).toHaveClass('w-8', 'h-8');
    });

    it('should apply color classes correctly', () => {
      const { rerender } = render(<LoadingSpinner color="primary" />);
      expect(screen.getByTestId('loading-spinner')).toHaveClass('text-indigo-600');

      rerender(<LoadingSpinner color="white" />);
      expect(screen.getByTestId('loading-spinner')).toHaveClass('text-white');
    });

    it('should accept custom className', () => {
      render(<LoadingSpinner className="custom-class" />);
      expect(screen.getByTestId('loading-spinner')).toHaveClass('custom-class');
    });
  });

  describe('PageLoading', () => {
    it('should render with default message', () => {
      render(<PageLoading />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render custom message and description', () => {
      render(
        <PageLoading
          message="Custom Loading"
          description="Please wait while we load your content"
        />
      );

      expect(screen.getByText('Custom Loading')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we load your content')).toBeInTheDocument();
    });

    it('should render animated version by default', () => {
      render(<PageLoading />);

      // Should have animated elements
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should render non-animated version when specified', () => {
      render(<PageLoading animated={false} />);

      // Should have loading spinner instead of custom animation
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('LoadingButton', () => {
    it('should render children when not loading', () => {
      render(<LoadingButton>Click me</LoadingButton>);

      expect(screen.getByText('Click me')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('should show loading spinner when loading', () => {
      render(<LoadingButton loading>Click me</LoadingButton>);

      expect(screen.getByText('Click me')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should be disabled when loading', () => {
      render(<LoadingButton loading>Click me</LoadingButton>);

      const button = screen.getByTestId('loading-button');
      expect(button).toBeDisabled();
    });

    it('should handle click events when not loading', () => {
      const handleClick = jest.fn();
      render(<LoadingButton onClick={handleClick}>Click me</LoadingButton>);

      const button = screen.getByTestId('loading-button');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not handle click events when loading', () => {
      const handleClick = jest.fn();
      render(<LoadingButton loading onClick={handleClick}>Click me</LoadingButton>);

      const button = screen.getByTestId('loading-button');
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should apply variant classes correctly', () => {
      const { rerender } = render(<LoadingButton variant="primary">Button</LoadingButton>);
      expect(screen.getByTestId('loading-button')).toHaveClass('bg-indigo-600');

      rerender(<LoadingButton variant="outline">Button</LoadingButton>);
      expect(screen.getByTestId('loading-button')).toHaveClass('border-indigo-600');
    });

    it('should apply size classes correctly', () => {
      const { rerender } = render(<LoadingButton size="sm">Button</LoadingButton>);
      expect(screen.getByTestId('loading-button')).toHaveClass('px-3', 'py-1.5');

      rerender(<LoadingButton size="lg">Button</LoadingButton>);
      expect(screen.getByTestId('loading-button')).toHaveClass('px-6', 'py-3');
    });
  });

  describe('Skeleton', () => {
    it('should render with default props', () => {
      render(<Skeleton />);

      const skeleton = screen.getByLabelText('Loading content');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('bg-gray-200', 'rounded', 'animate-pulse');
    });

    it('should apply custom dimensions', () => {
      render(<Skeleton width="200px" height="50px" />);

      const skeleton = screen.getByLabelText('Loading content');
      expect(skeleton).toHaveStyle({ width: '200px', height: '50px' });
    });

    it('should apply rounded class when specified', () => {
      render(<Skeleton rounded />);

      const skeleton = screen.getByLabelText('Loading content');
      expect(skeleton).toHaveClass('rounded-full');
    });

    it('should not animate when specified', () => {
      render(<Skeleton animated={false} />);

      const skeleton = screen.getByLabelText('Loading content');
      expect(skeleton).not.toHaveClass('animate-pulse');
    });
  });

  describe('CardSkeleton', () => {
    it('should render card skeleton structure', () => {
      render(<CardSkeleton />);

      // Should have multiple skeleton elements
      const skeletons = screen.getAllByLabelText('Loading content');
      expect(skeletons.length).toBeGreaterThan(1);
    });

    it('should apply custom className', () => {
      render(<CardSkeleton className="custom-card" />);

      const container = document.querySelector('.custom-card');
      expect(container).toBeInTheDocument();
    });
  });

  describe('TableSkeleton', () => {
    it('should render with default rows and columns', () => {
      render(<TableSkeleton />);

      // Should have multiple skeleton elements for table structure
      const skeletons = screen.getAllByLabelText('Loading content');
      expect(skeletons.length).toBeGreaterThan(1);
    });

    it('should render custom number of rows and columns', () => {
      render(<TableSkeleton rows={3} columns={2} />);

      // Should have skeleton elements for header + 3 rows, each with 2 columns
      const skeletons = screen.getAllByLabelText('Loading content');
      expect(skeletons.length).toBe(8); // 2 header + 6 row cells (3 rows × 2 columns)
    });
  });

  describe('ProgressBar', () => {
    it('should render with correct progress percentage', () => {
      render(<ProgressBar value={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should show value when specified', () => {
      render(<ProgressBar value={75} showValue />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should show label when provided', () => {
      render(<ProgressBar value={30} label="Upload Progress" />);

      expect(screen.getByText('Upload Progress')).toBeInTheDocument();
    });

    it('should handle custom max value', () => {
      render(<ProgressBar value={250} max={1000} showValue />);

      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('should apply color classes correctly', () => {
      const { rerender } = render(<ProgressBar value={50} color="success" />);
      expect(document.querySelector('.bg-green-600')).toBeInTheDocument();

      rerender(<ProgressBar value={50} color="danger" />);
      expect(document.querySelector('.bg-red-600')).toBeInTheDocument();
    });

    it('should clamp values between 0 and max', () => {
      const { rerender } = render(<ProgressBar value={-10} showValue />);
      expect(screen.getByText('0%')).toBeInTheDocument();

      rerender(<ProgressBar value={150} showValue />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('CircularProgress', () => {
    it('should render with correct attributes', () => {
      render(<CircularProgress value={60} />);

      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('should render without value when showValue is false', () => {
      render(<CircularProgress value={60} showValue={false} />);

      expect(screen.queryByText('60%')).not.toBeInTheDocument();
    });

    it('should show label when provided', () => {
      render(<CircularProgress value={80} label="Completion" />);

      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('Completion')).toBeInTheDocument();
    });

    it('should handle custom max value', () => {
      render(<CircularProgress value={150} max={300} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('DashboardLoading', () => {
    it('should render dashboard loading structure', () => {
      render(<DashboardLoading />);

      // Should have multiple skeleton elements for dashboard layout
      const skeletons = screen.getAllByLabelText('Loading content');
      expect(skeletons.length).toBeGreaterThan(5);
    });
  });

  describe('ContentLoading', () => {
    it('should render content loading structure', () => {
      render(<ContentLoading />);

      // Should have multiple skeleton elements for content grid
      const skeletons = screen.getAllByLabelText('Loading content');
      expect(skeletons.length).toBeGreaterThan(5);
    });
  });

  describe('ContextualLoading', () => {
    it('should render dashboard context', () => {
      render(<ContextualLoading context="dashboard" />);

      expect(screen.getByText('Loading your dashboard')).toBeInTheDocument();
      expect(screen.getByText('Gathering your latest analytics and content performance')).toBeInTheDocument();
    });

    it('should render content context', () => {
      render(<ContextualLoading context="content" />);

      expect(screen.getByText('Loading content')).toBeInTheDocument();
      expect(screen.getByText('Fetching your viral content and trend insights')).toBeInTheDocument();
    });

    it('should render upload context with progress', () => {
      render(<ContextualLoading context="upload" progress={45} />);

      expect(screen.getByText('Uploading content')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should render processing context', () => {
      render(<ContextualLoading context="processing" />);

      expect(screen.getByText('Processing content')).toBeInTheDocument();
      expect(screen.getByText('Analyzing virality potential and optimizing for engagement')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<ContextualLoading context="analytics" className="custom-loading" />);

      const container = document.querySelector('.custom-loading');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for progress bars', () => {
      render(<ProgressBar value={50} label="File upload" />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'File upload');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should have proper labels for loading elements', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByLabelText('Loading');
      expect(spinner).toBeInTheDocument();
    });

    it('should have proper labels for skeleton elements', () => {
      render(<Skeleton />);

      const skeleton = screen.getByLabelText('Loading content');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const { rerender } = render(<LoadingSpinner />);

      // Multiple re-renders with same props should not cause issues
      rerender(<LoadingSpinner />);
      rerender(<LoadingSpinner />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should handle rapid progress updates', () => {
      const { rerender } = render(<ProgressBar value={0} showValue />);

      // Simulate rapid progress updates
      for (let i = 0; i <= 100; i += 10) {
        rerender(<ProgressBar value={i} showValue />);
      }

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });
});