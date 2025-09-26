/**
 * Commitlint Configuration for Must Be Viral V2
 *
 * Ensures consistent commit message format following Conventional Commits specification.
 * This helps with automated changelog generation and semantic versioning.
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // Increase body and header max length for detailed commit messages
    'body-max-line-length': [2, 'always', 100],
    'header-max-length': [2, 'always', 72],

    // Custom type rules for our project
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation changes
        'style',    // Code style changes (formatting, etc.)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Test additions or modifications
        'chore',    // Build process or auxiliary tool changes
        'ci',       // CI/CD configuration changes
        'build',    // Build system changes
        'revert',   // Revert previous commit
        'security', // Security fixes
        'a11y',     // Accessibility improvements
        'ui',       // UI/UX changes
        'api',      // API changes
        'db',       // Database changes
        'deploy',   // Deployment changes
      ],
    ],

    // Custom scope rules for our project structure
    'scope-enum': [
      1,
      'always',
      [
        // Frontend scopes
        'components',
        'pages',
        'hooks',
        'utils',
        'styles',
        'types',
        'assets',
        'routes',

        // Backend scopes
        'api',
        'auth',
        'database',
        'workers',
        'middleware',
        'services',
        'models',

        // Infrastructure scopes
        'docker',
        'cloudflare',
        'ci-cd',
        'deployment',
        'monitoring',
        'security',

        // Testing scopes
        'tests',
        'e2e',
        'unit',
        'integration',
        'a11y',
        'performance',

        // Documentation scopes
        'docs',
        'readme',
        'changelog',
        'storybook',

        // Configuration scopes
        'config',
        'deps',
        'scripts',
        'tooling',
      ],
    ],

    // Allow empty scope for general changes
    'scope-empty': [1, 'never'],

    // Require subject to be in sentence case
    'subject-case': [2, 'always', 'sentence-case'],

    // Subject should not end with period
    'subject-full-stop': [2, 'never', '.'],

    // Subject should not be empty
    'subject-empty': [2, 'never'],

    // Body should be wrapped at 100 characters
    'body-leading-blank': [2, 'always'],

    // Footer should be wrapped at 100 characters
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [2, 'always', 100],
  },

  // Custom plugins can be added here
  plugins: [],

  // Help URL for commit message format
  helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',

  // Prompt configuration for interactive mode
  prompt: {
    questions: {
      type: {
        description: "Select the type of change that you're committing:",
        enum: {
          feat: {
            description: 'A new feature',
            title: 'Features',
            emoji: '✨',
          },
          fix: {
            description: 'A bug fix',
            title: 'Bug Fixes',
            emoji: '🐛',
          },
          docs: {
            description: 'Documentation only changes',
            title: 'Documentation',
            emoji: '📚',
          },
          style: {
            description: 'Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)',
            title: 'Styles',
            emoji: '💎',
          },
          refactor: {
            description: 'A code change that neither fixes a bug nor adds a feature',
            title: 'Code Refactoring',
            emoji: '📦',
          },
          perf: {
            description: 'A code change that improves performance',
            title: 'Performance Improvements',
            emoji: '🚀',
          },
          test: {
            description: 'Adding missing tests or correcting existing tests',
            title: 'Tests',
            emoji: '🚨',
          },
          build: {
            description: 'Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)',
            title: 'Builds',
            emoji: '🛠',
          },
          ci: {
            description: 'Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)',
            title: 'Continuous Integrations',
            emoji: '⚙️',
          },
          chore: {
            description: "Other changes that don't modify src or test files",
            title: 'Chores',
            emoji: '♻️',
          },
          revert: {
            description: 'Reverts a previous commit',
            title: 'Reverts',
            emoji: '🗑',
          },
          security: {
            description: 'Security fixes',
            title: 'Security',
            emoji: '🔒',
          },
          a11y: {
            description: 'Accessibility improvements',
            title: 'Accessibility',
            emoji: '♿',
          },
          ui: {
            description: 'UI/UX changes',
            title: 'UI/UX',
            emoji: '🎨',
          },
        },
      },
      scope: {
        description: 'What is the scope of this change (e.g. component or file name)',
      },
      subject: {
        description: 'Write a short, imperative tense description of the change',
      },
      body: {
        description: 'Provide a longer description of the change',
      },
      isBreaking: {
        description: 'Are there any breaking changes?',
      },
      breakingBody: {
        description: 'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself',
      },
      breaking: {
        description: 'Describe the breaking changes',
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?',
      },
      issuesBody: {
        description: 'If issues are closed, the commit requires a body. Please enter a longer description of the commit itself',
      },
      issues: {
        description: 'Add issue references (e.g. "fix #123", "re #123".)',
      },
    },
  },
};