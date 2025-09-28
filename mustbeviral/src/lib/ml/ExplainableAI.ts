import { ContentFeatures } from './FeatureExtractor';
import { SocialPlatform, ViralPrediction } from './ViralPredictionEngine';
import { PredictionResult, FeatureImportance } from './machineLearningPipeline';

export interface ViralExplanation {
  factors: ExplanationFactor[];
  importance: FeatureImportance[];
  reasoning: string;
  confidence: number;
  timestamp: number;
  recommendations: ActionableRecommendation[];
  whatIf: WhatIfScenario[];
  comparisons: ComparisonInsight[];
}

export interface ExplanationFactor {
  category: 'content' | 'timing' | 'audience' | 'platform' | 'trend' | 'creator';
  factor: string;
  impact: number; // -1 to 1 (negative to positive impact)
  confidence: number; // 0 to 1
  explanation: string;
  evidence: string[];
  weight: number; // How much this factor contributed to final score
}

export interface ActionableRecommendation {
  type: 'improve' | 'maintain' | 'avoid' | 'experiment';
  priority: 'high' | 'medium' | 'low';
  action: string;
  expectedImpact: number; // Expected score improvement
  effort: 'low' | 'medium' | 'high';
  timeline: 'immediate' | 'short-term' | 'long-term';
  specifics: string[];
  examples: string[];
}

export interface WhatIfScenario {
  change: string;
  originalValue: number;
  newValue: number;
  scoreChange: number;
  confidence: number;
  explanation: string;
}

export interface ComparisonInsight {
  comparisonType: 'platform' | 'timing' | 'similar_content' | 'competitor';
  comparison: string;
  scoreDifference: number;
  keyDifferences: string[];
  actionableInsights: string[];
}

export interface ExplanationConfig {
  detailLevel: 'basic' | 'detailed' | 'expert';
  includeWhatIf: boolean;
  includeComparisons: boolean;
  maxRecommendations: number;
  focusAreas: ExplanationFactor['category'][];
  audienceLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface ModelExplanation {
  modelType: string;
  algorithm: string;
  keyFactors: string[];
  decisionPath: DecisionNode[];
  confidence: number;
  uncertaintyFactors: string[];
}

export interface DecisionNode {
  feature: string;
  threshold: number;
  value: number;
  decision: 'left' | 'right';
  probability: number;
  explanation: string;
}

export interface FeatureAnalysis {
  feature: string;
  currentValue: number;
  optimalRange: { min: number; max: number };
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
  distribution: {
    percentile: number;
    zScore: number;
    compared_to: 'viral_content' | 'all_content' | 'platform_average';
  };
  suggestions: string[];
}

export class ExplainableAI {
  private explanationTemplates: Map<string, string> = new Map();
  private featureMetadata: Map<string, any> = new Map();
  private comparisonData: Map<SocialPlatform, any> = new Map();

  constructor() {
    this.initializeTemplates();
    this.initializeFeatureMetadata();
    this.initializeComparisonData();
  }

  /**
   * Generate comprehensive explanation for viral prediction
   */
  async explainPrediction(
    prediction: PredictionResult,
    features: ContentFeatures,
    platform: SocialPlatform,
    config: Partial<ExplanationConfig> = {}
  ): Promise<ViralExplanation> {
    const fullConfig: ExplanationConfig = {
      detailLevel: 'detailed',
      includeWhatIf: true,
      includeComparisons: true,
      maxRecommendations: 5,
      focusAreas: ['content', 'timing', 'platform'],
      audienceLevel: 'intermediate',
      ...config
    };

    // Analyze feature importance
    const featureAnalysis = await this.analyzeFeatures(prediction.explanation || [], features, platform);

    // Generate explanation factors
    const factors = await this.generateExplanationFactors(featureAnalysis, features, platform, fullConfig);

    // Create actionable recommendations
    const recommendations = await this.generateRecommendations(factors, features, platform, fullConfig);

    // Generate what-if scenarios
    const whatIf = fullConfig.includeWhatIf
      ? await this.generateWhatIfScenarios(features, platform, prediction.prediction as number)
      : [];

    // Generate comparisons
    const comparisons = fullConfig.includeComparisons
      ? await this.generateComparisons(features, platform, prediction.prediction as number)
      : [];

    // Create narrative reasoning
    const reasoning = await this.generateReasoning(factors, prediction.confidence, fullConfig);

    return {
      factors,
      importance: prediction.explanation || [],
      reasoning,
      confidence: prediction.confidence,
      timestamp: Date.now(),
      recommendations,
      whatIf,
      comparisons
    };
  }

  /**
   * Explain why content didn't go viral
   */
  async explainNonViralContent(
    features: ContentFeatures,
    platform: SocialPlatform,
    actualScore: number
  ): Promise<{
    limitingFactors: ExplanationFactor[];
    missedOpportunities: string[];
    competitorComparison: ComparisonInsight[];
    improvementPlan: ActionableRecommendation[];
  }> {
    // Identify limiting factors
    const limitingFactors = await this.identifyLimitingFactors(features, platform, actualScore);

    // Find missed opportunities
    const missedOpportunities = await this.identifyMissedOpportunities(features, platform);

    // Compare with successful content
    const competitorComparison = await this.compareWithSuccessfulContent(features, platform);

    // Create improvement plan
    const improvementPlan = await this.createImprovementPlan(limitingFactors, missedOpportunities);

    return {
      limitingFactors,
      missedOpportunities,
      competitorComparison,
      improvementPlan
    };
  }

