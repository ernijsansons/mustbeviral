/**
 * 🎭 MarketingLayout - Where First Impressions Become Viral Moments
 *
 * This layout is designed for conversion and viral appeal. Every element
 * encourages sharing, screenshots, and that "wow factor" that gets people
 * talking about MustBeViral on social media.
 */

import { ReactNode, useState, useEffect} from 'react';
import { Link, useLocation} from 'wouter';
import {
  Sparkles, Menu, X, ArrowRight, Star, Users, Zap, Twitter, Instagram, Linkedin, Youtube} from 'lucide-react';
import { cn} from '../../lib/utils';
import { Button} from '../ui/Button';
import { GradientText} from '../ui/GradientText';
import { CosmicBackground} from '../ui/CosmicBackground';

interface MarketingLayoutProps {
  children: ReactNode;
  className?: string;
  backgroundVariant?: 'cosmic' | 'minimal' | 'gradient';
  showFloatingCTA?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  isExternal?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Success Stories', href: '#testimonials' },
  { label: 'Blog', href: '/blog' },
  { label: 'Help', href: '/help' }
];

/**
 * Marketing Navigation Header
 */
function MarketingNav() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect_(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled
        ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-sm border-b border-slate-200 dark:border-slate-700'
        : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-viral-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <GradientText variant="viral" size="xl" className="font-bold">
                MustBeViral
              </GradientText>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span className={cn(
                  'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors duration-200',
                  'hover:scale-105 transform-gpu',
                  location === item.href && 'text-primary-600 dark:text-primary-400'
                )}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button
                variant="viral"
                size="sm"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="hover:scale-105 transition-transform duration-200"
              >
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden hover:scale-110 transition-transform duration-200"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
            <div className="py-4 space-y-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div
                    className="block px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg mx-2 transition-colors duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </div>
                </Link>
              ))}

              {/* Mobile CTA */}
              <div className="pt-4 px-2 space-y-2">
                <Link href="/login">
                  <Button variant="ghost" className="w-full justify-center">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="viral" className="w-full justify-center">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

/**
 * Marketing Footer
 */
function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'API Docs', href: '/docs' },
      { label: 'Changelog', href: '/changelog' }
    ],
    Company: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press Kit', href: '/press' }
    ],
    Resources: [
      { label: 'Help Center', href: '/help' },
      { label: 'Community', href: '/community' },
      { label: 'Viral Guide', href: '/guide' },
      { label: 'Templates', href: '/templates' }
    ],
    Legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'GDPR', href: '/gdpr' }
    ]
  };

  const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com/mustbeviral', label: 'Twitter' },
    { icon: Instagram, href: 'https://instagram.com/mustbeviral', label: 'Instagram' },
    { icon: Linkedin, href: 'https://linkedin.com/company/mustbeviral', label: 'LinkedIn' },
    { icon: Youtube, href: 'https://youtube.com/@mustbeviral', label: 'YouTube' }
  ];

  return (<footer className="bg-slate-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <CosmicBackground variant="minimal" density="low" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/">
              <div className="flex items-center gap-3 mb-6 group">
                <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-viral-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <GradientText variant="viral" size="xl" className="font-bold">
                  MustBeViral
                </GradientText>
              </div>
            </Link>

            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              The AI-powered platform that turns every post into a viral moment.
              Join 50, _000+ creators making content that matters.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-slate-800 hover:bg-gradient-to-r hover:from-primary-500 hover:to-viral-500 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link Sections */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-white font-semibold mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>
                      <span className="text-slate-400 hover:text-white transition-colors duration-200 text-sm">
                        {link.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between pt-8 mt-8 border-t border-slate-800">
          <div className="flex items-center gap-6 mb-4 lg:mb-0">
            <p className="text-slate-400 text-sm">
              © {currentYear} MustBeViral. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 bg-gradient-to-br from-primary-400 to-viral-400 rounded-full border-2 border-slate-900 flex items-center justify-center text-white text-xs font-semibold"
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <span className="text-slate-400 text-sm">50K+ creators</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-slate-400 text-sm">4.9/5 rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-viral-400" />
              <span className="text-slate-400 text-sm">87% accuracy</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * Floating CTA Button - Appears on scroll
 */
function FloatingCTA() {
  const [visible, setVisible] = useState(false);

  useEffect_(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 800);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Link href="/register">
        <Button
          variant="viral"
          size="lg"
          rightIcon={<ArrowRight className="w-5 h-5" />}
          className={cn(
            'shadow-2xl hover:shadow-glow-viral hover:scale-110 transition-all duration-300',
            'animate-bounce-subtle'
          )}
        >
          Start Creating
        </Button>
      </Link>
    </div>
  );
}

/**
 * Main Marketing Layout Component
 */
export function MarketingLayout({
  children, className, backgroundVariant = 'gradient', showFloatingCTA = true
}: MarketingLayoutProps) {
  const backgroundClasses = {
    cosmic: 'bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900',
    minimal: 'bg-slate-50 dark:bg-slate-900',
    gradient: 'bg-gradient-to-br from-primary-50 via-white to-viral-50 dark:from-slate-900 dark:via-purple-900/10 dark:to-slate-900'
  };

  return (
    <div className={cn(
      'min-h-screen relative',
      backgroundClasses[backgroundVariant],
      className
    )}>
      {/* Background Effects */}
      {backgroundVariant === 'cosmic' && (
        <CosmicBackground variant="galaxy" density="medium" className="fixed inset-0" />
      )}

      {/* Navigation */}
      <MarketingNav />

      {/* Main Content */}
      <main className="relative z-10 pt-16">
        {children}
      </main>

      {/* Footer */}
      <MarketingFooter />

      {/* Floating CTA */}
      {showFloatingCTA && <FloatingCTA />}

      {/* Scroll to Top Button */}
      <div className="fixed bottom-6 left-6 z-40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:scale-110 transition-all duration-200 shadow-lg"
        >
          <ArrowRight className="w-4 h-4 -rotate-90" />
        </Button>
      </div>
    </div>
  );
}