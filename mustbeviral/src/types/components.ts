// Comprehensive TypeScript types for enhanced components
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

// Smart Content Creation Panel Types
export interface ContentFormData {
  topic: string;
  platforms: Platform[];
  tone: ContentTone;
  targetAudience: TargetAudience;
  contentType: ContentType;
  keywords?: string[];
  customPrompt?: string;
}

export interface Platform {
  id: 'twitter' | 'instagram' | 'linkedin' | 'facebook' | 'tiktok' | 'youtube';
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
  characterLimit: number;
  features?: string[];
}

export interface ViralPrediction {
  score: number;
  factors: PredictionFactor[];
  suggestions: string[];
  confidence: 'low' | 'medium' | 'high';
  breakdown?: {
    timing: number;
    keywords: number;
    format: number;
    audience: number;
  };
}

export interface PredictionFactor {
  name: string;
  impact: number;
  description: string;
  recommendation?: string;
}

export type ContentTone = 'professional' | 'casual' | 'humorous' | 'inspiring' | 'urgent' | 'educational' | 'emotional';
export type TargetAudience = 'general' | 'professionals' | 'entrepreneurs' | 'students' | 'millennials' | 'gen-z' | 'creators';
export type ContentType = 'social_post' | 'blog_post' | 'video_script' | 'email_campaign' | 'story' | 'reel';

// Enhanced Analytics Dashboard Types
export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  trend: number[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  target?: number;
  unit?: string;
  category?: 'engagement' | 'reach' | 'growth' | 'revenue';
}

export interface PerformanceInsight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'error';
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  impact?: 'positive' | 'negative' | 'neutral';
  timestamp?: Date;
}

export interface FilterOptions {
  timeRange: '7d' | '30d' | '90d' | '1y' | 'custom';
  platform: 'all' | 'twitter' | 'instagram' | 'linkedin' | 'facebook' | 'tiktok' | 'youtube';
  contentType: 'all' | 'post' | 'video' | 'image' | 'story' | 'reel';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  fill?: boolean;
}

// Collaboration Hub Types
export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'guest';
  status: 'online' | 'away' | 'offline' | 'busy';
  lastSeen?: Date;
  cursor?: CursorPosition;
  selection?: TextSelection;
  color: string;
  isTyping?: boolean;
  currentSection?: string;
  permissions?: Permission[];
  timezone?: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
  timestamp?: Date;
}

export interface TextSelection {
  start: number;
  end: number;
  text: string;
  elementId: string;
  timestamp?: Date;
}

export interface Comment {
  id: string;
  author: Collaborator;
  content: string;
  timestamp: Date;
  resolved: boolean;
  replies: Comment[];
  position?: { x: number; y: number };
  elementId?: string;
  mentions?: string[];
  attachments?: Attachment[];
  reactions?: Reaction[];
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Version {
  id: string;
  timestamp: Date;
  author: Collaborator;
  description: string;
  changes: ChangeItem[];
  isCurrent: boolean;
  tags?: string[];
  parentVersion?: string;
}

export interface ChangeItem {
  type: 'added' | 'removed' | 'modified' | 'moved';
  section: string;
  description: string;
  lineNumber?: number;
  content?: {
    before?: string;
    after?: string;
  };
}

export interface Activity {
  id: string;
  type: 'edit' | 'comment' | 'join' | 'leave' | 'save' | 'version' | 'share' | 'permission';
  collaborator: Collaborator;
  timestamp: Date;
  content?: string;
  metadata?: Record<string, any>;
  target?: {
    type: string;
    id: string;
    name?: string;
  };
}

export interface Permission {
  action: string;
  resource: string;
  granted: boolean;
}

// Onboarding Flow Types
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  experience: ExperienceLevel;
  goals: string[];
  platforms: string[];
  teamSize?: number;
  industry?: string;
  company?: string;
  website?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  collaboration: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'team';
  dataSharing: boolean;
  analytics: boolean;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  optional?: boolean;
  estimatedTime?: number;
  roleSpecific?: UserRole[];
  prerequisites?: string[];
  validation?: (data: Partial<UserProfile>) => boolean;
}

export interface FeatureTour {
  id: string;
  title: string;
  description: string;
  selector: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlight?: boolean;
  action?: 'click' | 'hover' | 'focus';
  content?: React.ReactNode;
}

export type UserRole = 'creator' | 'brand' | 'agency' | 'enterprise' | 'developer';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// Common UI Types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
  details?: any;
}

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface SearchState {
  query: string;
  filters: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ModalState {
  isOpen: boolean;
  type?: string;
  data?: any;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Animation Types
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
  stagger?: number;
}

export interface MotionVariants {
  initial: any;
  animate: any;
  exit?: any;
  hover?: any;
  tap?: any;
}

// Accessibility Types
export interface A11yProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  'aria-disabled'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-atomic'?: boolean;
  role?: string;
  tabIndex?: number;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  validation?: ValidationRule[];
  options?: SelectOption[];
  disabled?: boolean;
  hidden?: boolean;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
}

// Theme Types
export interface ThemeConfig {
  colors: {
    primary: ColorScale;
    secondary: ColorScale;
    accent: ColorScale;
    neutral: ColorScale;
    success: ColorScale;
    warning: ColorScale;
    error: ColorScale;
    info: ColorScale;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  typography: TypographyConfig;
  breakpoints: Record<string, string>;
}

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface TypographyConfig {
  fontFamily: Record<string, string[]>;
  fontSize: Record<string, [string, { lineHeight: string; letterSpacing?: string }]>;
  fontWeight: Record<string, string>;
}

// Performance Types
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
}

export interface OptimizationOptions {
  lazy: boolean;
  memo: boolean;
  virtualization: boolean;
  compression: boolean;
  caching: boolean;
}

// Export all types for easy importing
export type {
  BaseComponentProps,
  ContentFormData,
  Platform,
  ViralPrediction,
  PredictionFactor,
  AnalyticsMetric,
  PerformanceInsight,
  FilterOptions,
  Collaborator,
  Comment,
  Version,
  Activity,
  UserProfile,
  OnboardingStep,
  FeatureTour,
  LoadingState,
  ErrorState,
  A11yProps,
  FormField,
  FormState,
  ThemeConfig,
  PerformanceMetrics
};