  /**
   * Explain model decision process
   */
  async explainModelDecision(
    features: ContentFeatures,
    modelPrediction: number,
    platform: SocialPlatform
  ): Promise<ModelExplanation> {
    // Simulate decision tree traversal
    const decisionPath = await this.traceDecisionPath(features, platform);

    // Identify key contributing factors
    const keyFactors = await this.identifyKeyFactors(features, decisionPath);

    // Assess uncertainty
    const uncertaintyFactors = await this.assessUncertainty(features, platform);

    return {
      modelType: 'Gradient Boosted Trees',
      algorithm: 'XGBoost with SHAP explanations',
      keyFactors,
      decisionPath,
      confidence: this.calculateModelConfidence(decisionPath),
      uncertaintyFactors
    };
  }

  /**
   * Generate feature-level explanations
   */
  async explainFeatures(
    features: ContentFeatures,
    platform: SocialPlatform
  ): Promise<FeatureAnalysis[]> {
    const analyses: FeatureAnalysis[] = [];

    const importantFeatures = this.getImportantFeatures(platform);

    for (const featureName of importantFeatures) {
      const currentValue = features[featureName] as number;
      if (typeof currentValue === 'number') {
        const analysis = await this.analyzeIndividualFeature(
          featureName,
          currentValue,
          platform
        );
        analyses.push(analysis);
      }
    }

    return analyses.sort((a, b) => Math.abs(b.impact === 'positive' ? 1 : -1) - Math.abs(a.impact === 'positive' ? 1 : -1));
  }

  /**
   * Generate counterfactual explanations
   */
  async generateCounterfactuals(
    features: ContentFeatures,
    platform: SocialPlatform,
    currentScore: number,
    targetScore: number
  ): Promise<{
    changes: { feature: string; from: number; to: number; impact: number }[];
    explanation: string;
    feasibility: number;
    effortRequired: 'low' | 'medium' | 'high';
  }> {
    const changes = [];
    const minimalChanges = await this.findMinimalChanges(features, platform, currentScore, targetScore);

    for (const change of minimalChanges) {
      changes.push({
        feature: change.feature,
        from: change.originalValue,
        to: change.suggestedValue,
        impact: change.expectedImpact
      });
    }

    const explanation = await this.explainCounterfactual(changes, targetScore - currentScore);
    const feasibility = this.assessFeasibility(changes);
    const effortRequired = this.assessEffort(changes);

    return {
      changes,
      explanation,
      feasibility,
      effortRequired
    };
  }

  /**
   * Explain prediction uncertainty and confidence intervals
   */
  async explainUncertainty(
    prediction: number,
    confidence: number,
    features: ContentFeatures,
    platform: SocialPlatform
  ): Promise<{
    confidenceInterval: { lower: number; upper: number };
    uncertaintyFactors: string[];
    dataQualityIssues: string[];
    modelLimitations: string[];
    recommendations: string[];
  }> {
    // Calculate confidence interval
    const margin = (1 - confidence) * 50; // Simplified calculation
    const confidenceInterval = {
      lower: Math.max(0, prediction - margin),
      upper: Math.min(100, prediction + margin)
    };

    // Identify uncertainty factors
    const uncertaintyFactors = await this.identifyUncertaintyFactors(features, platform);

    // Check data quality
    const dataQualityIssues = await this.assessDataQuality(features);

    // Identify model limitations
    const modelLimitations = await this.identifyModelLimitations(features, platform);

    // Generate recommendations for improving confidence
    const recommendations = await this.generateConfidenceRecommendations(
      uncertaintyFactors,
      dataQualityIssues
    );

    return {
      confidenceInterval,
      uncertaintyFactors,
      dataQualityIssues,
      modelLimitations,
      recommendations
    };
  }

  // Private methods

  private async analyzeFeatures(
    featureImportance: FeatureImportance[],
    features: ContentFeatures,
    platform: SocialPlatform
  ): Promise<Map<string, FeatureAnalysis>> {
    const analysis = new Map<string, FeatureAnalysis>();

    for (const importance of featureImportance) {
      const featureName = importance.feature;
      const currentValue = features[featureName] as number;

      if (typeof currentValue === 'number') {
        const featureAnalysis = await this.analyzeIndividualFeature(
          featureName,
          currentValue,
          platform
        );
        analysis.set(featureName, featureAnalysis);
      }
    }

    return analysis;
  }

