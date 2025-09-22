/**
 * Comprehensive Algorithm Knowledge Database
 * Deep intelligence on social media platform algorithms, viral mechanics, and optimization strategies
 * Maximum algorithmic understanding for content optimization
 */

export interface AlgorithmMetrics {
  weight: number;
  impact: 'high' | 'medium' | 'low';
  timeDecay: number;
  userDependency: boolean;
  contentTypeDependency: boolean;
}

export interface PlatformAlgorithmData {
  platform: string;
  lastUpdated: string;
  algorithmVersion: string;
  primaryObjective: string;
  rankingFactors: Record<string, AlgorithmMetrics>;
  contentTypeWeights: Record<string, number>;
  engagementSignals: Record<string, number>;
  penaltyFactors: Record<string, number>;
  viralMechanics: {
    triggers: Record<string, number>;
    amplificationFactors: string[];
    velocityThresholds: Record<string, number>;
    networkEffects: string[];
  };
  optimalTimingPatterns: {
    globalOptimal: string[];
    demographicOptimal: Record<string, string[]>;
    contentTypeOptimal: Record<string, string[]>;
  };
  contentSpecifications: {
    formats: Record<string, {
      maxLength: number;
      minLength: number;
      optimalLength: number;
      hashtagLimit: number;
      mentionLimit: number;
      mediaRequirements?: string[];
    }>;
  };
}

