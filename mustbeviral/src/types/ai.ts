/**
 * AI Service and Content Generation Types
 * Replaces 'any' types with proper type definitions
 */

// AI Service Interface Types
export interface AIServiceResponse<T = AIGeneratedContent> {
  success: boolean;
  data: T;
  model: string;
  usage: AIUsageMetrics;
  metadata: AIResponseMetadata;
  warnings?: string[];
  error?: AIError;
}

export interface AIGeneratedContent {
  content: string;
  confidence: number;
  alternatives?: string[];
  reasoning?: string;
  sources?: string[];
}

export interface AIUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
  latency: number;
  model: string;
}

export interface AIResponseMetadata {
  requestId: string;
  timestamp: string;
  processingTime: number;
  retryCount: number;
  cached: boolean;
  modelVersion: string;
}

export interface AIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  suggestedAction?: string;
}

// Content Generation Types
export interface ContentGenerationContext {
  topic: string;
  tone: ContentTone;
  audience: AudienceType;
  platform?: PlatformType;
  keywords?: string[];
  length: ContentLength;
  style?: ContentStyle;
  constraints?: ContentConstraints;
  previousContent?: string[];
}

export type ContentTone = 
  | 'professional' 
  | 'casual' 
  | 'humorous' 
  | 'urgent' 
  | 'inspiring' 
  | 'educational' 
  | 'conversational' 
  | 'authoritative';

export type AudienceType = 
  | 'general' 
  | 'professionals' 
  | 'students' 
  | 'seniors' 
  | 'teenagers' 
  | 'parents' 
  | 'entrepreneurs' 
  | 'technical';

export type PlatformType = 
  | 'twitter' 
  | 'linkedin' 
  | 'facebook' 
  | 'instagram' 
  | 'tiktok' 
  | 'youtube' 
  | 'blog' 
  | 'email' 
  | 'newsletter';

export type ContentLength = 'short' | 'medium' | 'long' | 'very_long';

export interface ContentStyle {
  voice: 'first_person' | 'second_person' | 'third_person';
  format: 'paragraph' | 'bullet_points' | 'numbered_list' | 'story' | 'dialogue';
  structure?: ContentStructure;
}

export interface ContentStructure {
  introduction: boolean;
  body: 'single' | 'multiple_sections' | 'chapters';
  conclusion: boolean;
  callToAction: boolean;
  headers?: boolean;
}

export interface ContentConstraints {
  maxLength?: number;
  minLength?: number;
  includedPhrases?: string[];
  excludedWords?: string[];
  requiredHashtags?: string[];
  language?: string;
  readingLevel?: 'elementary' | 'middle_school' | 'high_school' | 'college' | 'graduate';
}

// Enhanced Content Generation Result
export interface EnhancedContentResult {
  content: string;
  title?: string;
  description?: string;
  tags: string[];
  metadata: ContentMetadata;
  suggestions: ContentSuggestions;
  analytics: ContentAnalytics;
  seo?: SEOData;
  viral?: ViralData;
}

export interface ContentMetadata {
  wordCount: number;
  characterCount: number;
  readingTime: number;
  sentiment: SentimentData;
  confidence: number;
  model: string;
  tokensUsed: number;
  generatedAt: string;
  version: string;
}

export interface SentimentData {
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;
  scores: {
    positive: number;
    neutral: number;
    negative: number;
  };
  emotions?: EmotionData[];
}

export interface EmotionData {
  emotion: 'joy' | 'anger' | 'fear' | 'sadness' | 'surprise' | 'disgust' | 'trust';
  intensity: number;
  confidence: number;
}

export interface ContentSuggestions {
  improvements: ContentImprovement[];
  seoTips: string[];
  hashtags: string[];
  alternativeTitles?: string[];
  relatedTopics?: string[];
  optimizations?: PlatformOptimization[];
}

export interface ContentImprovement {
  type: 'grammar' | 'clarity' | 'engagement' | 'structure' | 'tone' | 'length';
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
  position?: {
    start: number;
    end: number;
  };
}

export interface PlatformOptimization {
  platform: PlatformType;
  suggestions: string[];
  optimalLength: {
    min: number;
    max: number;
  };
  requiredElements: string[];
}

export interface ContentAnalytics {
  readabilityScore: number;
  keywordDensity: Record<string, number>;
  entityMentions: EntityMention[];
  topics: TopicAnalysis[];
  languageMetrics: LanguageMetrics;
}

