# MustBeViral V2 - Proposed Enterprise Structure

**Generated:** 2025-01-25
**Architecture Type:** Social-Media Native SaaS Platform
**Target:** World-class, viral-grade beauty with cinematic UI

## 🏗️ Executive Summary

This structure transforms MustBeViral into a **screenshot-worthy, addictive platform** that creators and brands will love to use and share. Every component is designed for **viral aesthetics** with neon gradients, kinetic animations, and satisfying interactions.

### **Design Philosophy**
- 🎨 **Viral-First:** Every UI element designed to be shared on social
- ⚡ **Kinetic Energy:** Motion that feels alive and engaging
- 🌟 **Neon Luxury:** Bold gradients with sophisticated polish
- 📱 **Creator-Centric:** Tools that spark joy and creativity
- 🚀 **Performance-First:** Beautiful AND fast (Lighthouse 95+)

---

## 📁 Complete Folder Structure

```
src/
├── 📱 app/                          # Next.js App Router (if migrating)
│   ├── (auth)/                      # Auth route group
│   ├── (marketing)/                 # Public route group
│   └── (platform)/                  # Protected app routes
│
├── 🎨 components/                   # Component Library
│   ├── layouts/                     # Layout Components
│   │   ├── RootLayout.tsx          # 🌟 Global layout with providers
│   │   ├── MarketingLayout.tsx     # 🎭 Landing/marketing layout
│   │   ├── AuthLayout.tsx          # ✨ Auth flows with viral backgrounds
│   │   ├── AppLayout.tsx           # 🏠 Main app layout with sidebar
│   │   └── ModalLayout.tsx         # 🪟 Modal/overlay container
│   │
│   ├── navigation/                  # Navigation Components
│   │   ├── TopNav.tsx              # 🔝 Main navigation bar
│   │   ├── Sidebar.tsx             # 📋 Collapsible sidebar
│   │   ├── MobileNav.tsx           # 📱 Mobile bottom navigation
│   │   ├── Breadcrumbs.tsx         # 🗂️ Breadcrumb navigation
│   │   └── UserMenu.tsx            # 👤 User dropdown menu
│   │
│   ├── ui/                         # Design System Primitives
│   │   ├── core/                   # Core UI Elements
│   │   │   ├── Button.tsx          # 🎯 Animated gradient buttons
│   │   │   ├── Input.tsx           # 📝 Glowing input fields
│   │   │   ├── Select.tsx          # 📋 Neon dropdown selects
│   │   │   ├── Card.tsx            # 🃏 Glow-on-hover cards
│   │   │   ├── Badge.tsx           # 🏷️ Gradient pill badges
│   │   │   ├── Avatar.tsx          # 👤 Animated user avatars
│   │   │   ├── Tabs.tsx            # 📑 Sliding tab animation
│   │   │   └── Modal.tsx           # 🪟 Blurred backdrop modals
│   │   │
│   │   ├── data/                   # Data Display Components
│   │   │   ├── Table.tsx           # 📊 Sortable data tables
│   │   │   ├── DataCard.tsx        # 📈 Animated metric cards
│   │   │   ├── Chart.tsx           # 📊 Kinetic chart wrapper
│   │   │   ├── Skeleton.tsx        # 💀 Shimmer loading states
│   │   │   └── EmptyState.tsx      # 🕳️ Playful empty states
│   │   │
│   │   ├── forms/                  # Form Components
│   │   │   ├── FormField.tsx       # 📝 Field with validation
│   │   │   ├── FileUpload.tsx      # 📁 Drag-drop upload zone
│   │   │   ├── ColorPicker.tsx     # 🎨 Gradient color picker
│   │   │   ├── TagInput.tsx        # 🏷️ Multi-select tag input
│   │   │   ├── RichEditor.tsx      # ✨ WYSIWYG content editor
│   │   │   └── FormWizard.tsx      # 🧙 Multi-step wizard
│   │   │
│   │   ├── feedback/               # Feedback Components
│   │   │   ├── Toast.tsx           # 🍞 Floating notifications
│   │   │   ├── Alert.tsx           # ⚠️ Contextual alerts
│   │   │   ├── Progress.tsx        # 📊 Animated progress bars
│   │   │   ├── Tooltip.tsx         # 💬 Emoji-enhanced tooltips
│   │   │   └── ConfirmDialog.tsx   # ❓ Confirmation modals
│   │   │
│   │   └── motion/                 # Animation Components
│   │       ├── FadeIn.tsx          # 🌅 Entrance animations
│   │       ├── SlideUp.tsx         # ⬆️ Slide transitions
│   │       ├── Sparkles.tsx        # ✨ Particle effects
│   │       ├── GlowBorder.tsx      # 🌟 Animated borders
│   │       ├── FloatingEmojis.tsx  # 🎈 Background animations
│   │       └── KineticChart.tsx    # 📊 Chart animations
│   │
│   ├── domain/                     # Domain-Specific Components
│   │   ├── auth/                   # 🔐 Authentication
│   │   │   ├── LoginForm.tsx       # 🔑 Viral login experience
│   │   │   ├── RegisterForm.tsx    # ✍️ Signup with animations
│   │   │   ├── ForgotPassword.tsx  # 🤔 Password reset flow
│   │   │   ├── OAuthButtons.tsx    # 🌐 Social login buttons
│   │   │   └── VerifyEmail.tsx     # 📧 Email verification
│   │   │
│   │   ├── onboarding/             # 🎯 User Onboarding
│   │   │   ├── RoleSelector.tsx    # 🎭 Creator vs Brand flip
│   │   │   ├── ProfileSetup.tsx    # 👤 Avatar + details form
│   │   │   ├── NicheTags.tsx       # 🏷️ Gradient pill selector
│   │   │   ├── PlatformConnect.tsx # 🔗 Social platform linking
│   │   │   └── WelcomeAnimation.tsx # 🎉 Success celebration
│   │   │
│   │   ├── creator/                # 👨‍🎨 Creator Studio
│   │   │   ├── ContentLibrary.tsx  # 📚 Grid with hover previews
│   │   │   ├── IdeaBoard.tsx       # 💡 Draggable inspiration cards
│   │   │   ├── DraftEditor.tsx     # ✏️ Content creation interface
│   │   │   ├── AssetUploader.tsx   # 📁 Drag-drop media upload
│   │   │   ├── ViralPredictor.tsx  # 🔮 AI viral score widget
│   │   │   └── ContentCalendar.tsx # 📅 Sticky-note scheduling
│   │   │
│   │   ├── brand/                  # 🏢 Brand/Agency Tools
│   │   │   ├── BriefBuilder.tsx    # 📝 Colorful campaign builder
│   │   │   ├── BrandKit.tsx        # 🎨 Logo + gradient editor
│   │   │   ├── Moodboard.tsx       # 🖼️ Visual inspiration board
│   │   │   ├── InfluencerSearch.tsx # 🔍 Creator discovery
│   │   │   └── CampaignDashboard.tsx # 📊 Campaign management
│   │   │
│   │   ├── marketplace/            # 🏪 Influencer Marketplace
│   │   │   ├── CreatorCard.tsx     # 🃏 Profile cards with stats
│   │   │   ├── FilterSidebar.tsx   # 🎚️ Neon sliders + pills
│   │   │   ├── CreatorProfile.tsx  # 👤 Detailed creator view
│   │   │   ├── BookingFlow.tsx     # 💼 Collaboration booking
│   │   │   └── ReviewSystem.tsx    # ⭐ Rating + feedback
│   │   │
│   │   ├── matching/               # 🎯 AI Matching System
│   │   │   ├── MatchSuggestions.tsx # 🎲 AI-powered recommendations
│   │   │   ├── ShortlistBoard.tsx  # 📌 Draggable saved creators
│   │   │   ├── CompatibilityScore.tsx # 💕 Match percentage
│   │   │   └── MatchFilters.tsx    # 🎛️ Advanced filtering
│   │   │
│   │   ├── analytics/              # 📈 Performance Analytics
│   │   │   ├── MetricsOverview.tsx # 📊 KPI dashboard cards
│   │   │   ├── ViralScore.tsx      # 🔥 Animated viral indicator
│   │   │   ├── TrendCharts.tsx     # 📈 Kinetic line charts
│   │   │   ├── EngagementHeatmap.tsx # 🗺️ Activity visualization
│   │   │   └── ROICalculator.tsx   # 💰 Investment analysis
│   │   │
│   │   ├── collaboration/          # 🤝 Team Collaboration
│   │   │   ├── MessageThread.tsx   # 💬 Chat with emoji reactions
│   │   │   ├── FileSharing.tsx     # 📁 Asset collaboration
│   │   │   ├── TaskBoard.tsx       # ✅ Project management
│   │   │   ├── CommentSystem.tsx   # 💭 Content feedback
│   │   │   └── NotificationCenter.tsx # 🔔 Activity updates
│   │   │
│   │   └── settings/               # ⚙️ User Settings
│   │       ├── ProfileSettings.tsx # 👤 Account management
│   │       ├── BrandKitManager.tsx # 🎨 Brand asset management
│   │       ├── PlatformConnections.tsx # 🔗 Social integrations
│   │       ├── NotificationPrefs.tsx # 🔔 Notification controls
│   │       ├── SecuritySettings.tsx # 🔒 Password + 2FA
│   │       └── BillingSettings.tsx # 💳 Subscription management
│   │
│   └── providers/                  # Context Providers
│       ├── AuthProvider.tsx        # 🔐 Authentication state
│       ├── ThemeProvider.tsx       # 🎨 Dark mode + themes
│       ├── ToastProvider.tsx       # 🍞 Global notifications
│       ├── ModalProvider.tsx       # 🪟 Modal management
│       └── QueryProvider.tsx       # 🔄 React Query setup
│
├── 📄 pages/                       # Route Components
│   ├── marketing/                  # 🎭 Public Marketing Pages
│   │   ├── HomePage.tsx            # 🏠 Animated landing hero
│   │   ├── PricingPage.tsx         # 💰 Pricing tiers
│   │   ├── AboutPage.tsx           # ℹ️ Company story
│   │   └── ContactPage.tsx         # 📞 Contact form
│   │
│   ├── auth/                       # 🔐 Authentication Pages
│   │   ├── LoginPage.tsx           # 🔑 Login with viral BG
│   │   ├── RegisterPage.tsx        # ✍️ Signup with floating emojis
│   │   ├── ForgotPasswordPage.tsx  # 🤔 Password reset
│   │   ├── ResetPasswordPage.tsx   # 🔄 New password form
│   │   └── VerifyEmailPage.tsx     # 📧 Email confirmation
│   │
│   ├── onboarding/                 # 🎯 User Onboarding
│   │   ├── WelcomePage.tsx         # 👋 Welcome experience
│   │   ├── RoleSelectionPage.tsx   # 🎭 Creator vs Brand choice
│   │   ├── ProfileSetupPage.tsx    # 👤 Profile creation
│   │   ├── PlatformLinkingPage.tsx # 🔗 Social connections
│   │   └── OnboardingCompletePage.tsx # 🎉 Success celebration
│   │
│   ├── app/                        # 🏠 Main Application Pages
│   │   ├── DashboardPage.tsx       # 📊 Overview dashboard
│   │   ├── CreatorStudioPage.tsx   # 🎨 Content creation hub
│   │   ├── MarketplacePage.tsx     # 🏪 Influencer discovery
│   │   ├── CampaignPage.tsx        # 📝 Campaign management
│   │   ├── MatchingPage.tsx        # 🎯 AI recommendations
│   │   ├── CalendarPage.tsx        # 📅 Content planning
│   │   ├── AnalyticsPage.tsx       # 📈 Performance insights
│   │   ├── CollaborationPage.tsx   # 🤝 Team workspace
│   │   └── SettingsPage.tsx        # ⚙️ Account settings
│   │
│   └── errors/                     # 🚨 Error Pages
│       ├── NotFoundPage.tsx        # 🕳️ Playful 404 with glitch
│       ├── ErrorPage.tsx           # ❌ General error boundary
│       ├── MaintenancePage.tsx     # 🔧 Maintenance mode
│       └── OfflinePage.tsx         # 📶 Network error
│
├── 🎣 hooks/                       # Custom React Hooks
│   ├── auth/                       # Authentication Hooks
│   │   ├── useAuth.ts              # 🔐 Auth state management
│   │   ├── useOAuth.ts             # 🌐 Social login flows
│   │   └── usePermissions.ts       # 🛡️ Role-based access
│   │
│   ├── api/                        # API Integration Hooks
│   │   ├── useContent.ts           # 📝 Content CRUD operations
│   │   ├── useAnalytics.ts         # 📊 Metrics data fetching
│   │   ├── useMatching.ts          # 🎯 AI matching queries
│   │   └── usePlanning.ts          # 📅 Calendar operations
│   │
│   ├── ui/                         # UI Interaction Hooks
│   │   ├── useToast.ts             # 🍞 Toast notifications
│   │   ├── useModal.ts             # 🪟 Modal management
│   │   ├── useDragDrop.ts          # 🖱️ Drag & drop utilities
│   │   └── useAnimation.ts         # ✨ Animation controls
│   │
│   └── utils/                      # Utility Hooks
│       ├── useLocalStorage.ts      # 💾 Local state persistence
│       ├── useDebounce.ts          # ⏰ Input debouncing
│       ├── useMediaQuery.ts        # 📱 Responsive breakpoints
│       └── useOnlineStatus.ts      # 📶 Network connectivity
│
├── 🔧 lib/                         # Utility Libraries
│   ├── api/                        # API Layer
│   │   ├── client.ts               # 🌐 HTTP client setup
│   │   ├── auth.ts                 # 🔐 Auth endpoints
│   │   ├── content.ts              # 📝 Content endpoints
│   │   ├── matching.ts             # 🎯 Matching endpoints
│   │   └── analytics.ts            # 📊 Analytics endpoints
│   │
│   ├── design-system/              # Design System
│   │   ├── tokens.ts               # 🎨 Design tokens
│   │   ├── themes.ts               # 🌙 Theme definitions
│   │   ├── animations.ts           # ✨ Animation presets
│   │   └── gradients.ts            # 🌈 Gradient definitions
│   │
│   ├── utils/                      # Utility Functions
│   │   ├── cn.ts                   # 🎨 Class name utility
│   │   ├── format.ts               # 📊 Data formatting
│   │   ├── validation.ts           # ✅ Form validation
│   │   └── analytics.ts            # 📈 Event tracking
│   │
│   └── constants/                  # Application Constants
│       ├── routes.ts               # 🗺️ Route definitions
│       ├── api-endpoints.ts        # 🌐 API URLs
│       └── feature-flags.ts        # 🚩 Feature toggles
│
├── 🎨 styles/                      # Styling & Design
│   ├── globals.css                 # 🌍 Global styles
│   ├── tokens.css                  # 🎨 CSS design tokens
│   ├── animations.css              # ✨ Animation classes
│   ├── gradients.css               # 🌈 Gradient utilities
│   └── components.css              # 🧩 Component-specific styles
│
├── 🗂️ types/                       # TypeScript Definitions
│   ├── api.ts                      # 🌐 API response types
│   ├── user.ts                     # 👤 User & auth types
│   ├── content.ts                  # 📝 Content types
│   ├── matching.ts                 # 🎯 Matching types
│   └── ui.ts                       # 🎨 UI component types
│
└── 📁 assets/                      # Static Assets
    ├── icons/                      # 🎨 SVG icons
    ├── images/                     # 🖼️ Static images
    ├── animations/                 # ✨ Lottie files
    └── fonts/                      # 🔤 Custom fonts
```

