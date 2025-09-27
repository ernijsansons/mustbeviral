/**
 * Builder.io Configuration for Must Be Viral V2
 * 
 * This file sets up Builder.io integration for our Vite + React application.
 * Builder.io allows us to create and manage content visually without code changes.
 */

// Builder.io API Key - You'll need to get this from your Builder.io account
export const BUILDERAPIKEY = import.meta.env.VITE_BUILDER_API_KEY ?? 'your-builder-api-key-here';

// Builder.io configuration
export const builderConfig = {
  apiKey: BUILDERAPIKEY,
  // Enable preview mode for development
  preview: import.meta.env.DEV,
  // Cache settings for performance
  cache: true,
  cacheSeconds: 60 * 5, // 5 minutes
  // Enable tracking for analytics
  tracking: true,
  // Custom headers for API requests
  headers: {
    'X-Custom-Header': 'Must-Be-Viral-V2',
  },
};

// Builder.io model names for different content types
export const BUILDERMODELS = {
  PAGE: 'page',
  HERO: 'hero-section',
  FEATURE: 'feature-section',
  TESTIMONIAL: 'testimonial',
  BLOG_POST: 'blog-post',
  LANDING_PAGE: 'landing-page',
  MARKETING_BANNER: 'marketing-banner',
} as const;

// Builder.io component registry
export const BUILDERCOMPONENTS = {
  // Custom components that Builder.io can use
  VIRAL_HERO: 'ViralHero',
  AI_TOOLS_SECTION: 'AIToolsSection',
  INFLUENCER_MATCHING: 'InfluencerMatching',
  CONTENT_CALENDAR: 'ContentCalendar',
  ANALYTICS_DASHBOARD: 'AnalyticsDashboard',
  PRICING_TABLE: 'PricingTable',
  TESTIMONIAL_CAROUSEL: 'TestimonialCarousel',
  FEATURE_GRID: 'FeatureGrid',
  CTA_SECTION: 'CTASection',
} as const;

// Helper function to get Builder.io content
export async function getBuilderContent(model: string, url?: string) {
  try {
    // Dynamic import to avoid build issues
    const { builder} = await import('@builder.io/react');
    
    const content = await builder
      .get(model, {
        url: url ?? window.location.pathname,
        ...builderConfig,
      })
      .toPromise();

    return content;
  } catch (error) {
    console.error('Failed to fetch Builder.io content:', error);
    return null;
  }
}

// Helper function to get multiple Builder.io entries
export async function getBuilderEntries(model: string, limit = 10) {
  try {
    const { builder} = await import('@builder.io/react');
    
    const entries = await builder
      .getAll(model, {
        limit,
        ...builderConfig,
      })
      .toPromise();

    return entries;
  } catch (error) {
    console.error('Failed to fetch Builder.io entries:', error);
    return [];
  }
}

// Type definitions for Builder.io content
export interface BuilderContent {
  id: string;
  name: string;
  data: Record<string, any>;
  published: string;
  lastUpdated: string;
  url?: string;
  testVariationId?: string;
  testVariationName?: string;
}

export interface BuilderEntry {
  id: string;
  name: string;
  data: Record<string, any>;
  published: string;
  lastUpdated: string;
  url?: string;
}