export interface EntityMention {
  entity: string;
  type: 'person' | 'organization' | 'location' | 'product' | 'event' | 'concept';
  mentions: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

export interface TopicAnalysis {
  topic: string;
  relevance: number;
  mentions: number;
  context: string[];
}

export interface LanguageMetrics {
  averageSentenceLength: number;
  averageWordLength: number;
  complexWords: number;
  passiveVoice: number;
  adverbs: number;
  fleschKincaidLevel: number;
}

export interface SEOData {
  score: number;
  title: SEOElement;
  description: SEOElement;
  keywords: SEOKeywordAnalysis[];
  recommendations: string[];
  technicalIssues: string[];
}

export interface SEOElement {
  content: string;
  length: number;
  optimal: boolean;
  issues: string[];
  suggestions: string[];
}

export interface SEOKeywordAnalysis {
  keyword: string;
  density: number;
  prominence: number;
  variations: string[];
  context: string[];
  recommendations: string[];
}

export interface ViralData {
  score: number;
  factors: ViralFactor[];
  predictions: ViralPrediction[];
  recommendations: ViralRecommendation[];
  shareability: ShareabilityAnalysis;
}

export interface ViralFactor {
  factor: 'emotional_appeal' | 'controversy' | 'novelty' | 'timing' | 'relatability' | 'humor' | 'surprise';
  score: number;
  importance: number;
  explanation: string;
  examples: string[];
}

export interface ViralPrediction {
  platform: PlatformType;
  expectedReach: number;
  confidence: number;
  timeframe: string;
  peakTime?: string;
}

export interface ViralRecommendation {
  type: 'timing' | 'platform' | 'format' | 'hashtag' | 'hook' | 'cta';
  suggestion: string;
  impact: number;
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
}

export interface ShareabilityAnalysis {
  overall: number;
  factors: {
    emotional: number;
    practical: number;
    social: number;
    informational: number;
  };
  barriers: string[];
  enablers: string[];
}

// Model and Provider Types
export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  maxTokens: number;
  costPer1kTokens: number;
  capabilities: AICapability[];
  languages: string[];
  strengths: string[];
  limitations: string[];
}

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'cloudflare' | 'huggingface' | 'cohere';

export type AICapability = 
  | 'text_generation' 
  | 'text_completion' 
  | 'text_editing' 
  | 'summarization' 
  | 'translation' 
  | 'sentiment_analysis' 
  | 'entity_extraction' 
  | 'question_answering' 
  | 'code_generation' 
  | 'creative_writing';

// Batch Processing Types
export interface BatchProcessingOptions {
  batchSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  delayBetweenBatches: number;
  failureThreshold: number;
  progressCallback?: (progress: BatchProgress) => void;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface BatchResult<T = EnhancedContentResult> {
  results: T[];
  failures: BatchFailure[];
  summary: BatchSummary;
}

export interface BatchFailure {
  index: number;
  input: unknown;
  error: AIError;
  retryCount: number;
}

export interface BatchSummary {
  total: number;
  successful: number;
  failed: number;
  totalTokensUsed: number;
  totalCost?: number;
  averageLatency: number;
  processingTime: number;
}

// Configuration Types
export interface AIServiceConfig {
  apiKey: string;
  baseUrl?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimits: RateLimitConfig;
  defaultModel: string;
  fallbackModels: string[];
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerHour: number;
  tokensPerHour: number;
}

// Environment and Context Types
export interface AIEnvironmentConfig {
  models: Record<string, AIModel>;
  providers: Record<AIProvider, AIServiceConfig>;
  features: FeatureFlags;
  limits: UsageLimits;
  monitoring: MonitoringConfig;
}

export interface FeatureFlags {
  batchProcessing: boolean;
  caching: boolean;
  fallbackModels: boolean;
  costOptimization: boolean;
  qualityChecks: boolean;
  viralAnalysis: boolean;
  seoOptimization: boolean;
}

export interface UsageLimits {
  maxRequestsPerUser: number;
  maxTokensPerUser: number;
  maxBatchSize: number;
  maxConcurrentRequests: number;
}

export interface MonitoringConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  metricsCollection: boolean;
  errorTracking: boolean;
  performanceMonitoring: boolean;
}