---

## 🎨 Layout System Design

### **1. RootLayout.tsx** - Global Foundation
```tsx
// Global providers and theme setup
<ThemeProvider>
  <QueryProvider>
    <AuthProvider>
      <ToastProvider>
        <ModalProvider>
          {/* Global components */}
          <Toaster />
          <ModalContainer />
          <LoadingOverlay />

          {/* Route-specific layouts */}
          <Outlet />
        </ModalProvider>
      </ToastProvider>
    </AuthProvider>
  </QueryProvider>
</ThemeProvider>
```

### **2. MarketingLayout.tsx** - Landing Experience
```tsx
// Clean, conversion-focused layout
<div className="min-h-screen bg-gradient-cosmic">
  <MarketingNav />
  <main className="isolate">
    <FloatingEmojis /> {/* Subtle background animation */}
    <Outlet />
  </main>
  <MarketingFooter />
</div>
```

### **3. AuthLayout.tsx** - Viral Authentication
```tsx
// Immersive auth experience
<div className="min-h-screen relative overflow-hidden">
  <FloatingEmojis density="high" />
  <CosmicBackground variant="auth" />

  <div className="relative z-10 min-h-screen flex">
    <AuthSidebar /> {/* Branding + testimonials */}
    <main className="flex-1">
      <Outlet />
    </main>
  </div>
</div>
```