  private async generateExplanationFactors(
    featureAnalysis: Map<string, FeatureAnalysis>,
    features: ContentFeatures,
    platform: SocialPlatform,
    config: ExplanationConfig
  ): Promise<ExplanationFactor[]> {
    const factors: ExplanationFactor[] = [];

    // Content factors
    if (config.focusAreas.includes('content')) {
      factors.push(...await this.generateContentFactors(features, featureAnalysis));
    }

    // Timing factors
    if (config.focusAreas.includes('timing')) {
      factors.push(...await this.generateTimingFactors(features, featureAnalysis));
    }

    // Platform factors
    if (config.focusAreas.includes('platform')) {
      factors.push(...await this.generatePlatformFactors(features, platform, featureAnalysis));
    }

    // Sort by impact and return top factors
    return factors
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .slice(0, config.detailLevel === 'basic' ? 3 : config.detailLevel === 'detailed' ? 7 : 12);
  }

  private async generateContentFactors(
    features: ContentFeatures,
    analysis: Map<string, FeatureAnalysis>
  ): Promise<ExplanationFactor[]> {
    const factors: ExplanationFactor[] = [];

    // Text quality factor
    const textScore = (features.readability_score + features.information_density * 100) / 2;
    factors.push({
      category: 'content',
      factor: 'Text Quality',
      impact: (textScore - 60) / 40, // Normalize around 60 as baseline
      confidence: 0.8,
      explanation: `Content readability and information density affects engagement`,
      evidence: [
        `Readability score: ${features.readability_score}/100`,
        `Information density: ${(features.information_density * 100).toFixed(1)}%`
      ],
      weight: 0.15
    });

    // Emotional engagement factor
    const emotionalScore = features.emotion_scores * 100;
    factors.push({
      category: 'content',
      factor: 'Emotional Appeal',
      impact: (emotionalScore - 50) / 50,
      confidence: 0.9,
      explanation: `Emotional content typically generates more engagement and shares`,
      evidence: [
        `Emotional intensity: ${emotionalScore.toFixed(1)}%`,
        `Sentiment score: ${features.sentiment_score.toFixed(2)}`
      ],
      weight: 0.2
    });

    // Call to action factor
    const ctaScore = features.call_to_action_score * 100;
    factors.push({
      category: 'content',
      factor: 'Call to Action',
      impact: (ctaScore - 30) / 70,
      confidence: 0.7,
      explanation: `Clear calls-to-action encourage audience interaction and engagement`,
      evidence: [
        `CTA strength: ${ctaScore.toFixed(1)}%`,
        `Question count: ${features.question_count}`
      ],
      weight: 0.12
    });

    return factors;
  }

  private async generateTimingFactors(
    features: ContentFeatures,
    analysis: Map<string, FeatureAnalysis>
  ): Promise<ExplanationFactor[]> {
    const factors: ExplanationFactor[] = [];

    // Optimal timing factor
    const timingScore = features.optimal_timing_score * 100;
    factors.push({
      category: 'timing',
      factor: 'Posting Time Optimization',
      impact: (timingScore - 50) / 50,
      confidence: 0.75,
      explanation: `Posting at optimal times when your audience is most active increases visibility`,
      evidence: [
        `Timing score: ${timingScore.toFixed(1)}%`,
        `Day of week score: ${(features.day_of_week_score * 100).toFixed(1)}%`,
        `Hour score: ${(features.hour_of_day_score * 100).toFixed(1)}%`
      ],
      weight: 0.1
    });

    // Trending topics timing
    const trendScore = features.trending_topics_score * 100;
    factors.push({
      category: 'timing',
      factor: 'Trend Alignment',
      impact: (trendScore - 30) / 70,
      confidence: 0.85,
      explanation: `Aligning with current trends and conversations increases discoverability`,
      evidence: [
        `Trend alignment: ${trendScore.toFixed(1)}%`,
        `Current events relevance: ${(features.current_events_relevance * 100).toFixed(1)}%`
      ],
      weight: 0.15
    });

    return factors;
  }

  private async generatePlatformFactors(
    features: ContentFeatures,
    platform: SocialPlatform,
    analysis: Map<string, FeatureAnalysis>
  ): Promise<ExplanationFactor[]> {
    const factors: ExplanationFactor[] = [];

    // Platform optimization
    const platformScore = features.platform_optimization_score * 100;
    factors.push({
      category: 'platform',
      factor: 'Platform Optimization',
      impact: (platformScore - 60) / 40,
      confidence: 0.8,
      explanation: `Content optimized for ${platform} specific features and audience preferences`,
      evidence: [
        `Platform optimization: ${platformScore.toFixed(1)}%`,
        `Format suitability: ${(features.format_suitability_score * 100).toFixed(1)}%`
      ],
      weight: 0.12
    });

    // Hashtag strategy (for platforms that use them)
    if (['twitter', 'instagram', 'tiktok'].includes(platform)) {
      const hashtagScore = features.hashtag_trending_score * 100;
      factors.push({
        category: 'platform',
        factor: 'Hashtag Strategy',
        impact: (hashtagScore - 40) / 60,
        confidence: 0.7,
        explanation: `Strategic hashtag use increases discoverability on ${platform}`,
        evidence: [
          `Hashtag count: ${features.hashtag_count}`,
          `Trending hashtag score: ${hashtagScore.toFixed(1)}%`
        ],
        weight: 0.08
      });
    }

    return factors;
  }

