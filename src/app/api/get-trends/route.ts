// API route for fetching trend data
// LOG: API-TRENDS-1 - Initialize trends API route

import { NextRequest, NextResponse } from 'next/server';
import { trendEngine } from '@/lib/trends';

export async function GET(request: NextRequest) {
  console.log('LOG: API-TRENDS-2 - Trends API endpoint called');

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'trending';
    const region = searchParams.get('region') || 'US';
    const keywords = searchParams.get('keywords');
    const category = searchParams.get('category');

    console.log('LOG: API-TRENDS-3 - Request params:', { type, region, keywords, category });

    let data;

    switch (type) {
      case 'trending':
        data = await trendEngine.fetchTrendingTopics(region, category || undefined);
        break;
        
      case 'keywords':
        if (!keywords) {
          return NextResponse.json(
            { error: 'Keywords parameter required for keyword trends' },
            { status: 400 }
          );
        }
        const keywordList = keywords.split(',').map(k => k.trim());
        data = await trendEngine.getKeywordTrends(keywordList);
        break;
        
      case 'related':
        if (!keywords) {
          return NextResponse.json(
            { error: 'Keywords parameter required for related queries' },
            { status: 400 }
          );
        }
        const relatedQueries = await trendEngine.getRelatedQueries(keywords, region);
        data = { keyword: keywords, related_queries: relatedQueries };
        break;
        
      case 'predict':
        if (!keywords) {
          return NextResponse.json(
            { error: 'Keywords parameter required for predictions' },
            { status: 400 }
          );
        }
        data = await trendEngine.predictTrendGrowth(keywords);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Use: trending, keywords, related, or predict' },
          { status: 400 }
        );
    }

    console.log('LOG: API-TRENDS-4 - Successfully fetched trend data, type:', type);

    return NextResponse.json({
      success: true,
      type,
      data,
      timestamp: new Date().toISOString(),
      region,
      ...(keywords && { keywords: keywords.split(',').map(k => k.trim()) })
    });

  } catch (error) {
    console.error('LOG: API-TRENDS-ERROR-1 - Trends API failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch trend data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('LOG: API-TRENDS-5 - Trends analysis POST endpoint called');

  try {
    const body = await request.json();
    const { content, keywords, action = 'analyze' } = body;

    if (!content && !keywords) {
      return NextResponse.json(
        { error: 'Either content or keywords must be provided' },
        { status: 400 }
      );
    }

    console.log('LOG: API-TRENDS-6 - Analyzing content/keywords for trends');

    let result;

    switch (action) {
      case 'analyze':
        // Get trending topics for analysis
        const trendingData = await trendEngine.fetchTrendingTopics();
        
        if (keywords) {
          const keywordList = Array.isArray(keywords) ? keywords : [keywords];
          const viralPotential = trendEngine.analyzeViralPotential(keywordList, trendingData);
          const suggestions = trendEngine.getContentSuggestions(keywordList[0], trendingData);
          
          result = {
            viral_potential: viralPotential,
            suggestions,
            analyzed_keywords: keywordList
          };
        } else {
          // Extract keywords from content (simple approach)
          const extractedKeywords = content.split(' ')
            .filter((word: string) => word.length > 4)
            .slice(0, 5);
          
          const viralPotential = trendEngine.analyzeViralPotential(extractedKeywords, trendingData);
          const suggestions = trendEngine.getContentSuggestions(extractedKeywords[0] || 'content', trendingData);
          
          result = {
            viral_potential: viralPotential,
            suggestions,
            extracted_keywords: extractedKeywords
          };
        }
        break;
        
      case 'optimize':
        const optimizationData = await trendEngine.fetchTrendingTopics();
        const topic = keywords?.[0] || 'general';
        const optimizationSuggestions = trendEngine.getContentSuggestions(topic, optimizationData);
        
        result = {
          optimization_suggestions: optimizationSuggestions,
          recommended_keywords: optimizationSuggestions.trending_keywords,
          content_angles: optimizationSuggestions.content_angles
        };
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: analyze or optimize' },
          { status: 400 }
        );
    }

    console.log('LOG: API-TRENDS-7 - Trend analysis completed successfully');

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-TRENDS-ERROR-2 - Trend analysis failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze trends',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}