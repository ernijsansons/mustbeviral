/**
 * 🏠 AppLayout - The Heart of Viral Creation
 *
 * This is where creators spend their time crafting viral content. Every interaction
 * is designed to be satisfying, every hover delightful, and every animation smooth.
 * The collapsible sidebar adapts beautifully across all screen sizes.
 */

import { ReactNode, useState, useEffect} from 'react';
import { Link, useLocation} from 'wouter';
import {
  Home, PenTool, Users, Calendar, BarChart3, Settings, Sparkles, Menu, X, Zap, Heart, Rocket, Bell, Search, Plus, ChevronLeft, ChevronRight} from 'lucide-react';
import { cn} from '../../lib/utils';
import { Button} from '../ui/Button';
import { GradientText} from '../ui/GradientText';

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
}

interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isNew?: boolean;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home
  },
  {
    id: 'studio',
    label: 'Creator Studio',
    href: '/studio',
    icon: PenTool,
    isNew: true
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    href: '/marketplace',
    icon: Users
  },
  {
    id: 'calendar',
    label: 'Content Calendar',
    href: '/calendar',
    icon: Calendar,
    badge: 3
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart3
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings
  }
];

/**
 * User Profile Widget for Sidebar
 */
function UserProfileWidget({ collapsed }: { collapsed: boolean }) {
  const [user] = useState({
    name: 'Sarah Chen',
    handle: '@sarahcreates',
    avatar: '/api/placeholder/40/40',
    tier: 'Pro',
    viralScore: 87
  });

  return (
    <div className = "p-4 border-t border-slate-200 dark:border-slate-700">
      <div className={cn(
        'flex items-center gap-3 p-3 bg-gradient-to-r from-primary-50 to-viral-50 dark:from-primary-900/20 dark:to-viral-900/20 rounded-xl border border-primary-200 dark:border-primary-800',
        'hover:shadow-glow hover:shadow-primary-500/20 transition-all duration-300 cursor-pointer group'
      )}>
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-viral-400 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
            SC
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-viral-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
            <Zap className="w-2 h-2 text-white" />
          </div>
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {user.name}
              </p>
              <span className="px-2 py-0.5 text-xs bg-gold-500 text-white rounded-full font-medium">
                {user.tier}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user.handle}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <div className="text-xs text-viral-600 dark:text-viral-400 font-medium">
                Viral Score: {user.viralScore}
              </div>
              <Sparkles className="w-3 h-3 text-viral-500" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Sidebar Navigation Item
 */
function SidebarNavItem(_{
  item, isActive, collapsed
}: {
  item: SidebarItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link href={item.href}>
      <div className={cn(
        'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden',
        isActive
          ? 'bg-gradient-to-r from-primary-500 to-viral-500 text-white shadow-lg shadow-primary-500/25'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
        collapsed ? 'justify-center' : 'justify-start',
        'hover:scale-105 hover:-translate-y-0.5 active:scale-95 transform-gpu'
      )}>
        {/* Background Glow Effect for Active State */}
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-viral-400 opacity-90 rounded-xl animate-glow-pulse" />
        )}

        {/* Icon */}
        <div className="relative z-10 flex items-center justify-center">
          <Icon className={cn(
            'w-5 h-5 flex-shrink-0 transition-transform duration-200',
            isActive ? 'text-white' : 'group-hover:scale-110'
          )} />

          {/* New Badge */}
          {item.isNew && !collapsed && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-viral-500 rounded-full animate-pulse" />
          )}
        </div>

        {/* Label and Badge */}
        {!collapsed && (
          <div className="relative z-10 flex items-center justify-between flex-1 min-w-0">
            <span className="font-medium truncate">
              {item.label}
            </span>

            {/* Badges */}
            <div className="flex items-center gap-2">
              {item.badge && (
                <span className={cn(
                  'px-2 py-0.5 text-xs rounded-full font-medium',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-viral-500 text-white'
                )}>
                  {item.badge}
                </span>
              )}
              {item.isNew && (
                <span className={cn(
                  'px-2 py-0.5 text-xs rounded-full font-medium',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-gold-500 text-white'
                )}>
                  NEW
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * Main Sidebar Component
 */
function Sidebar(_{ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [location] = useLocation();

  return (
    <div className={cn(
      'fixed left-0 top-0 z-40 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out',
      'backdrop-blur-xl bg-white/95 dark:bg-slate-900/95',
      collapsed ? 'w-16' : 'w-64',
      'lg:translate-x-0',
      'flex flex-col'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        {!collapsed && (
          <Link href="/">
            <div className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-viral-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <GradientText variant="viral" size="xl" className="font-bold">
                MustBeViral
              </GradientText>
            </div>
          </Link>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="hover:scale-110 transition-transform duration-200"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Quick Actions */}
      {!collapsed && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <Button
            variant="viral"
            className="w-full justify-start gap-2 hover:scale-105 transition-transform duration-200"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Content
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {sidebarItems.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
              isActive={location === item.href  ?? location.startsWith(item.href + '/')}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* User Profile */}
      <UserProfileWidget collapsed={collapsed} />
    </div>
  );
}

/**
 * Top Navigation Bar
 */
function TopNav({ onMenuToggle }: { onMenuToggle: () => void }) {
  const [notifications] = useState(3);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="lg:hidden hover:scale-110 transition-transform duration-200"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search content, creators, trends..."
              className={cn(
                'w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'placeholder:text-slate-400 transition-all duration-200',
                'hover:shadow-sm focus:shadow-md'
              )}
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative hover:scale-110 transition-transform duration-200">
            <Bell className="w-5 h-5" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-viral-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
                {notifications}
              </span>
            )}
          </Button>

          {/* Viral Score Widget */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-viral-50 to-primary-50 dark:from-viral-900/20 dark:to-primary-900/20 rounded-lg border border-viral-200 dark:border-viral-800">
            <Rocket className="w-4 h-4 text-viral-600 dark:text-viral-400" />
            <span className="text-sm font-semibold text-viral-600 dark:text-viral-400">
              87 Viral Score
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Mobile Bottom Navigation
 */
function MobileBottomNav() {
  const [location] = useLocation();

  const quickItems = sidebarItems.slice(0, 4); // Show first 4 items

  return (<div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 p-2">
        <div className="flex items-center justify-around">
          {quickItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;

            return (
              <Link key={item.id} href={item.href}>
                <div className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 relative',
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                  'active:scale-95 hover:scale-105 transform-gpu'
                )}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-500 rounded-full animate-pulse" />
                  )}

                  {/* Badge */}
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-viral-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Main App Layout Component
 */
export function AppLayout(_{ children, className }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle responsive sidebar
  useEffect_(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900', className)}>
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className={cn(
        'transition-all duration-300 ease-in-out min-h-screen flex flex-col',
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      )}>
        {/* Top Navigation */}
        <TopNav onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

        {/* Page Content */}
        <main className="flex-1 p-6 pb-20 lg:pb-6" id="main-content">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 shadow-xl transform transition-transform duration-300">
            <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}