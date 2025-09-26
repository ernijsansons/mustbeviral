/**
 * Core Service Interfaces - Domain Service Pattern
 * Enforces Single Responsibility and Interface Segregation Principles
 */

export interface IBaseService {
  readonly name: string;
  readonly version: string;
  isHealthy(): Promise<boolean>;
  getMetrics(): Promise<ServiceMetrics>;
}

export interface ICommandService<TCommand, TResult = void> extends IBaseService {
  execute(command: TCommand): Promise<TResult>;
}

export interface IQueryService<TQuery, TResult> extends IBaseService {
  query(query: TQuery): Promise<TResult>;
}

export interface IEventHandler<TEvent> extends IBaseService {
  handle(event: TEvent): Promise<void>;
  canHandle(event: any): boolean;
}

// User Domain Services
export interface IUserAuthenticationService extends IBaseService {
  authenticate(credentials: AuthenticationCredentials): Promise<AuthenticationResult>;
  validateToken(token: string): Promise<TokenValidationResult>;
  refreshToken(refreshToken: string): Promise<TokenRefreshResult>;
  logout(token: string): Promise<void>;
}

export interface IUserRegistrationService extends IBaseService {
  register(userData: UserRegistrationData): Promise<UserRegistrationResult>;
  verifyEmail(token: string): Promise<EmailVerificationResult>;
  resendVerification(email: string): Promise<void>;
}

// Content Domain Services
export interface IContentGenerationService extends IBaseService {
  generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResult>;
  optimizeContent(content: string, platform: string): Promise<ContentOptimizationResult>;
  validateContent(content: string, rules: ContentValidationRules): Promise<ContentValidationResult>;
}

export interface IContentAnalysisService extends IBaseService {
  analyzeEngagement(contentId: string): Promise<EngagementAnalysisResult>;
  predictVirality(content: string): Promise<ViralityPredictionResult>;
  analyzeSentiment(content: string): Promise<SentimentAnalysisResult>;
}

// Campaign Domain Services
export interface ICampaignManagementService extends IBaseService {
  createCampaign(campaign: CreateCampaignRequest): Promise<Campaign>;
  scheduleCampaign(campaignId: string, schedule: CampaignSchedule): Promise<void>;
  executeCampaign(campaignId: string): Promise<CampaignExecutionResult>;
  monitorCampaign(campaignId: string): Promise<CampaignMetrics>;
}

// Analytics Domain Services
export interface IAnalyticsService extends IBaseService {
  trackEvent(event: AnalyticsEvent): Promise<void>;
  generateReport(reportConfig: ReportConfiguration): Promise<AnalyticsReport>;
  getRealTimeMetrics(filters: MetricsFilters): Promise<RealTimeMetrics>;
}

// Platform Integration Services
export interface IPlatformService extends IBaseService {
  publishContent(content: PlatformContent): Promise<PublishResult>;
  getMetrics(contentId: string): Promise<PlatformMetrics>;
  authenticate(): Promise<PlatformAuthResult>;
}

// Supporting Types
export interface ServiceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  lastHealthCheck: Date;
  customMetrics?: Record<string, any>;
}

export interface AuthenticationCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
}

export interface AuthenticationResult {
  success: boolean;
  user?: UserProfile;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  user?: UserProfile;
  expiresAt?: Date;
  error?: string;
}

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  expiresIn?: number;
  error?: string;
}

export interface UserRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
  marketingOptIn?: boolean;
}

export interface UserRegistrationResult {
  success: boolean;
  userId?: string;
  verificationRequired?: boolean;
  error?: string;
}

export interface EmailVerificationResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export interface ContentGenerationRequest {
  type: 'post' | 'article' | 'video_script' | 'email' | 'ad_copy';
  topic: string;
  tone: 'professional' | 'casual' | 'humorous' | 'inspiring' | 'urgent';
  targetAudience: string;
  platform: string;
  length: 'short' | 'medium' | 'long';
  keywords?: string[];
  constraints?: ContentConstraints;
}

export interface ContentGenerationResult {
  success: boolean;
  content?: string;
  metadata?: ContentMetadata;
  suggestions?: string[];
  error?: string;
}

export interface ContentOptimizationResult {
  optimizedContent: string;
  improvements: string[];
  score: number;
  platformSpecificTips: string[];
}

export interface ContentValidationResult {
  isValid: boolean;
  score: number;
  issues: ValidationIssue[];
  recommendations: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  preferences: UserPreferences;
}

export interface ContentConstraints {
  maxLength?: number;
  minLength?: number;
  includedPhrases?: string[];
  excludedWords?: string[];
  requiredHashtags?: string[];
}

export interface ContentMetadata {
  generatedAt: Date;
  tokensUsed: number;
  model: string;
  confidence: number;
  platform: string;
}

