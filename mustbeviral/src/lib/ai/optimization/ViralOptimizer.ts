// Viral Content Optimization Engine
export interface ViralAnalysis {
  score: number;
  factors: string[];
  tips: string[];
}

export class ViralOptimizer {
  analyzeViralPotential(content: string): ViralAnalysis {
    let score = 0;
    const factors: string[] = [];

    // Emotional engagement scoring
    const emotionalWords = ['amazing', 'incredible', 'shocking', 'unbelievable', 'exclusive', 'secret'];
    const emotionalCount = emotionalWords.filter(word =>
      content.toLowerCase().includes(word)
    ).length;
    score += emotionalCount * 10;

    if (emotionalCount > 0) {
      factors.push('Emotional Appeal');
    }

    // Engagement elements
    const questionCount = (content.match(/\?/g) ?? []).length;
    score += questionCount * 5;
    if (questionCount > 0) {
      factors.push('Engaging Questions');
    }

    // Call to action presence
    const ctaWords = ['share', 'comment', 'like', 'subscribe', 'follow'];
    const ctaCount = ctaWords.filter(word =>
      content.toLowerCase().includes(word)
    ).length;
    score += ctaCount * 8;

    if (ctaCount > 0) {
      factors.push('Call to Action');
    }

    // Personal connection
    if (content.toLowerCase().includes('you') || content.toLowerCase().includes('your')) {
      factors.push('Personal Connection');
      score += 10;
    }

    // Urgency indicators
    const urgentWords = ['now', 'today', 'urgent', 'limited time'];
    if (urgentWords.some(word => content.toLowerCase().includes(word))) {
      factors.push('Urgency');
      score += 15;
    }

    // Optimal length bonus
    if (content.length >= 100 && content.length <= 500) {
      score += 15;
      factors.push('Optimal Length');
    }

    return {
      score: Math.min(score, 100),
      factors,
      tips: this.generateViralTips(content, score)
    };
  }

  private generateViralTips(content: string, currentScore: number): string[] {
    const tips: string[] = [];

    if (!content.includes('?')) {
      tips.push('Add engaging questions to encourage interaction');
    }

    if (!content.toLowerCase().includes('share')) {
      tips.push('Include a clear call-to-action to share');
    }

    if (content.length > 500) {
      tips.push('Consider shortening for better social media performance');
    }

    if (currentScore < 30) {
      tips.push('Add more emotional language to increase engagement');
    }

    return tips;
  }
}