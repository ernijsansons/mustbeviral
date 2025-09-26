import type { Preview } from '@storybook/react';
import { initialize, mswLoader } from 'msw-storybook-addon';
import '../src/index.css';

// Initialize MSW for API mocking in Storybook
initialize({
  onUnhandledRequest: 'warn',
});

const preview: Preview = {
  parameters: {
    // Configure actions addon
    actions: { argTypesRegex: '^on[A-Z].*' },

    // Configure controls addon
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      expanded: true,
      sort: 'alpha',
    },

    // Configure docs addon
    docs: {
      toc: true,
      theme: 'light',
    },

    // Configure backgrounds addon
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#0f172a',
        },
        {
          name: 'viral',
          value: '#10b981',
        },
        {
          name: 'primary',
          value: '#6366f1',
        },
      ],
    },

    // Configure viewport addon
    viewport: {
      viewports: {
        mobile1: {
          name: 'Small Mobile',
          styles: {
            width: '320px',
            height: '568px',
          },
        },
        mobile2: {
          name: 'Large Mobile',
          styles: {
            width: '414px',
            height: '896px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1024px',
            height: '768px',
          },
        },
        desktopLarge: {
          name: 'Large Desktop',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
      },
    },

    // Configure a11y addon
    a11y: {
      element: '#storybook-root',
      config: {
        rules: [
          {
            // Disable color contrast checking for now
            id: 'color-contrast',
            enabled: false,
          },
        ],
      },
      options: {
        checks: { 'color-contrast': { options: { noScroll: true } } },
        restoreScroll: true,
      },
    },

    // Configure layout
    layout: 'fullscreen',

    // Global decorators
    decorators: [
      (Story) => (
        <div className="min-h-screen bg-white">
          <Story />
        </div>
      ),
    ],
  },

  // Global arg types
  argTypes: {
    // Common props that should be excluded from controls
    className: {
      control: false,
    },
    children: {
      control: false,
    },
    ref: {
      control: false,
    },
  },

  // Global loaders for MSW
  loaders: [mswLoader],

  // Tags for auto-docs
  tags: ['autodocs'],
};

export default preview;