  private async generateRecommendations(
    factors: ExplanationFactor[],
    features: ContentFeatures,
    platform: SocialPlatform,
    config: ExplanationConfig
  ): Promise<ActionableRecommendation[]> {
    const recommendations: ActionableRecommendation[] = [];

    // Generate recommendations based on factors with negative impact
    const negativeFactors = factors.filter(f => f.impact < -0.1);

    for (const factor of negativeFactors.slice(0, config.maxRecommendations)) {
      const recommendation = await this.createRecommendationFromFactor(factor, features, platform);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Add general best practices if we have room
    if (recommendations.length < config.maxRecommendations) {
      const generalRecs = await this.generateGeneralRecommendations(features, platform);
      recommendations.push(...generalRecs.slice(0, config.maxRecommendations - recommendations.length));
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private async createRecommendationFromFactor(
    factor: ExplanationFactor,
    features: ContentFeatures,
    platform: SocialPlatform
  ): Promise<ActionableRecommendation | null> {
    switch (factor.factor) {
      case 'Text Quality':
        return {
          type: 'improve',
          priority: 'high',
          action: 'Improve content readability and information density',
          expectedImpact: Math.abs(factor.impact) * 15,
          effort: 'medium',
          timeline: 'immediate',
          specifics: [
            'Use simpler language for broader appeal',
            'Add more valuable information per sentence',
            'Break up long paragraphs with bullet points'
          ],
          examples: [
            'Instead of "Subsequently, we discovered..." use "We found..."',
            'Add specific numbers and data points',
            'Use subheadings to organize content'
          ]
        };

      case 'Emotional Appeal':
        return {
          type: 'improve',
          priority: 'high',
          action: 'Increase emotional engagement in your content',
          expectedImpact: Math.abs(factor.impact) * 20,
          effort: 'low',
          timeline: 'immediate',
          specifics: [
            'Use more emotionally resonant language',
            'Include personal stories or experiences',
            'Add enthusiasm and excitement to your tone'
          ],
          examples: [
            'Share personal wins or challenges',
            'Use words like "amazing", "incredible", "shocking"',
            'Ask questions that evoke emotional responses'
          ]
        };

      case 'Call to Action':
        return {
          type: 'improve',
          priority: 'medium',
          action: 'Add clear calls-to-action to encourage engagement',
          expectedImpact: Math.abs(factor.impact) * 12,
          effort: 'low',
          timeline: 'immediate',
          specifics: [
            'Include specific questions for audience',
            'Ask for shares, comments, or follows',
            'Create interactive elements'
          ],
          examples: [
            '"What do you think about this?"',
            '"Share if you agree!"',
            '"Comment your experience below"'
          ]
        };

      default:
        return null;
    }
  }

  private async generateGeneralRecommendations(
    features: ContentFeatures,
    platform: SocialPlatform
  ): Promise<ActionableRecommendation[]> {
    const recommendations: ActionableRecommendation[] = [];

    // Platform-specific recommendations
    switch (platform) {
      case 'twitter':
        recommendations.push({
          type: 'improve',
          priority: 'medium',
          action: 'Optimize for Twitter best practices',
          expectedImpact: 8,
          effort: 'low',
          timeline: 'immediate',
          specifics: [
            'Keep tweets concise (under 280 characters)',
            'Use 1-2 relevant hashtags maximum',
            'Include engaging visuals when possible'
          ],
          examples: [
            'Thread longer content across multiple tweets',
            'Use #hashtags strategically, not excessively',
            'Add images, GIFs, or videos to increase engagement'
          ]
        });
        break;

      case 'instagram':
        recommendations.push({
          type: 'improve',
          priority: 'medium',
          action: 'Enhance visual appeal for Instagram',
          expectedImpact: 12,
          effort: 'medium',
          timeline: 'short-term',
          specifics: [
            'Use high-quality, visually appealing images',
            'Write engaging captions with storytelling',
            'Use 5-11 strategic hashtags'
          ],
          examples: [
            'Ensure good lighting and composition',
            'Share behind-the-scenes content',
            'Mix popular and niche hashtags'
          ]
        });
        break;

      case 'tiktok':
        recommendations.push({
          type: 'improve',
          priority: 'high',
          action: 'Optimize for TikTok algorithm',
          expectedImpact: 15,
          effort: 'medium',
          timeline: 'immediate',
          specifics: [
            'Use trending sounds and effects',
            'Hook viewers in first 3 seconds',
            'Keep videos under 60 seconds'
          ],
          examples: [
            'Start with "POV:" or "Watch this!"',
            'Use popular music and sound effects',
            'Add captions for accessibility'
          ]
        });
        break;
    }

    return recommendations;
  }

  private async generateWhatIfScenarios(
    features: ContentFeatures,
    platform: SocialPlatform,
    currentScore: number
  ): Promise<WhatIfScenario[]> {
    const scenarios: WhatIfScenario[] = [];

    // Scenario: Improve emotional appeal
    const emotionalBoost = this.calculateWhatIfImpact('emotion_scores', features.emotion_scores, 0.8, platform);
    scenarios.push({
      change: 'Increase emotional appeal to 80%',
      originalValue: features.emotion_scores,
      newValue: 0.8,
      scoreChange: emotionalBoost,
      confidence: 0.8,
      explanation: 'Adding more emotional language and personal stories could significantly boost engagement'
    });

    // Scenario: Optimize timing
    const timingBoost = this.calculateWhatIfImpact('optimal_timing_score', features.optimal_timing_score, 0.9, platform);
    scenarios.push({
      change: 'Post at optimal time (90% timing score)',
      originalValue: features.optimal_timing_score,
      newValue: 0.9,
      scoreChange: timingBoost,
      confidence: 0.7,
      explanation: 'Posting when your audience is most active could improve reach and initial engagement'
    });

    // Scenario: Add trending elements
    const trendBoost = this.calculateWhatIfImpact('trending_topics_score', features.trending_topics_score, 0.7, platform);
    scenarios.push({
      change: 'Incorporate trending topics (70% alignment)',
      originalValue: features.trending_topics_score,
      newValue: 0.7,
      scoreChange: trendBoost,
      confidence: 0.6,
      explanation: 'Aligning with current trends could increase discoverability and relevance'
    });

    return scenarios.filter(s => s.scoreChange > 1); // Only show meaningful improvements
  }

  private calculateWhatIfImpact(
    feature: string,
    currentValue: number,
    newValue: number,
    platform: SocialPlatform
  ): number {
    // Simplified what-if calculation based on feature importance
    const featureWeights = {
      emotion_scores: 0.2,
      optimal_timing_score: 0.1,
      trending_topics_score: 0.15,
      call_to_action_score: 0.12,
      hashtag_trending_score: 0.08
    };

    const weight = featureWeights[feature] || 0.05;
    const improvement = (newValue - currentValue) * weight * 100;

    return Math.max(0, improvement);
  }

  private async generateComparisons(
    features: ContentFeatures,
    platform: SocialPlatform,
    currentScore: number
  ): Promise<ComparisonInsight[]> {
    const comparisons: ComparisonInsight[] = [];

    // Platform comparison
    comparisons.push({
      comparisonType: 'platform',
      comparison: `Compared to average ${platform} content`,
      scoreDifference: currentScore - 50, // Assume 50 is average
      keyDifferences: await this.identifyPlatformDifferences(features, platform),
      actionableInsights: await this.generatePlatformInsights(features, platform)
    });

    // Timing comparison
    comparisons.push({
      comparisonType: 'timing',
      comparison: 'Compared to optimal posting times',
      scoreDifference: (features.optimal_timing_score - 0.7) * 30, // Normalize to score difference
      keyDifferences: [
        `Current timing score: ${(features.optimal_timing_score * 100).toFixed(1)}%`,
        `Day of week optimization: ${(features.day_of_week_score * 100).toFixed(1)}%`
      ],
      actionableInsights: [
        'Consider posting during peak audience hours',
        'Analyze your audience insights for optimal timing'
      ]
    });

    return comparisons;
  }

  private async identifyPlatformDifferences(
    features: ContentFeatures,
    platform: SocialPlatform
  ): Promise<string[]> {
    const differences: string[] = [];

    // Platform-specific analysis
    switch (platform) {
      case 'twitter':
        if (features.text_length > 200) {
          differences.push('Content length exceeds Twitter optimal range');
        }
        if (features.hashtag_count > 2) {
          differences.push('Too many hashtags for Twitter best practices');
        }
        break;

      case 'instagram':
        if (!features.has_media) {
          differences.push('Missing visual content essential for Instagram');
        }
        if (features.hashtag_count < 5) {
          differences.push('Underutilizing Instagram hashtag strategy');
        }
        break;

      case 'tiktok':
        if (features.entertainment_value < 0.6) {
          differences.push('Entertainment value below TikTok audience expectations');
        }
        break;
    }

    return differences;
  }

  private async generatePlatformInsights(
    features: ContentFeatures,
    platform: SocialPlatform
  ): Promise<string[]> {
    const insights: string[] = [];

    switch (platform) {
      case 'twitter':
        insights.push('Focus on concise, impactful messaging');
        insights.push('Engage in real-time conversations and trends');
        break;

      case 'instagram':
        insights.push('Prioritize high-quality visual content');
        insights.push('Use storytelling in captions to build connection');
        break;

      case 'tiktok':
        insights.push('Create entertaining, engaging short-form content');
        insights.push('Leverage trending sounds and effects');
        break;
    }

    return insights;
  }

  private async generateReasoning(
    factors: ExplanationFactor[],
    confidence: number,
    config: ExplanationConfig
  ): Promise<string> {
    const positiveFactors = factors.filter(f => f.impact > 0.1);
    const negativeFactors = factors.filter(f => f.impact < -0.1);
    const neutralFactors = factors.filter(f => Math.abs(f.impact) <= 0.1);

    let reasoning = '';

    if (config.audienceLevel === 'beginner') {
      reasoning = this.generateBeginnerReasoning(positiveFactors, negativeFactors, confidence);
    } else if (config.audienceLevel === 'intermediate') {
      reasoning = this.generateIntermediateReasoning(positiveFactors, negativeFactors, confidence);
    } else {
      reasoning = this.generateAdvancedReasoning(factors, confidence);
    }

    return reasoning;
  }

  private generateBeginnerReasoning(
    positiveFactors: ExplanationFactor[],
    negativeFactors: ExplanationFactor[],
    confidence: number
  ): string {
    let reasoning = '';

    if (positiveFactors.length > negativeFactors.length) {
      reasoning = `Your content has strong viral potential! The main strengths are ${positiveFactors.slice(0, 2).map(f => f.factor.toLowerCase()).join(' and ')}.`;
    } else {
      reasoning = `Your content needs some improvements to increase viral potential. The main areas to focus on are ${negativeFactors.slice(0, 2).map(f => f.factor.toLowerCase()).join(' and ')}.`;
    }

    if (confidence < 0.7) {
      reasoning += ' However, there\'s some uncertainty in this prediction, so results may vary.';
    }

    return reasoning;
  }

  private generateIntermediateReasoning(
    positiveFactors: ExplanationFactor[],
    negativeFactors: ExplanationFactor[],
    confidence: number
  ): string {
    let reasoning = `Based on our analysis of ${positiveFactors.length + negativeFactors.length} key factors, `;

    if (positiveFactors.length > negativeFactors.length) {
      reasoning += `your content shows strong viral indicators, particularly in ${positiveFactors[0]?.factor.toLowerCase()}`;
      if (positiveFactors.length > 1) {
        reasoning += ` and ${positiveFactors[1]?.factor.toLowerCase()}`;
      }
      reasoning += '.';

      if (negativeFactors.length > 0) {
        reasoning += ` However, there are opportunities to improve ${negativeFactors[0]?.factor.toLowerCase()} to maximize viral potential.`;
      }
    } else {
      reasoning += `your content faces some challenges in viral performance, mainly around ${negativeFactors[0]?.factor.toLowerCase()}`;
      if (negativeFactors.length > 1) {
        reasoning += ` and ${negativeFactors[1]?.factor.toLowerCase()}`;
      }
      reasoning += '.';

      if (positiveFactors.length > 0) {
        reasoning += ` On the positive side, your ${positiveFactors[0]?.factor.toLowerCase()} is working well.`;
      }
    }

    if (confidence < 0.7) {
      reasoning += ` The prediction confidence is ${(confidence * 100).toFixed(0)}%, indicating some uncertainty due to limited data or novel content patterns.`;
    }

    return reasoning;
  }

  private generateAdvancedReasoning(factors: ExplanationFactor[], confidence: number): string {
    const weightedScore = factors.reduce((sum, factor) => sum + (factor.impact * factor.weight), 0);
    const dominantCategory = this.findDominantCategory(factors);

    let reasoning = `The viral prediction model identified ${factors.length} significant factors contributing to the overall score. `;
    reasoning += `The weighted factor analysis yields a composite impact score of ${weightedScore.toFixed(2)}, `;
    reasoning += `with ${dominantCategory} factors showing the strongest influence on viral potential. `;

    const highImpactFactors = factors.filter(f => Math.abs(f.impact) > 0.3);
    if (highImpactFactors.length > 0) {
      reasoning += `Critical factors include ${highImpactFactors.map(f => `${f.factor} (impact: ${f.impact.toFixed(2)})`).join(', ')}. `;
    }

    reasoning += `Model confidence is ${(confidence * 100).toFixed(1)}%, `;
    if (confidence > 0.8) {
      reasoning += 'indicating high reliability in the prediction based on historical patterns.';
    } else if (confidence > 0.6) {
      reasoning += 'suggesting moderate reliability with some uncertainty due to feature variability.';
    } else {
      reasoning += 'indicating significant uncertainty, likely due to novel content patterns or limited training data.';
    }

    return reasoning;
  }

  private findDominantCategory(factors: ExplanationFactor[]): string {
    const categoryImpacts = factors.reduce((acc, factor) => {
      acc[factor.category] = (acc[factor.category] || 0) + Math.abs(factor.impact);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryImpacts).reduce((a, b) => categoryImpacts[a[0]] > categoryImpacts[b[0]] ? a : b)[0];
  }

  // Additional helper methods for advanced explanations

  private async identifyLimitingFactors(
    features: ContentFeatures,
    platform: SocialPlatform,
    actualScore: number
  ): Promise<ExplanationFactor[]> {
    // Identify the factors that most limited viral potential
    const limitingFactors: ExplanationFactor[] = [];

    // Analyze each important feature to see where it falls short
    if (features.emotion_scores < 0.4) {
      limitingFactors.push({
        category: 'content',
        factor: 'Low Emotional Appeal',
        impact: -0.6,
        confidence: 0.8,
        explanation: 'Content lacks emotional resonance that drives sharing',
        evidence: [`Emotional score: ${(features.emotion_scores * 100).toFixed(1)}%`],
        weight: 0.2
      });
    }

    if (features.trending_topics_score < 0.2) {
      limitingFactors.push({
        category: 'trend',
        factor: 'Poor Trend Alignment',
        impact: -0.5,
        confidence: 0.7,
        explanation: 'Content not aligned with current trends and conversations',
        evidence: [`Trend score: ${(features.trending_topics_score * 100).toFixed(1)}%`],
        weight: 0.15
      });
    }

    return limitingFactors;
  }

  private async identifyMissedOpportunities(
    features: ContentFeatures,
    platform: SocialPlatform
  ): Promise<string[]> {
    const opportunities: string[] = [];

    if (features.call_to_action_score < 0.3) {
      opportunities.push('Add clear calls-to-action to encourage engagement');
    }

    if (platform === 'instagram' && features.hashtag_count < 5) {
      opportunities.push('Utilize more hashtags (5-11 optimal for Instagram)');
    }

    if (features.optimal_timing_score < 0.6) {
      opportunities.push('Post during peak audience activity hours');
    }

    return opportunities;
  }

  private async compareWithSuccessfulContent(
    features: ContentFeatures,
    platform: SocialPlatform
  ): Promise<ComparisonInsight[]> {
    // Mock comparison with successful content patterns
    return [{
      comparisonType: 'similar_content',
      comparison: 'Successful viral content in this category',
      scoreDifference: -25,
      keyDifferences: [
        'Higher emotional engagement (avg 75% vs your 45%)',
        'Better trend alignment (avg 60% vs your 20%)',
        'More effective CTAs (avg 70% vs your 30%)'
      ],
      actionableInsights: [
        'Study viral content in your niche for emotional patterns',
        'Monitor trending topics daily for content opportunities',
        'Experiment with different CTA formats and placements'
      ]
    }];
  }

  private async createImprovementPlan(
    limitingFactors: ExplanationFactor[],
    missedOpportunities: string[]
  ): Promise<ActionableRecommendation[]> {
    const plan: ActionableRecommendation[] = [];

    // Convert limiting factors to recommendations
    for (const factor of limitingFactors) {
      if (factor.factor === 'Low Emotional Appeal') {
        plan.push({
          type: 'improve',
          priority: 'high',
          action: 'Increase emotional engagement in content',
          expectedImpact: 15,
          effort: 'medium',
          timeline: 'immediate',
          specifics: [
            'Use more emotionally charged language',
            'Share personal stories and experiences',
            'Incorporate surprise, joy, or inspiration elements'
          ],
          examples: [
            'Before: "This is a good tip" → After: "This changed my life!"',
            'Add personal anecdotes and failures/successes',
            'Use power words: amazing, incredible, shocking, heartwarming'
          ]
        });
      }
    }

    return plan;
  }

  private async analyzeIndividualFeature(
    featureName: string,
    currentValue: number,
    platform: SocialPlatform
  ): Promise<FeatureAnalysis> {
    // Get optimal ranges for this feature on this platform
    const optimalRange = this.getOptimalRange(featureName, platform);
    const impact = this.determineImpact(currentValue, optimalRange);
    const distribution = this.calculateDistribution(currentValue, featureName, platform);
    const suggestions = this.generateFeatureSuggestions(featureName, currentValue, optimalRange);

    return {
      feature: featureName,
      currentValue,
      optimalRange,
      impact,
      confidence: 0.8,
      distribution,
      suggestions
    };
  }

  private getOptimalRange(featureName: string, platform: SocialPlatform): { min: number; max: number } {
    // Define optimal ranges for different features and platforms
    const ranges = {
      emotion_scores: { min: 0.6, max: 0.9 },
      trending_topics_score: { min: 0.4, max: 0.8 },
      call_to_action_score: { min: 0.5, max: 0.8 },
      optimal_timing_score: { min: 0.7, max: 1.0 },
      readability_score: { min: 50, max: 80 }
    };

    return ranges[featureName] || { min: 0.3, max: 0.8 };
  }

  private determineImpact(currentValue: number, optimalRange: { min: number; max: number }): 'positive' | 'negative' | 'neutral' {
    if (currentValue >= optimalRange.min && currentValue <= optimalRange.max) {
      return 'positive';
    } else if (currentValue < optimalRange.min * 0.7 || currentValue > optimalRange.max * 1.3) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }

  private calculateDistribution(currentValue: number, featureName: string, platform: SocialPlatform): {
    percentile: number;
    zScore: number;
    compared_to: 'viral_content' | 'all_content' | 'platform_average';
  } {
    // Mock distribution calculation
    return {
      percentile: Math.random() * 100,
      zScore: (Math.random() - 0.5) * 4,
      compared_to: 'viral_content'
    };
  }

  private generateFeatureSuggestions(
    featureName: string,
    currentValue: number,
    optimalRange: { min: number; max: number }
  ): string[] {
    const suggestions: string[] = [];

    if (currentValue < optimalRange.min) {
      suggestions.push(`Increase ${featureName} to at least ${optimalRange.min.toFixed(2)}`);
    } else if (currentValue > optimalRange.max) {
      suggestions.push(`Reduce ${featureName} to below ${optimalRange.max.toFixed(2)}`);
    } else {
      suggestions.push(`${featureName} is in optimal range`);
    }

    return suggestions;
  }

  private getImportantFeatures(platform: SocialPlatform): string[] {
    const baseFeatures = [
      'emotion_scores',
      'trending_topics_score',
      'call_to_action_score',
      'optimal_timing_score',
      'readability_score'
    ];

    // Add platform-specific features
    switch (platform) {
      case 'twitter':
        return [...baseFeatures, 'text_length', 'hashtag_count'];
      case 'instagram':
        return [...baseFeatures, 'hashtag_count', 'has_media'];
      case 'tiktok':
        return [...baseFeatures, 'entertainment_value', 'has_media'];
      default:
        return baseFeatures;
    }
  }

  private async traceDecisionPath(features: ContentFeatures, platform: SocialPlatform): Promise<DecisionNode[]> {
    // Mock decision tree traversal
    return [
      {
        feature: 'emotion_scores',
        threshold: 0.5,
        value: features.emotion_scores,
        decision: features.emotion_scores > 0.5 ? 'right' : 'left',
        probability: 0.8,
        explanation: 'High emotional content typically performs better'
      }
    ];
  }

  private async identifyKeyFactors(features: ContentFeatures, decisionPath: DecisionNode[]): Promise<string[]> {
    return decisionPath.map(node => node.feature);
  }

  private calculateModelConfidence(decisionPath: DecisionNode[]): number {
    return decisionPath.reduce((sum, node) => sum + node.probability, 0) / decisionPath.length;
  }

  private async assessUncertainty(features: ContentFeatures, platform: SocialPlatform): Promise<string[]> {
    const uncertaintyFactors: string[] = [];

    if (features.novelty_score > 0.8) {
      uncertaintyFactors.push('Novel content patterns may not follow historical trends');
    }

    if (features.trending_topics_score < 0.2) {
      uncertaintyFactors.push('Limited trend data available for prediction');
    }

    return uncertaintyFactors;
  }

  private async findMinimalChanges(
    features: ContentFeatures,
    platform: SocialPlatform,
    currentScore: number,
    targetScore: number
  ): Promise<{ feature: string; originalValue: number; suggestedValue: number; expectedImpact: number }[]> {
    // Mock minimal changes calculation
    return [
      {
        feature: 'emotion_scores',
        originalValue: features.emotion_scores,
        suggestedValue: Math.min(1, features.emotion_scores + 0.2),
        expectedImpact: 8
      }
    ];
  }

  private async explainCounterfactual(changes: any[], scoreDifference: number): Promise<string> {
    return `To achieve your target score, the most efficient approach would be to ${changes.map(c => `increase ${c.feature} from ${c.from.toFixed(2)} to ${c.to.toFixed(2)}`).join(' and ')}. This could potentially improve your score by ${scoreDifference.toFixed(1)} points.`;
  }

  private assessFeasibility(changes: any[]): number {
    // Mock feasibility assessment
    return 0.7;
  }

  private assessEffort(changes: any[]): 'low' | 'medium' | 'high' {
    return changes.length > 3 ? 'high' : changes.length > 1 ? 'medium' : 'low';
  }

  private async identifyUncertaintyFactors(features: ContentFeatures, platform: SocialPlatform): Promise<string[]> {
    return [
      'Limited historical data for this content type',
      'High variance in recent viral content patterns',
      'Platform algorithm changes affecting predictions'
    ];
  }

  private async assessDataQuality(features: ContentFeatures): Promise<string[]> {
    const issues: string[] = [];

    if (features.creator_influence_score === undefined) {
      issues.push('Missing creator influence data');
    }

    return issues;
  }

  private async identifyModelLimitations(features: ContentFeatures, platform: SocialPlatform): Promise<string[]> {
    return [
      'Model trained primarily on English content',
      'Limited data for emerging content formats',
      'Cannot predict external viral triggers'
    ];
  }

  private async generateConfidenceRecommendations(uncertaintyFactors: string[], dataQualityIssues: string[]): Promise<string[]> {
    const recommendations: string[] = [];

    if (dataQualityIssues.length > 0) {
      recommendations.push('Improve data collection for better predictions');
    }

    if (uncertaintyFactors.length > 2) {
      recommendations.push('Test content with smaller audiences first');
    }

    return recommendations;
  }

  private initializeTemplates(): void {
    this.explanationTemplates.set('low_confidence', 'The prediction has low confidence due to {reasons}');
    this.explanationTemplates.set('high_viral', 'This content has high viral potential because of {factors}');
    // Add more templates as needed
  }

  private initializeFeatureMetadata(): void {
    this.featureMetadata.set('emotion_scores', {
      name: 'Emotional Appeal',
      description: 'How emotionally engaging the content is',
      optimal_range: [0.6, 0.9],
      importance: 0.25
    });
    // Add more feature metadata
  }

  private initializeComparisonData(): void {
    // Initialize comparison baselines for different platforms
    this.comparisonData.set('twitter', {
      average_viral_score: 52,
      top_performers: { emotion_scores: 0.75, timing_score: 0.8 }
    });
    // Add more platform data
  }
}