/**
 * Token Usage Optimization System
 * Intelligent token reduction and dynamic allocation for cost optimization
 * Maintains quality while minimizing token consumption
 */

export interface TokenAllocation {
  maxTokens: number;
  inputTokens: number;
  outputTokens: number;
  safetyBuffer: number;
  qualityThreshold: number;
}

export interface OptimizationConfig {
  aggressivenessLevel: 'conservative' | 'moderate' | 'aggressive' | 'extreme';
  qualityFloor: number; // Minimum acceptable quality score (0-100)
  maxTokenReduction: number; // Maximum % reduction allowed
  adaptiveLearning: boolean;
  platformSpecific: boolean;
}

export interface TokenOptimizationResult {
  originalTokens: number;
  optimizedTokens: number;
  reductionPercentage: number;
  qualityImpact: number;
  estimatedCostSavings: number;
  optimizationTechniques: string[];
  recommendations: string[];
}

export interface ContentComplexity {
  topicComplexity: number; // 1-10 scale
  requiredDetail: number; // 1-10 scale
  platformRequirements: number; // 1-10 scale
  audienceLevel: number; // 1-10 scale
  formatComplexity: number; // 1-10 scale
}

export class TokenOptimizer {
  private learningData: Map<string, { allocation: number; quality: number; success: boolean }> = new Map();
  private platformOptimizations: Map<string, OptimizationConfig> = new Map();
  private complexityAnalyzer: Map<string, ContentComplexity> = new Map();

  constructor() {
    this.initializePlatformOptimizations();
  }

  /**
   * Calculate optimal token allocation based on content complexity and platform
   */
  calculateOptimalAllocation(
    platform: string,
    contentType: string,
    topic: string,
    targetQuality: number = 85,
    config: OptimizationConfig
  ): TokenAllocation {
    const complexity = this.analyzeContentComplexity(topic, contentType, platform);
    const baseAllocation = this.getBaseTokenAllocation(platform, contentType);
    const optimizedAllocation = this.applyOptimizations(baseAllocation, complexity, config, targetQuality);

    return optimizedAllocation;
  }

  /**
   * Optimize token usage with dynamic reduction strategies
   */
  optimizeTokenUsage(
    content: string,
    platform: string,
    config: OptimizationConfig,
    currentAllocation: number
  ): TokenOptimizationResult {
    const originalTokens = currentAllocation;
    const techniques: string[] = [];
    let optimizedTokens = originalTokens;
    let qualityImpact = 0;

    // Progressive optimization techniques
    if (config.aggressivenessLevel === 'moderate'  ?? config.aggressivenessLevel === 'aggressive') {
      // Technique 1: Dynamic context pruning
      const contextReduction = this.calculateContextPruning(content, platform);
      optimizedTokens -= contextReduction.tokensSaved;
      qualityImpact += contextReduction.qualityImpact;
      techniques.push(`Context pruning: -${contextReduction.tokensSaved} tokens`);
    }

    if (config.aggressivenessLevel === 'aggressive'  ?? config.aggressivenessLevel === 'extreme') {
      // Technique 2: Compression-based optimization
      const compressionReduction = this.applyCompressionOptimization(content, platform);
      optimizedTokens -= compressionReduction.tokensSaved;
      qualityImpact += compressionReduction.qualityImpact;
      techniques.push(`Compression optimization: -${compressionReduction.tokensSaved} tokens`);
    }

    if (config.aggressivenessLevel === 'extreme') {
      // Technique 3: Radical prompt engineering
      const promptReduction = this.applyRadicalPromptOptimization(content, platform);
      optimizedTokens -= promptReduction.tokensSaved;
      qualityImpact += promptReduction.qualityImpact;
      techniques.push(`Radical prompt optimization: -${promptReduction.tokensSaved} tokens`);
    }

    // Apply adaptive learning adjustments
    if (config.adaptiveLearning) {
      const learningAdjustment = this.applyLearningOptimization(platform, optimizedTokens);
      optimizedTokens = learningAdjustment.adjustedTokens;
      qualityImpact += learningAdjustment.qualityImpact;
      techniques.push('Adaptive learning adjustment');
    }

    // Ensure we don't exceed max reduction limits
    const maxReduction = (originalTokens * config.maxTokenReduction) / 100;
    const actualReduction = originalTokens - optimizedTokens;
    if (actualReduction > maxReduction) {
      optimizedTokens = originalTokens - maxReduction;
      qualityImpact = this.recalculateQualityImpact(actualReduction, maxReduction, qualityImpact);
    }

    // Quality floor protection
    if (qualityImpact > (100 - config.qualityFloor)) {
      const adjustedReduction = this.calculateSafeReduction(originalTokens, config.qualityFloor);
      optimizedTokens = originalTokens - adjustedReduction;
      qualityImpact = 100 - config.qualityFloor;
      techniques.push('Quality floor protection applied');
    }

    const reductionPercentage = ((originalTokens - optimizedTokens) / originalTokens) * 100;
    const estimatedCostSavings = this.calculateCostSavings(originalTokens - optimizedTokens, platform);

    return { originalTokens,
      optimizedTokens: Math.max(optimizedTokens, 256), // Minimum viable token count
      reductionPercentage,
      qualityImpact,
      estimatedCostSavings,
      optimizationTechniques: techniques,
      recommendations: this.generateOptimizationRecommendations(reductionPercentage, qualityImpact, platform)
    };
  }