### **4. AppLayout.tsx** - Main Application
```tsx
// Full-featured app layout with sidebar
<div className="h-screen flex bg-slate-900">
  <Sidebar /> {/* Collapsible navigation */}

  <div className="flex-1 flex flex-col min-w-0">
    <TopNav />

    <main className="flex-1 overflow-auto">
      <Breadcrumbs />
      <Outlet />
    </main>
  </div>

  <MobileNav /> {/* Bottom navigation on mobile */}
</div>
```

---

## 🚦 Route Architecture

### **Public Routes (No Auth Required)**
```tsx
// Marketing & Auth routes
const PublicRoutes = [
  '/',                    // HomePage - Animated hero
  '/pricing',             // PricingPage - Tier comparison
  '/about',              // AboutPage - Company story
  '/contact',            // ContactPage - Contact form
  '/login',              // LoginPage - Viral login
  '/register',           // RegisterPage - Animated signup
  '/forgot-password',    // ForgotPasswordPage
  '/reset-password',     // ResetPasswordPage
  '/verify-email',       // VerifyEmailPage
]
```

### **Protected Routes (Auth Required)**
```tsx
// Main application routes
const ProtectedRoutes = [
  '/onboarding/*',       // Onboarding flow
  '/dashboard',          // Main dashboard
  '/studio',             // Creator Studio
  '/marketplace',        // Influencer discovery
  '/campaigns',          // Campaign management
  '/matching',           // AI recommendations
  '/calendar',           // Content planning
  '/analytics',          // Performance insights
  '/collaboration',      // Team workspace
  '/settings',           // Account settings
]
```

