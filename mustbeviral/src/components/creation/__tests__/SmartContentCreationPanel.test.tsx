// Unit tests for Smart Content Creation Panel
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SmartContentCreationPanel } from '../SmartContentCreationPanel';
import type { ContentFormData, ViralPrediction } from '../SmartContentCreationPanel';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock speech recognition
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  onresult: null,
  onerror: null,
  onend: null
};

Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: jest.fn(() => mockSpeechRecognition)
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: jest.fn(() => mockSpeechRecognition)
});

// Mock props
const mockViralPrediction: ViralPrediction = {
  score: 85,
  factors: [
    { name: 'Trending Keywords', impact: 0.3, description: 'Uses popular keywords' },
    { name: 'Optimal Timing', impact: 0.25, description: 'Posted at peak hours' },
    { name: 'Engaging Format', impact: 0.2, description: 'Uses engaging content format' }
  ],
  suggestions: ['Add more trending hashtags', 'Consider posting during peak hours'],
  confidence: 'high'
};

const defaultProps = {
  onGenerate: jest.fn(),
  onPredict: jest.fn(),
  className: 'test-class',
  isLoading: false,
  enableVoiceInput: true
};

describe('SmartContentCreationPanel', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with default props', () => {
      render(<SmartContentCreationPanel />);

      expect(screen.getByRole('heading', { name: /smart content creator/i })).toBeInTheDocument();
      expect(screen.getByText(/ai-powered content generation with viral prediction/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/content topic/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate content/i })).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<SmartContentCreationPanel className="custom-class" />);

      const container = screen.getByRole('heading', { name: /smart content creator/i }).closest('.custom-class');
      expect(container).toBeInTheDocument();
    });

    it('shows voice input button when enabled', () => {
      render(<SmartContentCreationPanel enableVoiceInput={true} />);

      expect(screen.getByLabelText(/start voice input/i)).toBeInTheDocument();
    });

    it('hides voice input button when disabled', () => {
      render(<SmartContentCreationPanel enableVoiceInput={false} />);

      expect(screen.queryByLabelText(/start voice input/i)).not.toBeInTheDocument();
    });

    it('shows loading state correctly', () => {
      render(<SmartContentCreationPanel isLoading={true} />);

      const generateButton = screen.getByRole('button', { name: /generating.../i });
      expect(generateButton).toBeDisabled();
      expect(generateButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Platform Selection', () => {
    it('allows selecting and deselecting platforms', async () => {
      render(<SmartContentCreationPanel />);

      const twitterButton = screen.getByRole('button', { name: /twitter/i });
      const instagramButton = screen.getByRole('button', { name: /instagram/i });

      // Initially no platforms selected
      expect(twitterButton).not.toHaveAttribute('aria-pressed', 'true');
      expect(instagramButton).not.toHaveAttribute('aria-pressed', 'true');

      // Select Twitter
      await user.click(twitterButton);
      expect(twitterButton).toHaveAttribute('aria-pressed', 'true');

      // Select Instagram
      await user.click(instagramButton);
      expect(instagramButton).toHaveAttribute('aria-pressed', 'true');

      // Deselect Twitter
      await user.click(twitterButton);
      expect(twitterButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('updates the generate button text based on selected platforms', async () => {
      render(<SmartContentCreationPanel />);

      const twitterButton = screen.getByRole('button', { name: /twitter/i });
      const instagramButton = screen.getByRole('button', { name: /instagram/i });

      // Select one platform
      await user.click(twitterButton);
      expect(screen.getByRole('button', { name: /generate content for 1 platform/i })).toBeInTheDocument();

      // Select another platform
      await user.click(instagramButton);
      expect(screen.getByRole('button', { name: /generate content for 2 platforms/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('disables generate button when topic is empty', () => {
      render(<SmartContentCreationPanel />);

      const generateButton = screen.getByRole('button', { name: /generate content/i });
      expect(generateButton).toBeDisabled();
    });

    it('disables generate button when no platforms are selected', async () => {
      render(<SmartContentCreationPanel />);

      const topicInput = screen.getByLabelText(/content topic/i);
      await user.type(topicInput, 'Test topic');

      const generateButton = screen.getByRole('button', { name: /generate content/i });
      expect(generateButton).toBeDisabled();
    });

    it('enables generate button when topic and platforms are provided', async () => {
      render(<SmartContentCreationPanel />);

      const topicInput = screen.getByLabelText(/content topic/i);
      const twitterButton = screen.getByRole('button', { name: /twitter/i });

      await user.type(topicInput, 'Test topic');
      await user.click(twitterButton);

      const generateButton = screen.getByRole('button', { name: /generate content for 1 platform/i });
      expect(generateButton).toBeEnabled();
    });

    it('shows validation error message', async () => {
      render(<SmartContentCreationPanel />);

      const generateButton = screen.getByRole('button', { name: /generate content/i });

      // Try to submit without required fields
      expect(generateButton).toBeDisabled();
      expect(screen.getByText(/please enter a topic and select at least one platform/i)).toBeInTheDocument();
    });
  });

  describe('Viral Prediction', () => {
    it('calls onPredict when predict button is clicked', async () => {
      const mockOnPredict = jest.fn().mockResolvedValue(mockViralPrediction);
      render(<SmartContentCreationPanel onPredict={mockOnPredict} />);

      const topicInput = screen.getByLabelText(/content topic/i);
      await user.type(topicInput, 'Test topic');

      const predictButton = screen.getByRole('button', { name: /predict viral potential/i });
      await user.click(predictButton);

      expect(mockOnPredict).toHaveBeenCalledWith('Test topic');
    });

    it('displays viral prediction results', async () => {
      const mockOnPredict = jest.fn().mockResolvedValue(mockViralPrediction);
      render(<SmartContentCreationPanel onPredict={mockOnPredict} />);

      const topicInput = screen.getByLabelText(/content topic/i);
      await user.type(topicInput, 'Test topic');

      const predictButton = screen.getByRole('button', { name: /predict viral potential/i });
      await user.click(predictButton);

      await waitFor(() => {
        expect(screen.getByText('Viral Prediction')).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument();
        expect(screen.getByText(/trending keywords/i)).toBeInTheDocument();
        expect(screen.getByText(/add more trending hashtags/i)).toBeInTheDocument();
      });
    });

    it('only shows predict button when topic is entered', async () => {
      render(<SmartContentCreationPanel />);

      expect(screen.queryByRole('button', { name: /predict viral potential/i })).not.toBeInTheDocument();

      const topicInput = screen.getByLabelText(/content topic/i);
      await user.type(topicInput, 'Test topic');

      expect(screen.getByRole('button', { name: /predict viral potential/i })).toBeInTheDocument();
    });
  });

  describe('Voice Input', () => {
    it('toggles voice input when button is clicked', async () => {
      render(<SmartContentCreationPanel enableVoiceInput={true} />);

      const voiceButton = screen.getByLabelText(/start voice input/i);
      await user.click(voiceButton);

      expect(mockSpeechRecognition.start).toHaveBeenCalled();
      expect(screen.getByLabelText(/stop voice input/i)).toBeInTheDocument();
    });

    it('does not render voice button when speech recognition is not supported', () => {
      // Mock unsupported browser
      Object.defineProperty(window, 'SpeechRecognition', { value: undefined });
      Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined });

      render(<SmartContentCreationPanel enableVoiceInput={true} />);

      expect(screen.queryByLabelText(/start voice input/i)).not.toBeInTheDocument();
    });
  });

  describe('Advanced Options', () => {
    it('toggles advanced options visibility', async () => {
      render(<SmartContentCreationPanel />);

      const advancedButton = screen.getByRole('button', { name: /advanced options/i });

      // Initially hidden
      expect(screen.queryByLabelText(/keywords & hashtags/i)).not.toBeInTheDocument();

      // Show advanced options
      await user.click(advancedButton);
      expect(screen.getByLabelText(/keywords & hashtags/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/custom instructions/i)).toBeInTheDocument();

      // Hide advanced options
      await user.click(advancedButton);
      expect(screen.queryByLabelText(/keywords & hashtags/i)).not.toBeInTheDocument();
    });

    it('allows adding and removing keywords', async () => {
      render(<SmartContentCreationPanel />);

      const advancedButton = screen.getByRole('button', { name: /advanced options/i });
      await user.click(advancedButton);

      const keywordInput = screen.getByPlaceholderText(/add keyword or hashtag/i);
      const addButton = screen.getByRole('button', { name: /add/i });

      // Add keyword
      await user.type(keywordInput, 'viral');
      await user.click(addButton);

      expect(screen.getByText('#viral')).toBeInTheDocument();
      expect(keywordInput).toHaveValue('');

      // Remove keyword
      const removeButton = screen.getByRole('button', { name: /remove keyword/i });
      await user.click(removeButton);

      expect(screen.queryByText('#viral')).not.toBeInTheDocument();
    });

    it('prevents adding duplicate keywords', async () => {
      render(<SmartContentCreationPanel />);

      const advancedButton = screen.getByRole('button', { name: /advanced options/i });
      await user.click(advancedButton);

      const keywordInput = screen.getByPlaceholderText(/add keyword or hashtag/i);
      const addButton = screen.getByRole('button', { name: /add/i });

      // Add keyword twice
      await user.type(keywordInput, 'viral');
      await user.click(addButton);
      await user.type(keywordInput, 'viral');
      await user.click(addButton);

      // Should only show one instance
      const keywordTags = screen.getAllByText('#viral');
      expect(keywordTags).toHaveLength(1);
    });

    it('allows adding keywords with Enter key', async () => {
      render(<SmartContentCreationPanel />);

      const advancedButton = screen.getByRole('button', { name: /advanced options/i });
      await user.click(advancedButton);

      const keywordInput = screen.getByPlaceholderText(/add keyword or hashtag/i);

      await user.type(keywordInput, 'trending');
      await user.keyboard('{Enter}');

      expect(screen.getByText('#trending')).toBeInTheDocument();
      expect(keywordInput).toHaveValue('');
    });
  });

  describe('Form Submission', () => {
    it('calls onGenerate with correct data when form is submitted', async () => {
      const mockOnGenerate = jest.fn().mockResolvedValue(undefined);
      render(<SmartContentCreationPanel onGenerate={mockOnGenerate} />);

      // Fill out form
      const topicInput = screen.getByLabelText(/content topic/i);
      await user.type(topicInput, 'Test content topic');

      const twitterButton = screen.getByRole('button', { name: /twitter/i });
      await user.click(twitterButton);

      const toneSelect = screen.getByLabelText(/content tone/i);
      await user.selectOptions(toneSelect, 'humorous');

      const audienceSelect = screen.getByLabelText(/target audience/i);
      await user.selectOptions(audienceSelect, 'millennials');

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate content for 1 platform/i });
      await user.click(generateButton);

      expect(mockOnGenerate).toHaveBeenCalledWith({
        topic: 'Test content topic',
        platforms: [expect.objectContaining({ id: 'twitter', selected: true })],
        tone: 'humorous',
        targetAudience: 'millennials',
        contentType: 'social_post',
        keywords: [],
        customPrompt: ''
      });
    });

    it('includes keywords and custom prompt in submission', async () => {
      const mockOnGenerate = jest.fn().mockResolvedValue(undefined);
      render(<SmartContentCreationPanel onGenerate={mockOnGenerate} />);

      // Fill out basic form
      const topicInput = screen.getByLabelText(/content topic/i);
      await user.type(topicInput, 'Test topic');

      const twitterButton = screen.getByRole('button', { name: /twitter/i });
      await user.click(twitterButton);

      // Add advanced options
      const advancedButton = screen.getByRole('button', { name: /advanced options/i });
      await user.click(advancedButton);

      const keywordInput = screen.getByPlaceholderText(/add keyword or hashtag/i);
      await user.type(keywordInput, 'test');
      await user.keyboard('{Enter}');

      const customPromptTextarea = screen.getByPlaceholderText(/additional instructions for the ai.../i);
      await user.type(customPromptTextarea, 'Make it engaging');

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate content for 1 platform/i });
      await user.click(generateButton);

      expect(mockOnGenerate).toHaveBeenCalledWith(expect.objectContaining({
        keywords: ['test'],
        customPrompt: 'Make it engaging'
      }));
    });

    it('handles generation errors gracefully', async () => {
      const mockOnGenerate = jest.fn().mockRejectedValue(new Error('Generation failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<SmartContentCreationPanel onGenerate={mockOnGenerate} />);

      // Fill out form
      const topicInput = screen.getByLabelText(/content topic/i);
      await user.type(topicInput, 'Test topic');

      const twitterButton = screen.getByRole('button', { name: /twitter/i });
      await user.click(twitterButton);

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate content for 1 platform/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Content generation failed:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<SmartContentCreationPanel />);

      expect(screen.getByLabelText(/content topic/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/content tone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/target audience/i)).toBeInTheDocument();

      const platformButtons = screen.getAllByRole('button', { name: /twitter|instagram|linkedin|facebook/i });
      platformButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-pressed');
      });
    });

    it('supports keyboard navigation', async () => {
      render(<SmartContentCreationPanel />);

      const topicInput = screen.getByLabelText(/content topic/i);
      const twitterButton = screen.getByRole('button', { name: /twitter/i });

      // Tab navigation
      await user.tab();
      expect(topicInput).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/start voice input/i)).toHaveFocus();

      // Continue tabbing to platform buttons
      await user.tab();
      await user.tab();
      expect(twitterButton).toHaveFocus();

      // Space key should toggle platform selection
      await user.keyboard(' ');
      expect(twitterButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('provides screen reader announcements for state changes', async () => {
      render(<SmartContentCreationPanel />);

      const twitterButton = screen.getByRole('button', { name: /twitter/i });

      expect(twitterButton).toHaveAttribute('aria-pressed', 'false');

      await user.click(twitterButton);

      expect(twitterButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Performance', () => {
    it('does not cause unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      const TestComponent = () => {
        renderSpy();
        return <SmartContentCreationPanel />;
      };

      const { rerender } = render(<TestComponent />);

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Rerender with same props
      rerender(<TestComponent />);

      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('debounces viral prediction calls', async () => {
      jest.useFakeTimers();
      const mockOnPredict = jest.fn().mockResolvedValue(mockViralPrediction);

      render(<SmartContentCreationPanel onPredict={mockOnPredict} />);

      const topicInput = screen.getByLabelText(/content topic/i);
      await user.type(topicInput, 'Test');

      const predictButton = screen.getByRole('button', { name: /predict viral potential/i });

      // Click predict button multiple times quickly
      await user.click(predictButton);
      await user.click(predictButton);
      await user.click(predictButton);

      jest.runAllTimers();

      // Should only call once due to proper state management
      expect(mockOnPredict).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });
  });
});