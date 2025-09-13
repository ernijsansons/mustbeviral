"use client";

// Responsive Navigation Bar with Mobile Bottom Navigation
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X, Home, FileText, Users, Sparkles, CreditCard } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
}

const navigationItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, testId: 'link-dashboard' },
  { name: 'Content', href: '/content', icon: FileText, testId: 'link-content' },
  { name: 'Matches', href: '/matches', icon: Users, testId: 'link-matches' },
];

export function NavBar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const isActiveRoute = (href: string) => {
    return location === href || (href !== '/dashboard' && location.startsWith(href));
  };

  // Desktop Navigation
  const DesktopNav = () => (
    <nav 
      className="bg-white shadow-lg border-b border-gray-200"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Main Navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link 
                href="/"
                className="focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"
                aria-label="Must Be Viral - Home"
              >
                <h1 className="text-xl font-bold text-indigo-600 cursor-pointer hover:text-indigo-700 transition-colors">
                  Must Be Viral
                </h1>
              </Link>
            </div>
            
            {/* Desktop Navigation Items */}
            <div className="hidden md:ml-8 md:flex md:space-x-8">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                
                return (
                  <Link 
                    key={item.href}
                    href={item.href}
                    data-testid={item.testId}
                    className={`${
                      isActive
                        ? 'text-indigo-600 border-b-2 border-indigo-600' 
                        : 'text-gray-700 hover:text-indigo-600 hover:border-gray-300'
                    } inline-flex items-center px-3 py-2 border-b-2 border-transparent text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-t-md`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="w-4 h-4 mr-2" aria-hidden="true" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side buttons */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <a 
              href="/api/subscribe"
              data-testid="button-get-started"
              className="inline-flex items-center px-4 py-2 border border-indigo-600 text-indigo-600 text-sm font-medium rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              aria-label="Get Started with subscription"
            >
              <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
              Get Started
            </a>
            <Link 
              href="/onboard"
              data-testid="button-sign-up"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              data-testid="button-mobile-menu"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-indigo-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-expanded={isOpen}
              aria-label="Toggle mobile menu"
            >
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`mobile-${item.testId}`}
                  className={`${
                    isActive
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'border-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                  } block pl-3 pr-4 py-2 border-l-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="flex items-center">
                    <Icon className="w-4 h-4 mr-3" aria-hidden="true" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
            
            {/* Mobile action buttons */}
            <div className="pt-4 pb-2 border-t border-gray-200 space-y-2">
              <a
                href="/api/subscribe"
                data-testid="mobile-button-get-started"
                className="block w-full text-left px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md transition-colors"
              >
                <div className="flex items-center">
                  <Sparkles className="w-4 h-4 mr-3" aria-hidden="true" />
                  Get Started
                </div>
              </a>
              <Link
                href="/onboard"
                data-testid="mobile-button-sign-up"
                className="block w-full text-left px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );

  // Mobile Bottom Navigation
  const MobileBottomNav = () => (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50"
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="grid grid-cols-4 h-16">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveRoute(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`bottom-${item.testId}`}
              className={`${
                isActive
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-indigo-600'
              } flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-5 h-5 mb-1" aria-hidden="true" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
        
        {/* Get Started button in bottom nav */}
        <a
          href="/api/subscribe"
          data-testid="bottom-button-get-started"
          className="flex flex-col items-center justify-center py-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset"
        >
          <CreditCard className="w-5 h-5 mb-1" aria-hidden="true" />
          <span className="truncate">Get Started</span>
        </a>
      </div>
    </nav>
  );

  return (
    <>
      <DesktopNav />
      {isMobile && <MobileBottomNav />}
      {/* Spacer for mobile bottom nav */}
      {isMobile && <div className="h-16" aria-hidden="true" />}
    </>
  );
}