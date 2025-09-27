// Content Analysis and Enhancement
export interface AnalysisResult {
  sentiment: { label: 'positive' | 'neutral' | 'negative'; confidence: number };
  tags: string[];
  metadata: {
    wordCount: number;
    readingTime: number;
    keywordDensity: number;
  };
}

export class ContentAnalyzer {
  private ai: any;

  constructor(ai: any) {
    this.ai = ai;
  }

  async analyze(content: string, keywords?: string[]): Promise<AnalysisResult> {
    const [sentiment, tags, metadata] = await Promise.all([
      this.analyzeSentiment(content),
      this.extractTags(content, keywords),
      this.calculateMetadata(content, keywords)
    ]);

    return { sentiment, tags, metadata };
  }

  private async analyzeSentiment(content: string) {
    try {
      const result = await this.ai.run('@cf/huggingface/distilbert-sst-2-int8', {
        text: content
      });

      if (result?.[0]) {
        return {
          label: result[0].label.toLowerCase() as 'positive' | 'neutral' | 'negative',
          confidence: result[0].score
        };
      }
    } catch {
      // Fallback to neutral
    }

    return { label: 'neutral' as const, confidence: 0.5 };
  }

  private async extractTags(content: string, keywords?: string[]): Promise<string[]> {
    const tags = new Set<string>();

    if (keywords) {
      keywords.forEach(keyword => tags.add(keyword.toLowerCase()));
    }

    const words = content.toLowerCase().match(/\b\w{4,}\b/g) ?? [];
    const wordFreq = new Map<string, number>();

    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
    });

    Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([word]) => tags.add(word));

    return Array.from(tags).slice(0, 15);
  }

  private calculateMetadata(content: string, keywords?: string[]) {
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);
    const keywordDensity = keywords ? this.calculateKeywordDensity(content, keywords) : 0;

    return { wordCount, readingTime, keywordDensity };
  }

  private calculateKeywordDensity(content: string, keywords: string[]): number {
    const words = content.toLowerCase().split(/\s+/);
    const keywordCount = keywords.reduce((count, keyword) => {
      const matches = content.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g'));
      return count + (matches?.length ?? 0);
    }, 0);

    return keywordCount / words.length;
  }
}