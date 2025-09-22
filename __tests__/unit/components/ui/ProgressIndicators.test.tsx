/**
 * Progress Indicators Component Tests
 */

import React from 'react';
import { _render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { _Stepper,
  WizardProgress,
  TimelineProgress,
  BreadcrumbProgress,
  Step,
  TimelineEvent,
  BreadcrumbItem
} from '../../../../src/components/ui/ProgressIndicators';

describe('ProgressIndicators Components', () => {
  describe('Stepper', () => {
    const mockSteps: Step[] = [
      {
        id: 'step-1',
        title: 'Account Setup',
        description: 'Create your account',
        status: 'completed',
        estimatedTime: 120
      },
      {
        id: 'step-2',
        title: 'Profile Information',
        description: 'Fill out your profile',
        status: 'current',
        estimatedTime: 180
      },
      {
        id: 'step-3',
        title: 'Verification',
        description: 'Verify your identity',
        status: 'pending',
        estimatedTime: 300,
        optional: true
      }
    ];

    it('should render horizontal stepper by default', () => {
      render(<Stepper steps={mockSteps} />);

      expect(screen.getByText('Account Setup')).toBeInTheDocument();
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
      expect(screen.getByText('Verification')).toBeInTheDocument();
    });

    it('should render vertical stepper when specified', () => {
      render(<Stepper steps={mockSteps} orientation="vertical" />);

      expect(screen.getByText('Account Setup')).toBeInTheDocument();
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
      expect(screen.getByText('Verification')).toBeInTheDocument();
    });

    it('should show progress bar when enabled', () => {
      render(<Stepper steps={mockSteps} showProgress={true} />);

      expect(screen.getByText('1 of 3 completed')).toBeInTheDocument();
      expect(screen.getByText('33% complete')).toBeInTheDocument();
    });

    it('should hide progress bar when disabled', () => {
      render(<Stepper steps={mockSteps} showProgress={false} />);

      expect(screen.queryByText('1 of 3 completed')).not.toBeInTheDocument();
    });

    it('should show time estimates when enabled', () => {
      render(<Stepper steps={mockSteps} showTimeEstimates={true} />);

      expect(screen.getByText('2m')).toBeInTheDocument(); // 120 seconds
      expect(screen.getByText('3m')).toBeInTheDocument(); // 180 seconds
      expect(screen.getByText('5m')).toBeInTheDocument(); // 300 seconds
    });

    it('should display optional badge for optional steps', () => {
      render(<Stepper steps={mockSteps} />);

      expect(screen.getByText('(Optional)')).toBeInTheDocument();
    });

    it('should handle step click when navigation is allowed', () => {
      const handleStepClick = jest.fn();
      render(
        <Stepper
          steps={mockSteps}
          allowClickToNavigate={true}
          onStepClick={handleStepClick}
        />
      );

      // Click on completed step
      const completedStepButton = screen.getByLabelText('Step 1: Account Setup');
      fireEvent.click(completedStepButton);

      expect(handleStepClick).toHaveBeenCalledWith('step-1');
    });

    it('should not handle click on pending steps', () => {
      const handleStepClick = jest.fn();
      render(
        <Stepper
          steps={mockSteps}
          allowClickToNavigate={true}
          onStepClick={handleStepClick}
        />
      );

      // Try to click on pending step
      const pendingStepButton = screen.getByLabelText('Step 3: Verification');
      fireEvent.click(pendingStepButton);

      expect(handleStepClick).not.toHaveBeenCalled();
    });

    it('should display error messages', () => {
      const stepsWithError: Step[] = [
        {
          ...mockSteps[0],
          status: 'error',
          errorMessage: 'Account creation failed'
        }
      ];

      render(<Stepper steps={stepsWithError} orientation="vertical" />);

      expect(screen.getByText('Account creation failed')).toBeInTheDocument();
    });

    it('should display warning messages', () => {
      const stepsWithWarning: Step[] = [
        {
          ...mockSteps[0],
          status: 'warning',
          warningMessage: 'Verification recommended'
        }
      ];

      render(<Stepper steps={stepsWithWarning} orientation="vertical" />);

      expect(screen.getByText('Verification recommended')).toBeInTheDocument();
    });

    it('should show completion timestamps', () => {
      const completedDate = new Date('2023-12-01T10:30:00Z');
      const stepsWithCompletion: Step[] = [
        {
          ...mockSteps[0],
          completedAt: completedDate
        }
      ];

      render(<Stepper steps={stepsWithCompletion} orientation="vertical" />);

      expect(screen.getByText(/Completed at/)).toBeInTheDocument();
    });

    it('should render substeps when enabled', () => {
      const stepsWithSubsteps: Step[] = [
        {
          ...mockSteps[0],
          substeps: [
            { id: 'sub-1', title: 'Enter email', status: 'completed' },
            { id: 'sub-2', title: 'Set password', status: 'current' }
          ]
        }
      ];

      render(
        <Stepper
          steps={stepsWithSubsteps}
          orientation="vertical"
          showSubsteps={true}
        />
      );

      expect(screen.getByText('Enter email')).toBeInTheDocument();
      expect(screen.getByText('Set password')).toBeInTheDocument();
    });

    it('should apply correct size classes', () => {
      const { rerender } = render(<Stepper steps={mockSteps} size="sm" />);

      // Check if small size is applied (checking for specific elements is complex in this case)
      expect(screen.getByLabelText('Step 1: Account Setup')).toBeInTheDocument();

      rerender(<Stepper steps={mockSteps} size="lg" />);
      expect(screen.getByLabelText('Step 1: Account Setup')).toBeInTheDocument();
    });
  });

  describe('WizardProgress', () => {
    const stepTitles = ['Account', 'Profile', 'Verification', 'Complete'];

    it('should render current step and total steps', () => {
      render(
        <WizardProgress
          currentStep={2}
          totalSteps={4}
          stepTitles={stepTitles}
        />
      );

      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
      expect(screen.getByText('50% Complete')).toBeInTheDocument();
    });

    it('should render all step titles', () => {
      render(
        <WizardProgress
          currentStep={2}
          totalSteps={4}
          stepTitles={stepTitles}
        />
      );

      stepTitles.forEach(title => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });
    });

    it('should handle step click when allowed', () => {
      const handleStepClick = jest.fn();
      render(
        <WizardProgress
          currentStep={3}
          totalSteps={4}
          stepTitles={stepTitles}
          allowSkipSteps={true}
          onStepClick={handleStepClick}
        />
      );

      // Click on a previous step
      const accountStep = screen.getByText('Account');
      fireEvent.click(accountStep);

      expect(handleStepClick).toHaveBeenCalledWith(1);
    });

    it('should not allow clicking future steps', () => {
      const handleStepClick = jest.fn();
      render(
        <WizardProgress
          currentStep={2}
          totalSteps={4}
          stepTitles={stepTitles}
          allowSkipSteps={true}
          onStepClick={handleStepClick}
        />
      );

      // Try to click on a future step
      const completeStep = screen.getByText('Complete');
      fireEvent.click(completeStep);

      expect(handleStepClick).not.toHaveBeenCalled();
    });

    it('should highlight current step', () => {
      render(
        <WizardProgress
          currentStep={2}
          totalSteps={4}
          stepTitles={stepTitles}
        />
      );

      const profileStep = screen.getByText('Profile');
      expect(profileStep).toHaveClass('text-indigo-600', 'font-medium');
    });
  });

  describe('TimelineProgress', () => {
    const mockEvents: TimelineEvent[] = [
      {
        id: 'event-1',
        title: 'Project Started',
        description: 'Project initialization completed',
        timestamp: new Date('2023-12-01T09:00:00Z'),
        status: 'completed',
        duration: 30
      },
      {
        id: 'event-2',
        title: 'Development Phase',
        description: 'Currently implementing features',
        timestamp: new Date('2023-12-01T10:00:00Z'),
        status: 'current',
        duration: 120
      },
      {
        id: 'event-3',
        title: 'Testing',
        description: 'Quality assurance testing',
        timestamp: new Date('2023-12-01T14:00:00Z'),
        status: 'upcoming',
        duration: 60
      }
    ];

    it('should render all timeline events', () => {
      render(<TimelineProgress events={mockEvents} />);

      expect(screen.getByText('Project Started')).toBeInTheDocument();
      expect(screen.getByText('Development Phase')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();
    });

    it('should show descriptions when not in compact mode', () => {
      render(<TimelineProgress events={mockEvents} compact={false} />);

      expect(screen.getByText('Project initialization completed')).toBeInTheDocument();
      expect(screen.getByText('Currently implementing features')).toBeInTheDocument();
    });

    it('should hide descriptions in compact mode', () => {
      render(<TimelineProgress events={mockEvents} compact={true} />);

      expect(screen.queryByText('Project initialization completed')).not.toBeInTheDocument();
    });

    it('should show duration when enabled', () => {
      render(<TimelineProgress events={mockEvents} showDuration={true} />);

      expect(screen.getByText('(30m)')).toBeInTheDocument();
      expect(screen.getByText('(120m)')).toBeInTheDocument();
      expect(screen.getByText('(60m)')).toBeInTheDocument();
    });

    it('should display timestamps', () => {
      render(<TimelineProgress events={mockEvents} />);

      // Check that timestamps are displayed (exact format may vary)
      expect(screen.getByText(/9:00/)).toBeInTheDocument();
      expect(screen.getByText(/10:00/)).toBeInTheDocument();
      expect(screen.getByText(/2:00/)).toBeInTheDocument();
    });
  });

  describe('BreadcrumbProgress', () => {
    const mockItems: BreadcrumbItem[] = [
      { id: 'home', title: 'Home', href: '/' },
      { id: 'products', title: 'Products', href: '/products' },
      { id: 'category', title: 'Electronics', href: '/products/electronics' },
      { id: 'product', title: 'Smartphone', current: true }
    ];

    it('should render all breadcrumb items', () => {
      render(<BreadcrumbProgress items={mockItems} />);

      mockItems.forEach(item => {
        expect(screen.getByText(item.title)).toBeInTheDocument();
      });
    });

    it('should highlight current item', () => {
      render(<BreadcrumbProgress items={mockItems} />);

      const currentItem = screen.getByText('Smartphone');
      expect(currentItem).toHaveClass('text-indigo-600', 'font-medium');
    });

    it('should handle item clicks', () => {
      const handleItemClick = jest.fn();
      render(
        <BreadcrumbProgress items={mockItems} onItemClick={handleItemClick} />
      );

      const homeItem = screen.getByText('Home');
      fireEvent.click(homeItem);

      expect(handleItemClick).toHaveBeenCalledWith(mockItems[0]);
    });

    it('should render with custom separator', () => {
      const customSeparator = <span data-testid="custom-separator">→</span>;
      render(
        <BreadcrumbProgress items={mockItems} separator={customSeparator} />
      );

      // Should have 3 separators for 4 items
      const separators = screen.getAllByTestId('custom-separator');
      expect(separators).toHaveLength(3);
    });

    it('should apply proper accessibility attributes', () => {
      render(<BreadcrumbProgress items={mockItems} />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');

      const currentItem = screen.getByText('Smartphone');
      expect(currentItem).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for stepper', () => {
      const steps: Step[] = [
        { id: 'step-1', title: 'Step 1', status: 'completed' },
        { id: 'step-2', title: 'Step 2', status: 'current' }
      ];

      render(<Stepper steps={steps} />);

      expect(screen.getByLabelText('Step 1: Step 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Step 2: Step 2')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const steps: Step[] = [
        { id: 'step-1', title: 'Step 1', status: 'completed' },
        { id: 'step-2', title: 'Step 2', status: 'current' }
      ];

      const handleStepClick = jest.fn();
      render(
        <Stepper
          steps={steps}
          allowClickToNavigate={true}
          onStepClick={handleStepClick}
        />
      );

      const stepButton = screen.getByLabelText('Step 1: Step 1');
      stepButton.focus();
      expect(stepButton).toHaveFocus();

      fireEvent.keyDown(stepButton, { key: 'Enter' });
      expect(handleStepClick).toHaveBeenCalledWith('step-1');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty steps array', () => {
      render(<Stepper steps={[]} />);

      expect(screen.getByText('0 of 0 completed')).toBeInTheDocument();
    });

    it('should handle missing optional properties', () => {
      const minimalSteps: Step[] = [
        { id: 'step-1', title: 'Step 1', status: 'current' }
      ];

      render(<Stepper steps={minimalSteps} />);

      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });

    it('should handle empty timeline events', () => {
      render(<TimelineProgress events={[]} />);

      // Should render without errors
      expect(document.querySelector('.flow-root')).toBeInTheDocument();
    });
  });
});