### **Error Routes**
```tsx
// Error handling
const ErrorRoutes = [
  '/404',                // NotFoundPage - Playful glitch
  '/error',              // ErrorPage - General errors
  '/maintenance',        // MaintenancePage
  '/offline',            // OfflinePage - Network issues
]
```

---

## 🎯 Component Priorities

### **Phase 1: Core Foundation (Week 1-2)**
| Component | Priority | Impact | Effort |
|-----------|----------|--------|--------|
| **RootLayout** | P0 | Critical | High |
| **AuthLayout** | P0 | Critical | High |
| **AppLayout** | P0 | Critical | High |
| **Button** | P0 | High | Medium |
| **Input** | P0 | High | Medium |
| **Card** | P0 | High | Medium |
| **LoginForm** | P0 | Critical | High |
| **RegisterForm** | P0 | Critical | High |

### **Phase 2: Core Features (Week 3-4)**
| Component | Priority | Impact | Effort |
|-----------|----------|--------|--------|
| **ContentLibrary** | P0 | Critical | High |
| **IdeaBoard** | P0 | High | High |
| **CreatorCard** | P0 | High | Medium |
| **FilterSidebar** | P0 | Medium | Medium |
| **BriefBuilder** | P1 | High | High |
| **ViralPredictor** | P1 | High | Medium |

