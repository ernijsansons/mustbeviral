/**
 * OnboardFlow Component Tests
 */

// Setup mocks before imports
const mockAuth = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  register: jest.fn(),
  completeOnboarding: jest.fn(),
  updateProfile: jest.fn(),
  isRegistering: false,
  isCompletingOnboarding: false,
  registerError: null,
  onboardingError: null
};

const mockApi = {
  updateUserProfile: jest.fn(),
  uploadAvatar: jest.fn(),
  getRecommendedSettings: jest.fn()
};

jest.mock('../../../src/hooks/api', () => ({
  useAuth: jest.fn(() => mockAuth)
}));

import React from 'react';
import { _render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OnboardFlow } from '../../../src/components/OnboardFlow';
import { TestWrapper } from '../../setup/TestWrapper';

// Mock router navigation
const mockNavigate = jest.fn();
jest.mock('wouter', () => ({
  ...jest.requireActual('../../../__mocks__/wouter.tsx'),
  useLocation: () => ['/', mockNavigate]
}));

// Import the centralized TestWrapper instead of defining a local one

// Mock file upload
const mockFile = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });

describe('OnboardFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.user = {
      id: '1',
      email: 'test@example.com',
      name: '',
      avatar: null,
      onboardingCompleted: false
    };
    mockApi.updateUserProfile.mockResolvedValue({ success: true });
    mockApi.uploadAvatar.mockResolvedValue({ avatarUrl: 'https://example.com/avatar.jpg' });
    mockApi.getRecommendedSettings.mockResolvedValue({
      recommendations: [
        { id: 'email_notifications', label: 'Email Notifications', recommended: true },
        { id: 'push_notifications', label: 'Push Notifications', recommended: false }
      ]
    });
  });

  describe('Initial Render', () => {
    it('should render account creation step initially', () => {
      render(
        <TestWrapper>
          <OnboardFlow />
        </TestWrapper>
      );

      expect(screen.getByText(/Create Your Account/i)).toBeInTheDocument();
      expect(screen.getByText(/Join the AI-powered content revolution/i)).toBeInTheDocument();
    });

    it('should show correct progress indicator on first step', () => {
      render(
        <TestWrapper>
          <OnboardFlow />
        </TestWrapper>
      );

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveStyle('width: 25%');
    });

    it('should show step counter', () => {
      render(
        <TestWrapper>
          <OnboardFlow />
        </TestWrapper>
      );

      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });
  });

  describe('Profile Setup Step', () => {
    beforeEach(async () => {
      render(
        <TestWrapper>
          <OnboardFlow />
        </TestWrapper>
      );

      // Navigate to profile setup step
      const getStartedButton = screen.getByText(/Get Started/i);
      fireEvent.click(getStartedButton);

      await waitFor(() => {
        expect(screen.getByText(/Tell us about yourself/i)).toBeInTheDocument();
      });
    });

    it('should render profile setup form', () => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Company/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Role/i)).toBeInTheDocument();
      expect(screen.getByTestId('avatar-upload')).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      const continueButton = screen.getByText(/Continue/i);
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Company is required/i)).toBeInTheDocument();
      });
    });

    it('should handle form submission with valid data', async () => {
      const nameInput = screen.getByLabelText(/Full Name/i);
      const companyInput = screen.getByLabelText(/Company/i);
      const roleSelect = screen.getByLabelText(/Role/i);

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(companyInput, { target: { value: 'Acme Corp' } });
      fireEvent.change(roleSelect, { target: { value: 'Marketing Manager' } });

      const continueButton = screen.getByText(/Continue/i);
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockApi.updateUserProfile).toHaveBeenCalledWith({
          name: 'John Doe',
          company: 'Acme Corp',
          role: 'Marketing Manager'
        });
      });
    });

    it('should handle avatar upload', async () => {
      const avatarInput = screen.getByTestId('avatar-upload-input');

      fireEvent.change(avatarInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('avatar-preview')).toBeInTheDocument();
      });

      // Fill required fields and continue
      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText(/Company/i), { target: { value: 'Acme Corp' } });

      const continueButton = screen.getByText(/Continue/i);
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockApi.uploadAvatar).toHaveBeenCalledWith(mockFile);
      });
    });

    it('should show upload progress during avatar upload', async () => {
      const avatarInput = screen.getByTestId('avatar-upload-input');

      // Mock slow upload
      mockApi.uploadAvatar.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      fireEvent.change(avatarInput, { target: { files: [mockFile] } });

      expect(screen.getByTestId('upload-progress')).toBeInTheDocument();
    });
  });

  describe('Goals Selection Step', () => {
    beforeEach(async () => {
      render(
        <TestWrapper>
          <OnboardFlow />
        </TestWrapper>
      );

      // Navigate to goals step
      fireEvent.click(screen.getByText(/Get Started/i));

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByLabelText(/Company/i), { target: { value: 'Acme Corp' } });
        fireEvent.click(screen.getByText(/Continue/i));
      });

      await waitFor(() => {
        expect(screen.getByText(/What are your main goals/i)).toBeInTheDocument();
      });
    });

    it('should render goal selection options', () => {
      expect(screen.getByText(/Increase Social Media Engagement/i)).toBeInTheDocument();
      expect(screen.getByText(/Drive Website Traffic/i)).toBeInTheDocument();
      expect(screen.getByText(/Generate Leads/i)).toBeInTheDocument();
      expect(screen.getByText(/Build Brand Awareness/i)).toBeInTheDocument();
    });

    it('should allow multiple goal selection', () => {
      const engagementGoal = screen.getByTestId('goal-engagement');
      const trafficGoal = screen.getByTestId('goal-traffic');

      fireEvent.click(engagementGoal);
      fireEvent.click(trafficGoal);

      expect(engagementGoal).toHaveClass('selected');
      expect(trafficGoal).toHaveClass('selected');
    });

    it('should require at least one goal selection', async () => {
      const continueButton = screen.getByText(/Continue/i);
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Please select at least one goal/i)).toBeInTheDocument();
      });
    });

    it('should progress to next step with valid selection', async () => {
      const engagementGoal = screen.getByTestId('goal-engagement');
      fireEvent.click(engagementGoal);

      const continueButton = screen.getByText(/Continue/i);
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Personalize your experience/i)).toBeInTheDocument();
      });
    });
  });

  describe('Preferences Step', () => {
    beforeEach(async () => {
      render(
        <TestWrapper>
          <OnboardFlow />
        </TestWrapper>
      );

      // Navigate through previous steps
      fireEvent.click(screen.getByText(/Get Started/i));

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByLabelText(/Company/i), { target: { value: 'Acme Corp' } });
        fireEvent.click(screen.getByText(/Continue/i));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('goal-engagement'));
        fireEvent.click(screen.getByText(/Continue/i));
      });

      await waitFor(() => {
        expect(screen.getByText(/Personalize your experience/i)).toBeInTheDocument();
      });
    });

    it('should load and display recommended settings', async () => {
      await waitFor(() => {
        expect(screen.getByText(/Email Notifications/i)).toBeInTheDocument();
        expect(screen.getByText(/Push Notifications/i)).toBeInTheDocument();
      });

      expect(mockApi.getRecommendedSettings).toHaveBeenCalled();
    });

    it('should pre-select recommended preferences', async () => {
      await waitFor(() => {
        const emailToggle = screen.getByTestId('preference-email_notifications');
        const pushToggle = screen.getByTestId('preference-push_notifications');

        expect(emailToggle).toBeChecked();
        expect(pushToggle).not.toBeChecked();
      });
    });

    it('should allow toggling preferences', async () => {
      await waitFor(() => {
        const emailToggle = screen.getByTestId('preference-email_notifications');
        fireEvent.click(emailToggle);
        expect(emailToggle).not.toBeChecked();
      });
    });

    it('should save preferences and continue', async () => {
      await waitFor(() => {
        const continueButton = screen.getByText(/Continue/i);
        fireEvent.click(continueButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/You're all set!/i)).toBeInTheDocument();
      });
    });
  });

  describe('Completion Step', () => {
    beforeEach(async () => {
      render(
        <TestWrapper>
          <OnboardFlow />
        </TestWrapper>
      );

      // Navigate through all steps
      fireEvent.click(screen.getByText(/Get Started/i));

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByLabelText(/Company/i), { target: { value: 'Acme Corp' } });
        fireEvent.click(screen.getByText(/Continue/i));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByTestId('goal-engagement'));
        fireEvent.click(screen.getByText(/Continue/i));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText(/Continue/i));
      });

      await waitFor(() => {
        expect(screen.getByText(/You're all set!/i)).toBeInTheDocument();
      });
    });

    it('should show completion message and summary', () => {
      expect(screen.getByText(/Welcome to your dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Go to Dashboard/i)).toBeInTheDocument();
    });

    it('should navigate to dashboard when button is clicked', () => {
      const dashboardButton = screen.getByText(/Go to Dashboard/i);
      fireEvent.click(dashboardButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should mark onboarding as completed', () => {
      expect(mockAuth.updateProfile).toHaveBeenCalledWith({
        onboardingCompleted: true
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      render(
        <TestWrapper>
          <OnboardFlow />
        </TestWrapper>
      );
    });

    it('should allow going back to previous steps', async () => {
      // Go to step 2
      fireEvent.click(screen.getByText(/Get Started/i));

      await waitFor(() => {
        expect(screen.getByText(/Tell us about yourself/i)).toBeInTheDocument();
      });

      // Go back to step 1
      const backButton = screen.getByText(/Back/i);
      fireEvent.click(backButton);

      expect(screen.getByText(/Welcome to Must Be Viral/i)).toBeInTheDocument();
    });

    it('should disable back button on first step', () => {
      const backButton = screen.queryByText(/Back/i);
      expect(backButton).not.toBeInTheDocument();
    });

    it('should update progress indicator correctly', async () => {
      const progressBar = screen.getByTestId('progress-bar');

      // Step 1
      expect(progressBar).toHaveStyle('width: 25%');

      // Navigate to step 2
      fireEvent.click(screen.getByText(/Get Started/i));

      await waitFor(() => {
        expect(progressBar).toHaveStyle('width: 50%');
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 640 });
      window.dispatchEvent(new Event('resize'));
    });

    it('should render mobile-optimized layout', () => {
      render(
        <TestWrapper>
          <OnboardFlow />
        </TestWrapper>
      );

      const container = screen.getByTestId('onboard-container');
      expect(container).toHaveClass('mobile-layout');
    });

    it('should have touch-friendly button sizes', () => {
      render(
        <TestWrapper>
          <OnboardFlow />
        </TestWrapper>
      );

      const getStartedButton = screen.getByText(/Get Started/i);
      expect(getStartedButton).toHaveClass('min-h-12'); // Touch-friendly height
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      render(
        <TestWrapper>
          <OnboardFlow />
        </TestWrapper>
      );
    });

    it('should have proper ARIA labels and roles', () => {
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('role', 'progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should support keyboard navigation', () => {
      const getStartedButton = screen.getByText(/Get Started/i);

      getStartedButton.focus();
      expect(getStartedButton).toHaveFocus();

      fireEvent.keyDown(getStartedButton, { key: 'Enter' });

      waitFor(() => {
        expect(screen.getByText(/Tell us about yourself/i)).toBeInTheDocument();
      });
    });

    it('should announce step changes to screen readers', async () => {
      const stepAnnouncement = screen.getByTestId('step-announcement');
      expect(stepAnnouncement).toHaveAttribute('aria-live', 'polite');

      fireEvent.click(screen.getByText(/Get Started/i));

      await waitFor(() => {
        expect(stepAnnouncement).toHaveTextContent('Step 2 of 4: Tell us about yourself');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApi.updateUserProfile.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <OnboardFlow />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText(/Get Started/i));

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByLabelText(/Company/i), { target: { value: 'Acme Corp' } });
        fireEvent.click(screen.getByText(/Continue/i));
      });

      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
        expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
      });
    });

    it('should retry failed operations', async () => {
      mockApi.updateUserProfile
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true });

      render(
        <TestWrapper>
          <OnboardFlow />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText(/Get Started/i));

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByLabelText(/Company/i), { target: { value: 'Acme Corp' } });
        fireEvent.click(screen.getByText(/Continue/i));
      });

      await waitFor(() => {
        const retryButton = screen.getByText(/Try Again/i);
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/What are your main goals/i)).toBeInTheDocument();
      });
    });
  });
});