export interface ValidationIssue {
  type: 'warning' | 'error';
  message: string;
  field?: string;
  severity: number;
}

export interface UserPreferences {
  timezone: string;
  language: string;
  notifications: NotificationPreferences;
  contentSettings: ContentPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

export interface ContentPreferences {
  defaultTone: string;
  preferredPlatforms: string[];
  autoOptimize: boolean;
}

// Campaign Types
export interface CreateCampaignRequest {
  name: string;
  description: string;
  type: 'product_launch' | 'brand_awareness' | 'lead_generation' | 'engagement';
  targetAudience: AudienceSegment;
  budget: CampaignBudget;
  timeline: CampaignTimeline;
  goals: CampaignGoal[];
  platforms: string[];
}

export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  metrics?: CampaignMetrics;
}

export interface CampaignSchedule {
  startDate: Date;
  endDate: Date;
  timezone: string;
  publishingTimes: PublishingTime[];
}

export interface CampaignExecutionResult {
  success: boolean;
  executedContent: ExecutedContent[];
  failedContent: FailedContent[];
  summary: ExecutionSummary;
}

export interface CampaignMetrics {
  reach: number;
  impressions: number;
  engagement: number;
  clicks: number;
  conversions: number;
  cost: number;
  roi: number;
}

export interface AudienceSegment {
  demographics: Demographics;
  interests: string[];
  behaviors: string[];
  location: Location[];
}

export interface CampaignBudget {
  total: number;
  daily: number;
  currency: string;
  bidStrategy: 'manual' | 'automatic';
}

export interface CampaignTimeline {
  startDate: Date;
  endDate: Date;
  phases: CampaignPhase[];
}

export interface CampaignGoal {
  type: 'reach' | 'engagement' | 'conversions' | 'brand_awareness';
  target: number;
  priority: 'high' | 'medium' | 'low';
}

export interface PublishingTime {
  dayOfWeek: number;
  hour: number;
  minute: number;
}

export interface ExecutedContent {
  contentId: string;
  platform: string;
  publishedAt: Date;
  metrics: ContentMetrics;
}

export interface FailedContent {
  contentId: string;
  platform: string;
  error: string;
  retryCount: number;
}

export interface ExecutionSummary {
  totalContent: number;
  successfulPublications: number;
  failedPublications: number;
  totalReach: number;
  totalEngagement: number;
}

export interface Demographics {
  ageRange: [number, number];
  gender: string[];
  income: [number, number];
  education: string[];
  occupation: string[];
}

export interface Location {
  country: string;
  region?: string;
  city?: string;
}

export interface CampaignPhase {
  name: string;
  startDate: Date;
  endDate: Date;
  objectives: string[];
  content: string[];
}

export interface ContentMetrics {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  saves: number;
  clicks: number;
}

// Analytics Types
export interface AnalyticsEvent {
  type: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  properties: Record<string, any>;
  context: EventContext;
}

export interface ReportConfiguration {
  type: 'performance' | 'engagement' | 'audience' | 'custom';
  dateRange: DateRange;
  metrics: string[];
  dimensions: string[];
  filters: Record<string, any>;
  format: 'json' | 'csv' | 'pdf';
}

export interface AnalyticsReport {
  id: string;
  type: string;
  generatedAt: Date;
  data: ReportData;
  summary: ReportSummary;
  charts: ChartData[];
}

export interface MetricsFilters {
  dateRange?: DateRange;
  platforms?: string[];
  contentTypes?: string[];
  campaigns?: string[];
}

export interface RealTimeMetrics {
  timestamp: Date;
  activeUsers: number;
  totalSessions: number;
  conversionRate: number;
  topContent: TopContentMetrics[];
  platformBreakdown: PlatformBreakdown[];
}