export const ALGORITHM_DATABASE: Record<string, PlatformAlgorithmData> = {
  twitter: {
    platform: 'Twitter',
    lastUpdated: '2024-01-15',
    algorithmVersion: 'v2.1',
    primaryObjective: 'Real-time engagement and conversation velocity',
    rankingFactors: {
      engagement_velocity: { weight: 0.35, impact: 'high', timeDecay: 0.8, userDependency: true, contentTypeDependency: false },
      reply_depth: { weight: 0.25, impact: 'high', timeDecay: 0.6, userDependency: false, contentTypeDependency: true },
      retweet_ratio: { weight: 0.20, impact: 'high', timeDecay: 0.7, userDependency: false, contentTypeDependency: false },
      author_authority: { weight: 0.15, impact: 'medium', timeDecay: 0.1, userDependency: true, contentTypeDependency: false },
      recency: { weight: 0.30, impact: 'high', timeDecay: 0.9, userDependency: false, contentTypeDependency: false },
      hashtag_relevance: { weight: 0.12, impact: 'medium', timeDecay: 0.5, userDependency: false, contentTypeDependency: true },
      link_click_rate: { weight: 0.18, impact: 'medium', timeDecay: 0.6, userDependency: true, contentTypeDependency: true },
      media_engagement: { weight: 0.22, impact: 'high', timeDecay: 0.7, userDependency: false, contentTypeDependency: true }
    },
    contentTypeWeights: {
      text: 1.0,
      image: 1.3,
      video: 1.8,
      thread: 1.5,
      poll: 1.4,
      quote_tweet: 1.2,
      space: 2.0
    },
    engagementSignals: {
      like: 1.0,
      retweet: 3.0,
      reply: 4.0,
      quote_tweet: 3.5,
      bookmark: 2.0,
      share: 4.5,
      click: 1.5,
      profile_visit: 2.5,
      follow: 8.0
    },
    penaltyFactors: {
      spam_reports: -5.0,
      block_ratio: -3.0,
      low_completion_rate: -1.5,
      external_link_overuse: -1.2,
      hashtag_stuffing: -2.0,
      duplicate_content: -4.0,
      fake_engagement: -10.0
    },
    viralMechanics: {
      triggers: {
        breaking_news: 2.5,
        controversy: 2.2,
        humor: 1.8,
        emotional_appeal: 2.0,
        trending_hashtag: 1.9,
        celebrity_mention: 2.3,
        current_events: 2.1,
        thread_format: 1.6
      },
      amplificationFactors: [
        'high_authority_retweets',
        'rapid_initial_engagement',
        'cross_community_sharing',
        'media_pickup',
        'influencer_engagement'
      ],
      velocityThresholds: {
        viral_threshold: 100,
        trending_threshold: 50,
        high_engagement: 25,
        normal_engagement: 5
      },
      networkEffects: [
        'follower_overlap_amplification',
        'community_clustering_boost',
        'interest_graph_propagation',
        'demographic_resonance'
      ]
    },
    optimalTimingPatterns: {
      globalOptimal: ['9:00-10:00', '12:00-13:00', '17:00-18:00', '20:00-21:00'],
      demographicOptimal: {
        'gen_z': ['16:00-18:00', '20:00-23:00'],
        'millennials': ['8:00-9:00', '12:00-13:00', '17:00-19:00'],
        'gen_x': ['7:00-9:00', '12:00-13:00', '18:00-20:00'],
        'boomers': ['8:00-10:00', '14:00-16:00', '19:00-21:00']
      },
      contentTypeOptimal: {
        'breaking_news': ['6:00-9:00', '17:00-20:00'],
        'entertainment': ['19:00-23:00'],
        'business': ['8:00-10:00', '14:00-16:00'],
        'threads': ['10:00-12:00', '15:00-17:00']
      }
    },
    contentSpecifications: {
      formats: {
        tweet: { maxLength: 280, minLength: 10, optimalLength: 120, hashtagLimit: 3, mentionLimit: 2 },
        thread: { maxLength: 2800, minLength: 560, optimalLength: 1400, hashtagLimit: 5, mentionLimit: 3 },
        reply: { maxLength: 280, minLength: 5, optimalLength: 80, hashtagLimit: 1, mentionLimit: 1 }
      }
    }
  },

  tiktok: {
    platform: 'TikTok',
    lastUpdated: '2024-01-15',
    algorithmVersion: 'v3.2',
    primaryObjective: 'Video completion rate and engagement velocity',
    rankingFactors: {
      completion_rate: { weight: 0.40, impact: 'high', timeDecay: 0.7, userDependency: false, contentTypeDependency: false },
      engagement_velocity: { weight: 0.35, impact: 'high', timeDecay: 0.8, userDependency: true, contentTypeDependency: false },
      user_interaction_history: { weight: 0.25, impact: 'high', timeDecay: 0.3, userDependency: true, contentTypeDependency: false },
      video_information: { weight: 0.20, impact: 'medium', timeDecay: 0.5, userDependency: false, contentTypeDependency: true },
      device_language_settings: { weight: 0.15, impact: 'medium', timeDecay: 0.1, userDependency: true, contentTypeDependency: false },
      sound_trending: { weight: 0.30, impact: 'high', timeDecay: 0.9, userDependency: false, contentTypeDependency: true },
      hashtag_momentum: { weight: 0.25, impact: 'high', timeDecay: 0.8, userDependency: false, contentTypeDependency: true },
      creator_consistency: { weight: 0.18, impact: 'medium', timeDecay: 0.2, userDependency: false, contentTypeDependency: false }
    },
    contentTypeWeights: {
      original_video: 1.0,
      duet: 1.4,
      stitch: 1.3,
      trend_participation: 1.8,
      challenge: 1.9,
      tutorial: 1.2,
      dance: 1.6,
      comedy: 1.5
    },
    engagementSignals: {
      like: 1.0,
      comment: 3.0,
      share: 4.0,
      follow: 8.0,
      duet: 5.0,
      stitch: 4.5,
      save: 2.5,
      completion: 6.0,
      rewatch: 3.5,
      profile_visit: 2.0
    },
    penaltyFactors: {
      skip_rate: -3.0,
      not_interested: -4.0,
      report: -8.0,
      low_quality_video: -2.0,
      copyright_violation: -10.0,
      spam_behavior: -6.0,
      fake_views: -15.0
    },
    viralMechanics: {
      triggers: {
        trending_sound: 3.0,
        hashtag_challenge: 2.8,
        duet_chain: 2.5,
        dance_trend: 2.7,
        comedy_hook: 2.3,
        transformation: 2.4,
        surprise_element: 2.6,
        emotional_moment: 2.2
      },
      amplificationFactors: [
        'sound_adoption_velocity',
        'cross_demographic_appeal',
        'creator_tier_participation',
        'international_spread',
        'media_attention'
      ],
      velocityThresholds: {
        viral_threshold: 1000000,
        trending_threshold: 100000,
        high_engagement: 10000,
        normal_engagement: 1000
      },
      networkEffects: [
        'sound_propagation',
        'hashtag_clustering',
        'creator_collaboration',
        'geographic_spread'
      ]
    },
    optimalTimingPatterns: {
      globalOptimal: ['6:00-10:00', '15:00-18:00', '19:00-23:00'],
      demographicOptimal: {
        'gen_z': ['15:00-18:00', '20:00-24:00'],
        'millennials': ['7:00-9:00', '18:00-21:00'],
        'gen_alpha': ['16:00-19:00', '21:00-22:00']
      },
      contentTypeOptimal: {
        'dance': ['17:00-20:00'],
        'comedy': ['19:00-23:00'],
        'tutorial': ['10:00-14:00'],
        'trending': ['16:00-18:00']
      }
    },
    contentSpecifications: {
      formats: {
        short_video: { maxLength: 60, minLength: 15, optimalLength: 30, hashtagLimit: 5, mentionLimit: 3, mediaRequirements: ['vertical_video'] },
        medium_video: { maxLength: 180, minLength: 60, optimalLength: 120, hashtagLimit: 7, mentionLimit: 3, mediaRequirements: ['vertical_video'] },
        long_video: { maxLength: 600, minLength: 180, optimalLength: 300, hashtagLimit: 8, mentionLimit: 3, mediaRequirements: ['vertical_video'] }
      }
    }
  },

  instagram: {
    platform: 'Instagram',
    lastUpdated: '2024-01-15',
    algorithmVersion: 'v4.1',
    primaryObjective: 'Meaningful interactions and time spent',
    rankingFactors: {
      relationship_score: { weight: 0.30, impact: 'high', timeDecay: 0.2, userDependency: true, contentTypeDependency: false },
      interest_alignment: { weight: 0.25, impact: 'high', timeDecay: 0.4, userDependency: true, contentTypeDependency: true },
      timeliness: { weight: 0.20, impact: 'medium', timeDecay: 0.9, userDependency: false, contentTypeDependency: false },
      usage_frequency: { weight: 0.15, impact: 'medium', timeDecay: 0.3, userDependency: true, contentTypeDependency: false },
      content_quality: { weight: 0.35, impact: 'high', timeDecay: 0.5, userDependency: false, contentTypeDependency: true },
      engagement_probability: { weight: 0.28, impact: 'high', timeDecay: 0.6, userDependency: true, contentTypeDependency: true },
      visual_appeal: { weight: 0.22, impact: 'high', timeDecay: 0.4, userDependency: false, contentTypeDependency: true }
    },
    contentTypeWeights: {
      photo: 1.0,
      carousel: 1.4,
      video: 1.2,
      reel: 1.8,
      story: 1.1,
      igtv: 1.3,
      live: 2.0
    },
    engagementSignals: {
      like: 1.0,
      comment: 4.0,
      save: 5.0,
      share: 6.0,
      story_reply: 3.5,
      profile_visit: 2.5,
      website_click: 3.0,
      follow: 10.0,
      dm: 7.0,
      story_completion: 2.0
    },
    penaltyFactors: {
      hide_story: -2.0,
      unfollow: -8.0,
      report: -10.0,
      not_interested: -3.0,
      low_time_spent: -1.5,
      engagement_bait: -4.0,
      hashtag_spam: -2.5
    },
    viralMechanics: {
      triggers: {
        aesthetic_appeal: 2.4,
        storytelling: 2.2,
        behind_scenes: 2.0,
        user_generated_content: 2.3,
        lifestyle_aspirational: 2.1,
        educational_carousel: 2.5,
        transformation: 2.6,
        relatable_moment: 2.0
      },
      amplificationFactors: [
        'influencer_engagement',
        'hashtag_discovery',
        'explore_page_feature',
        'story_reshares',
        'save_velocity'
      ],
      velocityThresholds: {
        viral_threshold: 500000,
        trending_threshold: 50000,
        high_engagement: 5000,
        normal_engagement: 500
      },
      networkEffects: [
        'hashtag_communities',
        'location_clustering',
        'interest_overlap',
        'influencer_networks'
      ]
    },
    optimalTimingPatterns: {
      globalOptimal: ['8:00-9:00', '12:00-13:00', '17:00-19:00', '20:00-21:00'],
      demographicOptimal: {
        'gen_z': ['15:00-17:00', '20:00-22:00'],
        'millennials': ['8:00-9:00', '17:00-19:00'],
        'gen_x': ['8:00-10:00', '19:00-21:00']
      },
      contentTypeOptimal: {
        'reels': ['18:00-21:00'],
        'carousel': ['10:00-12:00', '15:00-17:00'],
        'stories': ['12:00-14:00', '18:00-20:00']
      }
    },
    contentSpecifications: {
      formats: {
        feed_post: { maxLength: 2200, minLength: 50, optimalLength: 300, hashtagLimit: 30, mentionLimit: 20 },
        story: { maxLength: 2200, minLength: 10, optimalLength: 100, hashtagLimit: 10, mentionLimit: 10 },
        reel: { maxLength: 2200, minLength: 20, optimalLength: 150, hashtagLimit: 20, mentionLimit: 5 }
      }
    }
  },

  youtube: {
    platform: 'YouTube',
    lastUpdated: '2024-01-15',
    algorithmVersion: 'v5.0',
    primaryObjective: 'Watch time optimization and session duration',
    rankingFactors: {
      watch_time: { weight: 0.45, impact: 'high', timeDecay: 0.6, userDependency: false, contentTypeDependency: false },
      click_through_rate: { weight: 0.25, impact: 'high', timeDecay: 0.7, userDependency: true, contentTypeDependency: true },
      retention_rate: { weight: 0.35, impact: 'high', timeDecay: 0.5, userDependency: false, contentTypeDependency: true },
      engagement_signals: { weight: 0.20, impact: 'medium', timeDecay: 0.6, userDependency: true, contentTypeDependency: false },
      video_freshness: { weight: 0.15, impact: 'medium', timeDecay: 0.8, userDependency: false, contentTypeDependency: false },
      session_impact: { weight: 0.30, impact: 'high', timeDecay: 0.4, userDependency: false, contentTypeDependency: false },
      thumbnail_performance: { weight: 0.18, impact: 'medium', timeDecay: 0.7, userDependency: true, contentTypeDependency: true }
    },
    contentTypeWeights: {
      tutorial: 1.3,
      entertainment: 1.0,
      educational: 1.4,
      review: 1.2,
      vlog: 1.1,
      gaming: 1.5,
      music: 1.2,
      news: 1.6,
      live_stream: 1.8
    },
    engagementSignals: {
      like: 1.0,
      dislike: -0.5,
      comment: 3.0,
      subscribe: 8.0,
      bell_notification: 10.0,
      share: 4.0,
      playlist_add: 5.0,
      watch_later: 3.5,
      end_screen_click: 2.5,
      description_link_click: 2.0
    },
    penaltyFactors: {
      high_abandonment: -3.0,
      misleading_thumbnail: -5.0,
      clickbait_title: -4.0,
      copyright_strike: -15.0,
      low_retention: -2.0,
      spam_comments: -1.5,
      fake_engagement: -10.0
    },
    viralMechanics: {
      triggers: {
        trending_topic: 2.8,
        tutorial_value: 2.5,
        entertainment_hook: 2.3,
        educational_insight: 2.4,
        reaction_content: 2.1,
        collaboration: 2.6,
        breaking_news: 3.0,
        challenge_response: 2.2
      },
      amplificationFactors: [
        'suggested_video_placement',
        'search_ranking_boost',
        'trending_page_feature',
        'creator_community_shares',
        'external_embedding'
      ],
      velocityThresholds: {
        viral_threshold: 1000000,
        trending_threshold: 100000,
        high_engagement: 10000,
        normal_engagement: 1000
      },
      networkEffects: [
        'subscriber_notification_cascade',
        'suggested_video_chain',
        'playlist_inclusion',
        'channel_cross_promotion'
      ]
    },
    optimalTimingPatterns: {
      globalOptimal: ['14:00-16:00', '18:00-20:00'],
      demographicOptimal: {
        'kids': ['15:00-17:00'],
        'teens': ['16:00-18:00', '20:00-22:00'],
        'adults': ['18:00-22:00'],
        'seniors': ['10:00-14:00']
      },
      contentTypeOptimal: {
        'tutorials': ['10:00-12:00', '14:00-16:00'],
        'entertainment': ['18:00-22:00'],
        'educational': ['9:00-11:00', '13:00-15:00'],
        'gaming': ['16:00-20:00']
      }
    },
    contentSpecifications: {
      formats: {
        short: { maxLength: 60, minLength: 15, optimalLength: 30, hashtagLimit: 15, mentionLimit: 5 },
        standard: { maxLength: 900, minLength: 180, optimalLength: 480, hashtagLimit: 20, mentionLimit: 10 },
        long_form: { maxLength: 3600, minLength: 900, optimalLength: 1800, hashtagLimit: 25, mentionLimit: 15 }
      }
    }
  },

  linkedin: {
    platform: 'LinkedIn',
    lastUpdated: '2024-01-15',
    algorithmVersion: 'v3.5',
    primaryObjective: 'Professional relevance and meaningful conversations',
    rankingFactors: {
      professional_relevance: { weight: 0.40, impact: 'high', timeDecay: 0.4, userDependency: true, contentTypeDependency: true },
      network_engagement: { weight: 0.30, impact: 'high', timeDecay: 0.6, userDependency: true, contentTypeDependency: false },
      content_quality: { weight: 0.25, impact: 'high', timeDecay: 0.5, userDependency: false, contentTypeDependency: true },
      creator_authority: { weight: 0.20, impact: 'medium', timeDecay: 0.1, userDependency: false, contentTypeDependency: false },
      industry_alignment: { weight: 0.18, impact: 'medium', timeDecay: 0.3, userDependency: true, contentTypeDependency: true },
      conversation_starter: { weight: 0.22, impact: 'high', timeDecay: 0.7, userDependency: false, contentTypeDependency: true }
    },
    contentTypeWeights: {
      article: 1.8,
      text_post: 1.0,
      image_post: 1.2,
      video: 1.4,
      poll: 1.5,
      document: 1.6,
      carousel: 1.3,
      live_event: 2.0
    },
    engagementSignals: {
      like: 1.0,
      comment: 5.0,
      share: 6.0,
      article_read: 3.0,
      profile_visit: 2.5,
      connection_request: 8.0,
      message: 7.0,
      follow: 4.0,
      reaction: 1.5,
      click: 2.0
    },
    penaltyFactors: {
      irrelevant_content: -3.0,
      spam_behavior: -8.0,
      inappropriate_content: -10.0,
      low_professional_value: -2.0,
      engagement_bait: -4.0,
      misleading_information: -6.0
    },
    viralMechanics: {
      triggers: {
        industry_insight: 2.8,
        career_advice: 2.5,
        thought_leadership: 2.7,
        professional_story: 2.3,
        industry_trends: 2.6,
        networking_tips: 2.2,
        success_story: 2.4,
        controversial_opinion: 2.0
      },
      amplificationFactors: [
        'c_suite_engagement',
        'industry_leader_shares',
        'professional_network_spread',
        'cross_industry_interest',
        'media_pickup'
      ],
      velocityThresholds: {
        viral_threshold: 50000,
        trending_threshold: 5000,
        high_engagement: 500,
        normal_engagement: 50
      },
      networkEffects: [
        'industry_clustering',
        'company_network_spread',
        'alumni_network_activation',
        'professional_association_sharing'
      ]
    },
    optimalTimingPatterns: {
      globalOptimal: ['8:00-10:00', '12:00-14:00', '17:00-18:00'],
      demographicOptimal: {
        'executives': ['7:00-9:00', '17:00-19:00'],
        'mid_level': ['8:00-10:00', '12:00-14:00'],
        'entry_level': ['12:00-14:00', '17:00-19:00']
      },
      contentTypeOptimal: {
        'articles': ['8:00-10:00'],
        'industry_news': ['7:00-9:00'],
        'career_tips': ['12:00-14:00'],
        'thought_leadership': ['8:00-10:00', '17:00-18:00']
      }
    },
    contentSpecifications: {
      formats: {
        post: { maxLength: 3000, minLength: 50, optimalLength: 500, hashtagLimit: 5, mentionLimit: 10 },
        article: { maxLength: 125000, minLength: 500, optimalLength: 2000, hashtagLimit: 10, mentionLimit: 20 },
        comment: { maxLength: 1250, minLength: 10, optimalLength: 100, hashtagLimit: 2, mentionLimit: 3 }
      }
    }
  },

  facebook: {
    platform: 'Facebook',
    lastUpdated: '2024-01-15',
    algorithmVersion: 'v6.2',
    primaryObjective: 'Meaningful social interactions and time spent',
    rankingFactors: {
      meaningful_interactions: { weight: 0.40, impact: 'high', timeDecay: 0.5, userDependency: true, contentTypeDependency: false },
      relationship_strength: { weight: 0.30, impact: 'high', timeDecay: 0.2, userDependency: true, contentTypeDependency: false },
      content_type_preference: { weight: 0.20, impact: 'medium', timeDecay: 0.4, userDependency: true, contentTypeDependency: true },
      recency: { weight: 0.15, impact: 'medium', timeDecay: 0.9, userDependency: false, contentTypeDependency: false },
      time_spent_prediction: { weight: 0.25, impact: 'high', timeDecay: 0.6, userDependency: true, contentTypeDependency: true }
    },
    contentTypeWeights: {
      text: 1.0,
      photo: 1.3,
      video: 1.6,
      link: 0.8,
      live_video: 2.2,
      poll: 1.4,
      event: 1.5,
      group_post: 1.7
    },
    engagementSignals: {
      like: 1.0,
      love: 2.0,
      care: 2.2,
      wow: 1.8,
      sad: 1.5,
      angry: 1.3,
      comment: 4.0,
      share: 5.0,
      click: 1.5,
      video_view: 2.0,
      photo_view: 1.2
    },
    penaltyFactors: {
      hide_post: -3.0,
      unfollow: -6.0,
      report: -10.0,
      clickbait: -4.0,
      engagement_bait: -3.5,
      false_news: -8.0,
      spam: -5.0
    },
    viralMechanics: {
      triggers: {
        emotional_appeal: 2.5,
        family_moments: 2.3,
        community_events: 2.2,
        heartwarming_stories: 2.4,
        local_interest: 2.1,
        nostalgia: 2.0,
        humor: 2.2,
        social_causes: 2.3
      },
      amplificationFactors: [
        'family_network_sharing',
        'community_group_spread',
        'local_business_engagement',
        'cause_advocacy_networks',
        'interest_group_circulation'
      ],
      velocityThresholds: {
        viral_threshold: 100000,
        trending_threshold: 10000,
        high_engagement: 1000,
        normal_engagement: 100
      },
      networkEffects: [
        'friend_network_clustering',
        'family_circle_amplification',
        'community_group_sharing',
        'interest_based_spreading'
      ]
    },
    optimalTimingPatterns: {
      globalOptimal: ['9:00-10:00', '15:00-16:00', '20:00-21:00'],
      demographicOptimal: {
        'parents': ['9:00-11:00', '20:00-22:00'],
        'young_adults': ['19:00-23:00'],
        'seniors': ['10:00-14:00', '19:00-21:00']
      },
      contentTypeOptimal: {
        'family_content': ['18:00-21:00'],
        'news': ['7:00-9:00', '17:00-19:00'],
        'entertainment': ['19:00-23:00'],
        'local_events': ['17:00-20:00']
      }
    },
    contentSpecifications: {
      formats: {
        status: { maxLength: 63206, minLength: 10, optimalLength: 200, hashtagLimit: 5, mentionLimit: 50 },
        comment: { maxLength: 8000, minLength: 5, optimalLength: 50, hashtagLimit: 2, mentionLimit: 10 }
      }
    }
  },

  pinterest: {
    platform: 'Pinterest',
    lastUpdated: '2024-01-15',
    algorithmVersion: 'v2.8',
    primaryObjective: 'Discovery optimization and user intent matching',
    rankingFactors: {
      search_relevance: { weight: 0.35, impact: 'high', timeDecay: 0.3, userDependency: false, contentTypeDependency: true },
      pin_quality: { weight: 0.30, impact: 'high', timeDecay: 0.4, userDependency: false, contentTypeDependency: true },
      pinner_quality: { weight: 0.20, impact: 'medium', timeDecay: 0.1, userDependency: false, contentTypeDependency: false },
      topic_relevance: { weight: 0.25, impact: 'high', timeDecay: 0.5, userDependency: true, contentTypeDependency: true },
      seasonal_trends: { weight: 0.18, impact: 'medium', timeDecay: 0.8, userDependency: false, contentTypeDependency: true },
      engagement_prediction: { weight: 0.22, impact: 'medium', timeDecay: 0.6, userDependency: true, contentTypeDependency: true }
    },
    contentTypeWeights: {
      standard_pin: 1.0,
      video_pin: 1.4,
      idea_pin: 1.6,
      shopping_pin: 1.3,
      app_pin: 1.2,
      rich_pin: 1.5
    },
    engagementSignals: {
      save: 5.0,
      click: 3.0,
      close_up: 2.0,
      comment: 4.0,
      share: 3.5,
      follow: 6.0,
      board_follow: 4.5,
      hide: -2.0,
      report: -8.0
    },
    penaltyFactors: {
      low_quality_image: -3.0,
      irrelevant_content: -4.0,
      spam_pins: -6.0,
      misleading_content: -5.0,
      copyright_violation: -10.0,
      adult_content: -8.0
    },
    viralMechanics: {
      triggers: {
        seasonal_relevance: 2.8,
        diy_tutorial: 2.6,
        recipe_content: 2.5,
        home_decor: 2.4,
        fashion_inspiration: 2.3,
        wedding_planning: 2.7,
        travel_destination: 2.2,
        lifestyle_aspiration: 2.1
      },
      amplificationFactors: [
        'board_inclusion_velocity',
        'search_trending_boost',
        'seasonal_algorithm_boost',
        'topic_authority_amplification',
        'rich_pin_enhancement'
      ],
      velocityThresholds: {
        viral_threshold: 10000,
        trending_threshold: 1000,
        high_engagement: 100,
        normal_engagement: 10
      },
      networkEffects: [
        'board_theme_clustering',
        'interest_overlap_spreading',
        'seasonal_trend_riding',
        'topic_authority_boost'
      ]
    },
    optimalTimingPatterns: {
      globalOptimal: ['8:00-11:00', '20:00-23:00'],
      demographicOptimal: {
        'millennials': ['20:00-23:00'],
        'gen_x': ['19:00-22:00'],
        'boomers': ['14:00-17:00']
      },
      contentTypeOptimal: {
        'recipes': ['17:00-20:00'],
        'diy': ['10:00-14:00'],
        'fashion': ['18:00-21:00'],
        'home_decor': ['10:00-12:00', '19:00-21:00']
      }
    },
    contentSpecifications: {
      formats: {
        pin_description: { maxLength: 500, minLength: 50, optimalLength: 200, hashtagLimit: 20, mentionLimit: 5 },
        board_title: { maxLength: 50, minLength: 10, optimalLength: 25, hashtagLimit: 0, mentionLimit: 0 },
        board_description: { maxLength: 500, minLength: 50, optimalLength: 150, hashtagLimit: 10, mentionLimit: 0 }
      }
    }
  }
};

