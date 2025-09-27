/**
 * Skip Navigation Component
 * Provides keyboard-only users quick access to main content and navigation
 * Essential for WCAG 2.1 AA compliance
 */

import { cn} from '../lib/utils';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        // Hidden by default, visible on focus
        'absolute left-[-10000px] top-auto w-[1px] h-[1px] overflow-hidden',
        // Visible state when focused
        'focus:left-4 focus:top-4 focus:w-auto focus:h-auto focus:overflow-visible',
        // Styling for visible state
        'focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white',
        'focus:rounded-md focus:shadow-lg focus:border-2 focus:border-white',
        'focus:font-medium focus:text-sm focus:no-underline',
        // Smooth transitions
        'transition-all duration-200 ease-in-out',
        className
      )}
      onFocus={(e) => {
        // Ensure the link is visible when focused
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }}
    >
      {children}
    </a>
  );
}

export function SkipNavigation() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <nav aria-label="Skip navigation links" role="navigation">
        <SkipLink href="#main-content">
          Skip to main content
        </SkipLink>
        <SkipLink href="#navigation">
          Skip to navigation
        </SkipLink>
        <SkipLink href="#footer">
          Skip to footer
        </SkipLink>
        <SkipLink href="#search">
          Skip to search
        </SkipLink>
      </nav>
    </div>
  );
}

// Landmark component to mark main content area
export function MainContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main
      id="main-content"
      className={className}
      role="main"
      aria-label="Main content"
    >
      {children}
    </main>
  );
}

// Navigation landmark
export function NavigationLandmark({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <nav
      id="navigation"
      className={className}
      role="navigation"
      aria-label="Main navigation"
    >
      {children}
    </nav>
  );
}

// Footer landmark
export function FooterLandmark({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <footer
      id="footer"
      className={className}
      role="contentinfo"
      aria-label="Footer"
    >
      {children}
    </footer>
  );
}