export interface EventContext {
  userAgent: string;
  ipAddress: string;
  referrer?: string;
  page?: string;
  platform: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ReportData {
  rows: Record<string, any>[];
  metadata: ReportMetadata;
}

export interface ReportSummary {
  totalMetrics: Record<string, number>;
  trends: TrendData[];
  insights: string[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  data: ChartPoint[];
  options: ChartOptions;
}

export interface ReportMetadata {
  rowCount: number;
  columnCount: number;
  generationTime: number;
  dataFreshness: Date;
}

export interface TrendData {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number;
  period: string;
}

export interface TopContentMetrics {
  contentId: string;
  title: string;
  views: number;
  engagement: number;
  score: number;
}

export interface PlatformBreakdown {
  platform: string;
  users: number;
  sessions: number;
  conversionRate: number;
}

export interface ChartPoint {
  x: string | number | Date;
  y: number;
  label?: string;
}

export interface ChartOptions {
  responsive: boolean;
  legend: boolean;
  colors: string[];
  axes: AxisOptions;
}

export interface AxisOptions {
  x: AxisConfig;
  y: AxisConfig;
}

export interface AxisConfig {
  title: string;
  type: 'linear' | 'logarithmic' | 'category' | 'time';
  min?: number;
  max?: number;
}

// Platform Integration Types
export interface PlatformContent {
  id: string;
  content: string;
  mediaUrls?: string[];
  scheduledFor?: Date;
  hashtags?: string[];
  mentions?: string[];
  platform: string;
  contentType: string;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  publishedAt?: Date;
  url?: string;
  error?: string;
}

export interface PlatformMetrics {
  postId: string;
  platform: string;
  metrics: Record<string, number>;
  lastUpdated: Date;
}

export interface PlatformAuthResult {
  success: boolean;
  expiresAt?: Date;
  permissions?: string[];
  error?: string;
}

// Additional specialized service interfaces for viral marketing
export interface IViralContentService extends IBaseService {
  generateViralContent(seed: ViralSeed): Promise<ViralContentResult>;
  predictViralPotential(content: string): Promise<ViralPrediction>;
  optimizeForVirality(content: string, platform: string): Promise<OptimizedViralContent>;
}

export interface ITrendAnalysisService extends IBaseService {
  analyzeTrends(timeframe: TimeFrame): Promise<TrendAnalysis>;
  predictEmergingTrends(): Promise<EmergingTrend[]>;
  getTopicRecommendations(audience: string): Promise<TopicRecommendation[]>;
}

export interface IInfluencerMatchingService extends IBaseService {
  findInfluencers(criteria: InfluencerCriteria): Promise<InfluencerMatch[]>;
  analyzeInfluencerFit(influencerId: string, campaignId: string): Promise<InfluencerFitAnalysis>;
  estimateInfluencerCost(influencerId: string, campaign: CampaignSummary): Promise<CostEstimate>;
}

export interface ViralSeed {
  topic: string;
  emotion: 'joy' | 'surprise' | 'anger' | 'fear' | 'sadness' | 'trust';
  format: 'meme' | 'story' | 'challenge' | 'controversy' | 'educational';
  targetPlatform: string;
}

export interface ViralContentResult {
  content: string;
  viralScore: number;
  expectedReach: number;
  recommendations: ViralRecommendation[];
}

export interface ViralPrediction {
  score: number;
  factors: ViralFactor[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OptimizedViralContent {
  originalContent: string;
  optimizedContent: string;
  improvements: ContentImprovement[];
  expectedIncrease: number;
}

export interface TimeFrame {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  count: number;
}

export interface TrendAnalysis {
  trends: Trend[];
  insights: TrendInsight[];
  predictions: TrendPrediction[];
}

export interface EmergingTrend {
  topic: string;
  momentum: number;
  platforms: string[];
  estimatedPeak: Date;
}

export interface TopicRecommendation {
  topic: string;
  relevanceScore: number;
  difficulty: number;
  estimatedEngagement: number;
}

export interface InfluencerCriteria {
  niche: string;
  minFollowers: number;
  maxFollowers: number;
  platforms: string[];
  location?: string;
  engagementRate: number;
  budget: number;
}

export interface InfluencerMatch {
  influencerId: string;
  name: string;
  handle: string;
  platform: string;
  followers: number;
  engagementRate: number;
  matchScore: number;
  estimatedCost: number;
}

export interface InfluencerFitAnalysis {
  overallFit: number;
  audienceOverlap: number;
  brandAlignment: number;
  contentQuality: number;
  risks: string[];
  opportunities: string[];
}

export interface CostEstimate {
  min: number;
  max: number;
  recommended: number;
  currency: string;
  breakdown: CostBreakdown[];
}

export interface ViralRecommendation {
  type: 'timing' | 'platform' | 'format' | 'hashtag';
  suggestion: string;
  impact: number;
}

export interface ViralFactor {
  factor: string;
  score: number;
  importance: number;
  explanation: string;
}

export interface ContentImprovement {
  type: 'structure' | 'hook' | 'cta' | 'timing' | 'visual';
  description: string;
  impact: number;
}

export interface Trend {
  topic: string;
  volume: number;
  growth: number;
  platforms: PlatformTrendData[];
}

export interface TrendInsight {
  type: 'opportunity' | 'threat' | 'neutral';
  description: string;
  confidence: number;
  timeframe: string;
}

export interface TrendPrediction {
  topic: string;
  direction: 'rising' | 'falling' | 'stable';
  confidence: number;
  timeline: string;
}

export interface PlatformTrendData {
  platform: string;
  volume: number;
  growth: number;
  sentiment: number;
}

export interface CostBreakdown {
  item: string;
  cost: number;
  percentage: number;
}