export class AlgorithmIntelligence {
  static getPlatformData(platform: string): PlatformAlgorithmData | null {
    return ALGORITHM_DATABASE[platform.toLowerCase()] || null;
  }

  static getAllPlatforms(): string[] {
    return Object.keys(ALGORITHM_DATABASE);
  }

  static getViralTriggers(platform: string): Record<string, number> {
    const data = this.getPlatformData(platform);
    return data?.viralMechanics.triggers || {};
  }

  static getOptimalTiming(platform: string, demographic?: string, contentType?: string): string[] {
    const data = this.getPlatformData(platform);
    if (!data) return [];

    if (contentType && data.optimalTimingPatterns.contentTypeOptimal[contentType]) {
      return data.optimalTimingPatterns.contentTypeOptimal[contentType];
    }

    if (demographic && data.optimalTimingPatterns.demographicOptimal[demographic]) {
      return data.optimalTimingPatterns.demographicOptimal[demographic];
    }

    return data.optimalTimingPatterns.globalOptimal;
  }

  static calculateAlgorithmScore(platform: string, contentMetrics: Record<string, number>): number {
    const data = this.getPlatformData(platform);
    if (!data) return 0;

    let score = 0;
    let totalWeight = 0;

    for (const [factor, metrics] of Object.entries(data.rankingFactors)) {
      if (contentMetrics[factor] !== undefined) {
        score += contentMetrics[factor] * metrics.weight;
        totalWeight += metrics.weight;
      }
    }

    return totalWeight > 0 ? (score / totalWeight) * 100 : 0;
  }

  static getContentOptimizationSuggestions(platform: string, contentType: string): string[] {
    const data = this.getPlatformData(platform);
    if (!data) return [];

    const suggestions: string[] = [];
    const specs = data.contentSpecifications.formats[contentType];

    if (specs) {
      suggestions.push(`Optimal length: ${specs.optimalLength} characters`);
      suggestions.push(`Use up to ${specs.hashtagLimit} hashtags`);
      suggestions.push(`Include up to ${specs.mentionLimit} mentions`);
    }

    // Add viral trigger suggestions
    const topTriggers = Object.entries(data.viralMechanics.triggers)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([trigger]) => trigger);

    suggestions.push(`Consider incorporating: ${topTriggers.join(', ')}`);

    return suggestions;
  }
}