### **Phase 3: Advanced Features (Week 5-6)**
| Component | Priority | Impact | Effort |
|-----------|----------|--------|--------|
| **ContentCalendar** | P1 | High | High |
| **MessageThread** | P1 | Medium | Medium |
| **AnalyticsDashboard** | P1 | High | High |
| **BrandKit** | P1 | Medium | Medium |

---

## 🔮 Design System Integration

### **Token Structure**
```css
/* Color Tokens - Viral Palette */
--color-primary-50: #f0f4ff;
--color-primary-500: #6366f1;  /* Electric Violet */
--color-primary-900: #312e81;

--color-viral-50: #ecfdf5;
--color-viral-500: #10b981;    /* Viral Green */
--color-viral-900: #064e3b;

--color-neon-pink: #ff0080;    /* Hot Pink */
--color-neon-cyan: #00ffff;    /* Electric Cyan */
--color-neon-lime: #00ff88;    /* Lime Green */

/* Gradient Tokens */
--gradient-viral: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-viral-500) 100%);
--gradient-neon: linear-gradient(135deg, var(--color-neon-pink) 0%, var(--color-neon-cyan) 100%);
--gradient-cosmic: radial-gradient(ellipse at top, var(--color-primary-900) 0%, var(--color-slate-900) 100%);

/* Animation Tokens */
--duration-fast: 150ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
--easing-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### **Component Variants**
```tsx
// Button variants for different contexts
const buttonVariants = {
  primary: "bg-gradient-viral hover:scale-105",
  neon: "bg-gradient-neon hover:shadow-glow-pink",
  ghost: "bg-transparent border border-primary-500 hover:bg-primary-500/10",
  destructive: "bg-red-500 hover:bg-red-600",
}