  /**
   * Learn from optimization results to improve future allocations
   */
  recordOptimizationResult(
    platform: string,
    contentType: string,
    allocation: number,
    qualityScore: number,
    success: boolean,
    userFeedback?: number
  ): void {
    const key = `${platform}-${contentType}`;
    const existing = this.learningData.get(key);

    if (existing) {
      // Update with weighted average
      const weight = success ? 1.2 : 0.8;
      this.learningData.set(key, {
        allocation: (existing.allocation + allocation * weight) / (1 + weight),
        quality: (existing.quality + qualityScore * weight) / (1 + weight),
        success: existing.success ?? success
      });
    } else {
      this.learningData.set(key, { allocation, quality: qualityScore, success });
    }

    // Update platform-specific configurations based on learning
    this.updatePlatformOptimizations(platform, qualityScore, success);
  }

  /**
   * Get token optimization recommendations for specific scenarios
   */
  getOptimizationRecommendations(
    platform: string,
    averageTokenUsage: number,
    averageQuality: number,
    averageCost: number
  ): Array<{
    type: 'allocation' | 'technique' | 'strategy' | 'configuration';
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImpact: string;
    implementation: string;
  }> {
    const recommendations = [];

    // High token usage recommendations
    if (averageTokenUsage > 3500) {
      recommendations.push({
        type: 'allocation',
        priority: 'high',
        description: 'Implement aggressive token reduction strategy',
        expectedImpact: '40-50% token reduction, 5-8% quality impact',
        implementation: 'Use aggressive optimization config with dynamic context pruning'
      });
    }

    // Quality vs cost optimization
    if (averageQuality > 90 && averageCost > 0.01) {
      recommendations.push({
        type: 'strategy',
        priority: 'medium',
        description: 'Quality over-optimization detected - reduce to optimal range',
        expectedImpact: '25-35% cost reduction, <3% quality impact',
        implementation: 'Target 85-90% quality range with moderate optimization'
      });
    }

    // Platform-specific optimizations
    if (platform === 'twitter' && averageTokenUsage > 2000) {
      recommendations.push({
        type: 'technique',
        priority: 'high',
        description: 'Twitter content requires minimal context - implement radical pruning',
        expectedImpact: '60% token reduction for Twitter threads',
        implementation: 'Use Twitter-specific compression with hashtag optimization'
      });
    }

    if (platform === 'tiktok' && averageTokenUsage > 2500) {
      recommendations.push({
        type: 'technique',
        priority: 'high',
        description: 'TikTok benefits from hook-focused optimization',
        expectedImpact: '45% token reduction while maintaining viral potential',
        implementation: 'Focus tokens on hook generation, minimize background context'
      });
    }

    // Learning-based recommendations
    const learningKey = `${platform}-content`;
    const learningData = this.learningData.get(learningKey);
    if (learningData && learningData.quality > averageQuality) {
      recommendations.push({
        type: 'configuration',
        priority: 'medium',
        description: 'Historical data suggests optimal allocation adjustments',
        expectedImpact: `Potential improvement to ${learningData.quality}% quality`,
        implementation: `Adjust base allocation to ${learningData.allocation} tokens`
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Analyze content complexity to determine optimal token allocation
   */
  private analyzeContentComplexity(topic: string, contentType: string, platform: string): ContentComplexity {
    // Simplified complexity analysis - in production, this would use NLP
    const topicWords = topic.toLowerCase().split(' ');
    const complexWords = ['algorithm', 'technical', 'analysis', 'comprehensive', 'sophisticated'];
    const topicComplexity = topicWords.filter(word => complexWords.includes(word)).length + 1;

    const formatComplexityMap = {
      thread: 8,
      carousel: 7,
      story: 4,
      post: 5,
      video: 6,
      reel: 5
    };

    const platformComplexityMap = {
      twitter: 6,
      tiktok: 4,
      instagram: 7,
      linkedin: 8,
      youtube: 9,
      facebook: 6
    };

    return {
      topicComplexity: Math.min(topicComplexity, 10),
      requiredDetail: contentType === 'educational' ? 8 : 5,
      platformRequirements: platformComplexityMap[platform]  ?? 6,
      audienceLevel: 6, // Default middle ground
      formatComplexity: formatComplexityMap[contentType]  ?? 5
    };
  }

  private getBaseTokenAllocation(platform: string, contentType: string): number {
    const baseAllocations = {
      twitter: { post: 1500, thread: 2500, reply: 800 },
      tiktok: { video: 2000, caption: 1200 },
      instagram: { post: 2200, story: 1000, reel: 1800, carousel: 2800 },
      linkedin: { post: 3000, article: 4000 },
      youtube: { short: 2500, description: 3500 },
      facebook: { post: 2000, story: 1000 }
    };

    return baseAllocations[platform]?.[contentType]  ?? 2000;
  }

  private applyOptimizations(
    baseAllocation: number,
    complexity: ContentComplexity,
    config: OptimizationConfig,
    targetQuality: number
  ): TokenAllocation {
    const complexityMultiplier = (
      complexity.topicComplexity +
      complexity.requiredDetail +
      complexity.platformRequirements +
      complexity.audienceLevel +
      complexity.formatComplexity
    ) / 50; // Normalize to 0-1 range

    const qualityMultiplier = targetQuality / 100;
    const aggressivenessReduction = {
      conservative: 0.95,
      moderate: 0.85,
      aggressive: 0.70,
      extreme: 0.55
    }[config.aggressivenessLevel];

    const optimizedMax = Math.round(
      baseAllocation * complexityMultiplier * qualityMultiplier * aggressivenessReduction
    );

    return {
      maxTokens: Math.max(optimizedMax, 256),
      inputTokens: Math.round(optimizedMax * 0.3),
      outputTokens: Math.round(optimizedMax * 0.7),
      safetyBuffer: Math.round(optimizedMax * 0.1),
      qualityThreshold: targetQuality
    };
  }

  private calculateContextPruning(content: string, platform: string): { tokensSaved: number; qualityImpact: number } {
    // Platform-specific context pruning strategies
    const platformStrategies = {
      twitter: { contextReduction: 0.4, qualityImpact: 2 },
      tiktok: { contextReduction: 0.5, qualityImpact: 1 },
      instagram: { contextReduction: 0.3, qualityImpact: 3 },
      linkedin: { contextReduction: 0.2, qualityImpact: 4 }
    };

    const strategy = platformStrategies[platform]  ?? { contextReduction: 0.3, qualityImpact: 3 };
    const estimatedTokens = content.length / 4; // Rough token estimation

    return {
      tokensSaved: Math.round(estimatedTokens * strategy.contextReduction),
      qualityImpact: strategy.qualityImpact
    };
  }

  private applyCompressionOptimization(content: string, platform: string): { tokensSaved: number; qualityImpact: number } {
    // Compression techniques: remove redundancy, optimize word choice
    const compressionRates = {
      twitter: { rate: 0.25, qualityImpact: 3 },
      tiktok: { rate: 0.30, qualityImpact: 2 },
      instagram: { rate: 0.20, qualityImpact: 4 },
      linkedin: { rate: 0.15, qualityImpact: 5 }
    };

    const compression = compressionRates[platform]  ?? { rate: 0.20, qualityImpact: 4 };
    const estimatedTokens = content.length / 4;

    return {
      tokensSaved: Math.round(estimatedTokens * compression.rate),
      qualityImpact: compression.qualityImpact
    };
  }

  private applyRadicalPromptOptimization(content: string, platform: string): { tokensSaved: number; qualityImpact: number } {
    // Extreme optimization: minimal prompts, essential-only instructions
    return {
      tokensSaved: Math.round((content.length / 4) * 0.35),
      qualityImpact: 8 // Higher quality impact for radical optimization
    };
  }

  private applyLearningOptimization(platform: string, currentTokens: number): { adjustedTokens: number; qualityImpact: number } {
    const learningKey = `${platform}-optimization`;
    const learningData = this.learningData.get(learningKey);

    if (learningData?.success) {
      const adjustment = learningData.allocation > currentTokens ? 1.05 : 0.95;
      return {
        adjustedTokens: Math.round(currentTokens * adjustment),
        qualityImpact: learningData.quality > 85 ? -1 : 1 // Negative impact = quality improvement
      };
    }

    return { adjustedTokens: currentTokens, qualityImpact: 0 };
  }

  private calculateCostSavings(tokensSaved: number, platform: string): number {
    // Simplified cost calculation - would use actual pricing in production
    const avgCostPerToken = 0.000001; // $0.001 per 1K tokens
    return tokensSaved * avgCostPerToken;
  }

  private recalculateQualityImpact(actualReduction: number, maxReduction: number, currentImpact: number): number {
    const reductionRatio = maxReduction / actualReduction;
    return currentImpact * reductionRatio;
  }

  private calculateSafeReduction(originalTokens: number, qualityFloor: number): number {
    // Conservative reduction that maintains quality floor
    const maxSafeReduction = originalTokens * ((100 - qualityFloor) / 100) * 0.5;
    return Math.round(maxSafeReduction);
  }

  private generateOptimizationRecommendations(reduction: number, qualityImpact: number, platform: string): string[] {
    const recommendations = [];

    if (reduction > 50) {
      recommendations.push('Excellent token optimization achieved');
    } else if (reduction > 30) {
      recommendations.push('Good optimization - consider aggressive techniques for further savings');
    } else {
      recommendations.push('Low optimization - implement more aggressive strategies');
    }

    if (qualityImpact < 5) {
      recommendations.push('Quality impact minimal - safe to maintain current optimization');
    } else if (qualityImpact < 10) {
      recommendations.push('Moderate quality impact - monitor output quality closely');
    } else {
      recommendations.push('High quality impact - consider reducing optimization aggressiveness');
    }

    recommendations.push(`Platform-specific: Optimize for ${platform} engagement patterns`);

    return recommendations;
  }

  private updatePlatformOptimizations(platform: string, qualityScore: number, success: boolean): void {
    const current = this.platformOptimizations.get(platform);
    if (!current) {return;}

    // Adjust aggressiveness based on results
    if (qualityScore > 90 && success) {
      // Can be more aggressive
      if (current.aggressivenessLevel === 'conservative') {current.aggressivenessLevel = 'moderate';}
      else if (current.aggressivenessLevel === 'moderate') {current.aggressivenessLevel = 'aggressive';}
    } else if (qualityScore < 75 ?? !success) {
      // Be more conservative
      if (current.aggressivenessLevel === 'aggressive') {current.aggressivenessLevel = 'moderate';}
      else if (current.aggressivenessLevel === 'moderate') {current.aggressivenessLevel = 'conservative';}
    }

    this.platformOptimizations.set(platform, current);
  }

  private initializePlatformOptimizations(): void {
    const platforms = ['twitter', 'tiktok', 'instagram', 'linkedin', 'youtube', 'facebook'];

    platforms.forEach(platform => {
      this.platformOptimizations.set(platform, {
        aggressivenessLevel: 'moderate',
        qualityFloor: 75,
        maxTokenReduction: 50,
        adaptiveLearning: true,
        platformSpecific: true
      });
    });
  }

  /**
   * Get current optimization statistics
   */
  getOptimizationStats(): {
    totalOptimizations: number;
    averageReduction: number;
    averageQualityImpact: number;
    platformBreakdown: Record<string, { optimizations: number; avgReduction: number }>;
  } {
    const stats = {
      totalOptimizations: this.learningData.size,
      averageReduction: 0,
      averageQualityImpact: 0,
      platformBreakdown: {} as Record<string, { optimizations: number; avgReduction: number }>
    };

    let totalReduction = 0;
    let totalQuality = 0;
    const platformStats: Record<string, { count: number; reduction: number }> = {};

    for (const [key, data] of this.learningData.entries()) {
      const platform = key.split('-')[0];
      const reduction = data.allocation * 0.3; // Estimated reduction

      totalReduction += reduction;
      totalQuality += data.quality;

      if (!platformStats[platform]) {
        platformStats[platform] = { count: 0, reduction: 0 };
      }
      platformStats[platform].count++;
      platformStats[platform].reduction += reduction;
    }

    if (this.learningData.size > 0) {
      stats.averageReduction = totalReduction / this.learningData.size;
      stats.averageQualityImpact = 100 - (totalQuality / this.learningData.size);
    }

    for (const [platform, data] of Object.entries(platformStats)) {
      stats.platformBreakdown[platform] = {
        optimizations: data.count,
        avgReduction: data.reduction / data.count
      };
    }

    return stats;
  }

  /**
   * Reset optimization learning data
   */
  resetLearningData(): void {
    this.learningData.clear();
    this.complexityAnalyzer.clear();
    this.initializePlatformOptimizations();
  }
}