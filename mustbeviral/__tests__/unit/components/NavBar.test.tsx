/**
 * NavBar Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NavBar from '../../../src/components/NavBar';
import { TestWrapper } from '../../setup/TestWrapper';

// Mock useAuth hook
const mockAuth = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isError: false,
  error: null,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  completeOnboarding: jest.fn(),
  isLoggingIn: false,
  isRegistering: false,
  isLoggingOut: false,
  isCompletingOnboarding: false,
  loginError: null,
  registerError: null,
  logoutError: null,
  onboardingError: null
};

jest.mock('../../../src/hooks/api', () => ({
  useAuth: jest.fn(() => mockAuth)
}));

// Mock router navigation
const mockSetLocation = jest.fn();
const mockNavigate = mockSetLocation; // For test compatibility
jest.mock('wouter', () => ({
  ...jest.requireActual('../../../__mocks__/wouter.tsx'),
  useLocation: () => ['/', mockSetLocation]
}));

// Using centralized TestWrapper with QueryClientProvider

describe('NavBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.user = null;
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = false;
  });

  describe('Unauthenticated State', () => {
    it('should render brand logo and sign in button when user is not authenticated', () => {
      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      expect(screen.getByText('Must Be Viral')).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('should show loading state when auth is loading', () => {
      mockAuth.isLoading = true;

      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      expect(screen.getByTestId('nav-loading')).toBeInTheDocument();
    });

    it('should navigate to login when sign in button is clicked', () => {
      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const signInButton = screen.getByText('Sign In');
      fireEvent.click(signInButton);

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockAuth.user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg'
      };
      mockAuth.isAuthenticated = true;
    });

    it('should render navigation items when user is authenticated', () => {
      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Matches')).toBeInTheDocument();
      expect(screen.getByText('Monitoring')).toBeInTheDocument();
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    });

    it('should show user avatar and dropdown menu', async () => {
      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const userButton = screen.getByTestId('button-user-menu');
      expect(userButton).toBeInTheDocument();

      fireEvent.click(userButton);

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
      });
    });

    it('should handle logout when sign out is clicked', async () => {
      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const userButton = screen.getByTestId('button-user-menu');
      fireEvent.click(userButton);

      await waitFor(() => {
        const signOutButton = screen.getByText('Sign Out');
        fireEvent.click(signOutButton);
      });

      expect(mockAuth.logout).toHaveBeenCalled();
    });

    it('should close dropdown when clicking outside', async () => {
      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const userButton = screen.getByTestId('button-user-menu');
      fireEvent.click(userButton);

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });

      // Click outside the dropdown
      fireEvent.click(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      });
    });
  });

  describe('Mobile Navigation', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640,
      });
    });

    it('should render mobile menu button on small screens', () => {
      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      expect(screen.getByTestId('mobile-menu-button')).toBeInTheDocument();
    });

    it('should toggle mobile menu when button is clicked', async () => {
      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const mobileMenuButton = screen.getByTestId('mobile-menu-button');

      // Menu should be closed initially
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();

      fireEvent.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      });

      // Click again to close
      fireEvent.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
      });
    });

    it('should close mobile menu when navigation item is clicked', async () => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = { id: '1', email: 'test@example.com', name: 'Test User' };

      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const mobileMenuButton = screen.getByTestId('mobile-menu-button');
      fireEvent.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      });

      const dashboardLink = screen.getByText('Dashboard');
      fireEvent.click(dashboardLink);

      await waitFor(() => {
        expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation Links', () => {
    beforeEach(() => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = { id: '1', email: 'test@example.com', name: 'Test User' };
    });

    it('should navigate to dashboard when dashboard link is clicked', () => {
      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const dashboardLink = screen.getByText('Dashboard');
      fireEvent.click(dashboardLink);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to analytics when analytics link is clicked', () => {
      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const analyticsLink = screen.getByText('Analytics');
      fireEvent.click(analyticsLink);

      expect(mockNavigate).toHaveBeenCalledWith('/analytics');
    });

    it('should navigate to settings when settings link is clicked', () => {
      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const settingsLink = screen.getByText('Settings');
      fireEvent.click(settingsLink);

      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('should highlight active navigation item', () => {
      // Mock current location
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      jest.spyOn(require('react-router-dom'), 'useLocation').mockReturnValue({
        pathname: '/dashboard'
      });

      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const dashboardLink = screen.getByText('Dashboard');
      expect(dashboardLink.closest('a')).toHaveClass('text-indigo-600');
    });
  });

  describe('Notifications', () => {
    beforeEach(() => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = { id: '1', email: 'test@example.com', name: 'Test User' };
    });

    it('should show notification badge when there are unread notifications', () => {
      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const notificationButton = screen.getByTestId('notification-button');
      const badge = screen.getByTestId('notification-badge');

      expect(notificationButton).toBeInTheDocument();
      expect(badge).toBeInTheDocument();
    });

    it('should open notification panel when notification button is clicked', async () => {
      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const notificationButton = screen.getByTestId('notification-button');
      fireEvent.click(notificationButton);

      await waitFor(() => {
        expect(screen.getByTestId('notification-panel')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for navigation elements', () => {
      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('should have proper keyboard navigation support', () => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = { id: '1', email: 'test@example.com', name: 'Test User' };

      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const userButton = screen.getByTestId('button-user-menu');

      // Should be focusable
      expect(userButton).toHaveAttribute('tabIndex', '0');

      // Should respond to Enter key
      fireEvent.keyDown(userButton, { key: 'Enter', code: 'Enter' });

      waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });
    });

    it('should have proper screen reader support for user menu', async () => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = { id: '1', email: 'test@example.com', name: 'Test User' };

      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const userButton = screen.getByTestId('button-user-menu');
      expect(userButton).toHaveAttribute('aria-expanded', 'false');
      expect(userButton).toHaveAttribute('aria-haspopup', 'true');

      fireEvent.click(userButton);

      await waitFor(() => {
        expect(userButton).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should hide desktop navigation on mobile screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 640 });

      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const desktopNav = screen.queryByTestId('desktop-navigation');
      expect(desktopNav).not.toBeVisible();
    });

    it('should show desktop navigation on larger screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });

      render(
        <TestWrapper>
          <NavBar />
        </TestWrapper>
      );

      const desktopNav = screen.getByTestId('desktop-navigation');
      expect(desktopNav).toBeVisible();
    });
  });
});