// Card variants for different content types
const cardVariants = {
  default: "bg-slate-800 border border-slate-700 hover:border-primary-500",
  glow: "bg-slate-800 hover:shadow-glow hover:border-transparent",
  neon: "bg-gradient-to-br from-slate-800 to-slate-900 border border-neon-cyan/30",
}
```

---

## 📱 Responsive Strategy

### **Breakpoint System**
```css
/* Mobile First Breakpoints */
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
--breakpoint-2xl: 1536px; /* Ultra-wide */
```

### **Mobile-Specific Components**
- **MobileNav.tsx** - Bottom navigation with haptic feedback
- **SwipeGestures.tsx** - Touch interactions for cards
- **PullToRefresh.tsx** - Native-feeling refresh
- **MobileModal.tsx** - Full-screen modals on mobile

---

## 🚀 Performance Strategy

### **Code Splitting**
```tsx
// Route-based code splitting
const CreatorStudioPage = lazy(() => import('./pages/app/CreatorStudioPage'));
const MarketplacePage = lazy(() => import('./pages/app/MarketplacePage'));
const AnalyticsPage = lazy(() => import('./pages/app/AnalyticsPage'));

// Component-based splitting for heavy features
const RichEditor = lazy(() => import('./components/forms/RichEditor'));
const AdvancedCharts = lazy(() => import('./components/analytics/AdvancedCharts'));
```

### **Asset Optimization**
- **Image Optimization:** WebP with fallbacks, lazy loading
- **Icon Strategy:** SVG sprite system for common icons
- **Font Loading:** Preload critical fonts, progressive enhancement
- **Animation Assets:** Optimized Lottie files, CSS animations preferred

---

## 🧪 Testing Strategy

### **Component Testing**
```tsx
// Test coverage for each component type
- UI Components: Visual regression + interaction
- Domain Components: Business logic + user flows
- Layout Components: Responsive behavior + accessibility
- Page Components: E2E user journeys
```

### **Accessibility Testing**
```tsx
// WCAG 2.2 AA+ compliance
- Automated: axe-core in CI/CD
- Manual: Keyboard navigation testing
- Screen Reader: NVDA/VoiceOver testing
- Color Contrast: 4.5:1 minimum ratio
```

---

## 📈 Success Metrics

### **Technical KPIs**
- **Bundle Size:** <500KB initial load
- **Time to Interactive:** <2 seconds
- **Lighthouse Score:** 95+ across all metrics
- **Core Web Vitals:** Green on all metrics

### **UX KPIs**
- **Visual Appeal:** Screenshot-worthy interfaces
- **Engagement:** High hover/interaction rates
- **Conversion:** Improved onboarding completion
- **Retention:** Increased weekly active usage

---

**Next Phase:** Begin scaffold implementation with viral-grade beauty and cinematic UI that makes users want to share screenshots.

**Architecture Complete ✨**
**Ready for viral transformation 🚀**