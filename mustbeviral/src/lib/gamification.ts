// Gamification system using JSON storage in users.profile_data
// LOG: GAMIFICATION-INIT-1 - Initialize gamification service

export interface GamificationProfile {
  points: number;
  level: number;
  badges: string[];
  achievements: string[];
  stats: {
    content_created: number;
    content_published: number;
    matches_completed: number;
    workflows_run: number;
    days_active: number;
  };
  last_activity: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'content' | 'engagement' | 'social' | 'milestone';
  criteria: {
    type: 'points' | 'count' | 'streak' | 'level';
    threshold: number;
    stat_key?: string;
  };
  points_reward: number;
  badge_unlock?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlock_criteria: string;
}

export interface GamificationEvent {
  user_id: string;
  event_type: 'signup' | 'content_created' | 'content_published' | 'workflow_completed' | 'match_accepted' | 'match_completed';
  points_awarded: number;
  metadata?: unknown;
}

export class GamificationService {
  private achievements: Map<string, Achievement> = new Map();
  private badges: Map<string, Badge> = new Map();

  constructor() {
    console.log('LOG: GAMIFICATION-SERVICE-1 - Initializing gamification service');
    this.initializeAchievements();
    this.initializeBadges();
  }

  private initializeAchievements(): void {
    console.log('LOG: GAMIFICATION-ACHIEVEMENTS-1 - Loading achievements');
    
    const achievements: Achievement[] = [
      {
        id: 'first_signup',
        name: 'Welcome Aboard',
        description: 'Complete your account registration',
        icon: '🎉',
        category: 'milestone',
        criteria: { type: 'count', threshold: 1, stat_key: 'signup' },
        points_reward: 100,
        badge_unlock: 'newcomer'
      },
      {
        id: 'first_content',
        name: 'Content Creator',
        description: 'Create your first piece of content',
        icon: '✍️',
        category: 'content',
        criteria: { type: 'count', threshold: 1, stat_key: 'content_created' },
        points_reward: 200,
        badge_unlock: 'creator'
      },
      {
        id: 'first_publish',
        name: 'Publisher',
        description: 'Publish your first content',
        icon: '📢',
        category: 'content',
        criteria: { type: 'count', threshold: 1, stat_key: 'content_published' },
        points_reward: 300,
        badge_unlock: 'publisher'
      },
      {
        id: 'content_master',
        name: 'Content Master',
        description: 'Create 10 pieces of content',
        icon: '🏆',
        category: 'content',
        criteria: { type: 'count', threshold: 10, stat_key: 'content_created' },
        points_reward: 1000,
        badge_unlock: 'content_master'
      },
      {
        id: 'viral_creator',
        name: 'Viral Creator',
        description: 'Publish 5 pieces of content',
        icon: '🚀',
        category: 'content',
        criteria: { type: 'count', threshold: 5, stat_key: 'content_published' },
        points_reward: 750,
        badge_unlock: 'viral_creator'
      },
      {
        id: 'influencer_partner',
        name: 'Influencer Partner',
        description: 'Complete your first influencer match',
        icon: '🤝',
        category: 'social',
        criteria: { type: 'count', threshold: 1, stat_key: 'matches_completed' },
        points_reward: 500,
        badge_unlock: 'partner'
      },
      {
        id: 'ai_enthusiast',
        name: 'AI Enthusiast',
        description: 'Run 10 AI workflows',
        icon: '🤖',
        category: 'engagement',
        criteria: { type: 'count', threshold: 10, stat_key: 'workflows_run' },
        points_reward: 600,
        badge_unlock: 'ai_enthusiast'
      },
      {
        id: 'level_5',
        name: 'Rising Star',
        description: 'Reach level 5',
        icon: '⭐',
        category: 'milestone',
        criteria: { type: 'level', threshold: 5 },
        points_reward: 500
      },
      {
        id: 'points_master',
        name: 'Points Master',
        description: 'Earn 5000 points',
        icon: '💎',
        category: 'milestone',
        criteria: { type: 'points', threshold: 5000 },
        points_reward: 1000,
        badge_unlock: 'points_master'
      }
    ];

    achievements.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });

    console.log('LOG: GAMIFICATION-ACHIEVEMENTS-2 - Loaded', achievements.length, 'achievements');
  }

  private initializeBadges(): void {
    console.log('LOG: GAMIFICATION-BADGES-1 - Loading badges');
    
    const badges: Badge[] = [
      {
        id: 'newcomer',
        name: 'Newcomer',
        description: 'Welcome to Must Be Viral!',
        icon: '🆕',
        rarity: 'common',
        unlock_criteria: 'Complete registration'
      },
      {
        id: 'creator',
        name: 'Creator',
        description: 'Content creation specialist',
        icon: '✍️',
        rarity: 'common',
        unlock_criteria: 'Create first content'
      },
      {
        id: 'publisher',
        name: 'Publisher',
        description: 'Content publishing expert',
        icon: '📢',
        rarity: 'rare',
        unlock_criteria: 'Publish first content'
      },
      {
        id: 'content_master',
        name: 'Content Master',
        description: 'Prolific content creator',
        icon: '🏆',
        rarity: 'epic',
        unlock_criteria: 'Create 10+ pieces of content'
      },
      {
        id: 'viral_creator',
        name: 'Viral Creator',
        description: 'Master of viral content',
        icon: '🚀',
        rarity: 'epic',
        unlock_criteria: 'Publish 5+ pieces of content'
      },
      {
        id: 'partner',
        name: 'Partner',
        description: 'Successful collaboration specialist',
        icon: '🤝',
        rarity: 'rare',
        unlock_criteria: 'Complete first match'
      },
      {
        id: 'ai_enthusiast',
        name: 'AI Enthusiast',
        description: 'AI workflow expert',
        icon: '🤖',
        rarity: 'rare',
        unlock_criteria: 'Run 10+ AI workflows'
      },
      {
        id: 'points_master',
        name: 'Points Master',
        description: 'Elite point collector',
        icon: '💎',
        rarity: 'legendary',
        unlock_criteria: 'Earn 5000+ points'
      }
    ];

    badges.forEach(badge => {
      this.badges.set(badge.id, badge);
    });

    console.log('LOG: GAMIFICATION-BADGES-2 - Loaded', badges.length, 'badges');
  }

  async getUserProfile(userId: string): Promise<GamificationProfile> {
    console.log('LOG: GAMIFICATION-PROFILE-1 - Getting user gamification profile:', userId);
    
    try {
      // In production, this would query the database
      // For now, return a default profile structure
      const defaultProfile: GamificationProfile = {
        points: 0,
        level: 1,
        badges: [],
        achievements: [],
        stats: {
          content_created: 0,
          content_published: 0,
          matches_completed: 0,
          workflows_run: 0,
          days_active: 0
        },
        last_activity: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      // Mock some progress for demo
      if (userId === 'demo-user') {
        defaultProfile.points = 850;
        defaultProfile.level = 3;
        defaultProfile.badges = ['newcomer', 'creator', 'publisher'];
        defaultProfile.achievements = ['first_signup', 'first_content', 'first_publish'];
        defaultProfile.stats = {
          content_created: 3,
          content_published: 2,
          matches_completed: 1,
          workflows_run: 5,
          days_active: 7
        };
      }

      console.log('LOG: GAMIFICATION-PROFILE-2 - Profile retrieved for user:', userId);
      return defaultProfile;
    } catch (error) {
      console.error('LOG: GAMIFICATION-PROFILE-ERROR-1 - Failed to get profile:', error);
      throw new Error('Failed to retrieve gamification profile');
    }
  }

  async awardPoints(userId: string, eventType: GamificationEvent['event_type'], metadata?: unknown): Promise<{ points_awarded: number; new_achievements: Achievement[]; new_badges: Badge[] }> {
    console.log('LOG: GAMIFICATION-AWARD-1 - Awarding points for event:', eventType, 'User:', userId);
    
    try {
      const profile = await this.getUserProfile(userId);
      const pointsMap = this.getPointsForEvent(eventType);
      
      // Award base points
      profile.points += pointsMap.basepoints;
      
      // Update relevant stats
      this.updateStats(profile, eventType, metadata);
      
      // Check for new achievements
      const newAchievements = await this.checkAchievements(profile);
      const newBadges: Badge[] = [];
      
      // Award achievement points and unlock badges
      for (const achievement of newAchievements) {
        if (!profile.achievements.includes(achievement.id)) {
          profile.points += achievement.pointsreward;
          profile.achievements.push(achievement.id);
          
          if (achievement.badge_unlock && !profile.badges.includes(achievement.badgeunlock)) {
            profile.badges.push(achievement.badgeunlock);
            const badge = this.badges.get(achievement.badgeunlock);
            if (badge) {newBadges.push(badge);}
          }
        }
      }
      
      // Update level based on points
      const newLevel = this.calculateLevel(profile.points);
      profile.level = newLevel;
      
      // Update activity timestamp
      profile.lastactivity = new Date().toISOString();
      
      // Save profile back to database (in production)
      await this.saveUserProfile(userId, profile);
      
      console.log('LOG: GAMIFICATION-AWARD-2 - Points awarded successfully:', pointsMap.basepoints, 'New level:', profile.level);
      
      return {
        points_awarded: pointsMap.base_points + newAchievements.reduce((sum, a) => sum + a.pointsreward, 0),
        new_achievements: newAchievements,
        new_badges: newBadges
      };
    } catch (error) {
      console.error('LOG: GAMIFICATION-AWARD-ERROR-1 - Failed to award points:', error);
      throw new Error('Failed to award points');
    }
  }

  private getPointsForEvent(eventType: GamificationEvent['event_type']): { base_points: number; multiplier?: number } {
    const pointsMap = {
      'signup': { base_points: 100 },
      'content_created': { base_points: 50 },
      'content_published': { base_points: 100 },
      'workflow_completed': { base_points: 25 },
      'match_accepted': { base_points: 75 },
      'match_completed': { base_points: 150 }
    };

    return pointsMap[eventType]  ?? { base_points: 10 };
  }

  private updateStats(profile: GamificationProfile, eventType: GamificationEvent['event_type'], metadata?: unknown): void {
    switch (eventType) {
      case 'content_created':
        profile.stats.content_created++;
        break;
      case 'content_published':
        profile.stats.content_published++;
        break;
      case 'match_completed':
        profile.stats.matches_completed++;
        break;
      case 'workflow_completed':
        profile.stats.workflows_run++;
        break;
    }
  }

  private async checkAchievements(profile: GamificationProfile): Promise<Achievement[]> {
    console.log('LOG: GAMIFICATION-CHECK-1 - Checking achievements for profile');
    
    const newAchievements: Achievement[] = [];
    
    for (const [id, achievement] of this.achievements.entries()) {
      if (profile.achievements.includes(id)) {continue;}
      
      const meetsRequirement = this.checkAchievementCriteria(achievement, profile);
      if (meetsRequirement) {
        newAchievements.push(achievement);
        console.log('LOG: GAMIFICATION-CHECK-2 - New achievement unlocked:', achievement.name);
      }
    }
    
    return newAchievements;
  }

  private checkAchievementCriteria(achievement: Achievement, profile: GamificationProfile): boolean {
    const { criteria} = achievement;
    
    switch (criteria.type) {
      case 'points':
        return profile.points >= criteria.threshold;
      case 'level':
        return profile.level >= criteria.threshold;
      case 'count':
        if (!criteria.statkey) {
    return false;
  }
        const statValue = profile.stats[criteria.stat_key as keyof typeof profile.stats];
        return typeof statValue === 'number' && statValue >= criteria.threshold;
      case 'streak':
        // For now, treat streak as count (can be enhanced later)
        if (!criteria.statkey) {
    return false;
  }
        const streakValue = profile.stats[criteria.stat_key as keyof typeof profile.stats];
        return typeof streakValue === 'number' && streakValue >= criteria.threshold;
      default:
        return false;
    }
  }

  private calculateLevel(points: number): number {
    // Level calculation: Level = floor(sqrt(points / 100)) + 1
    // This creates a curve where each level requires more points
    return Math.floor(Math.sqrt(points / 100)) + 1;
  }

  getPointsForNextLevel(currentPoints: number): number {
    const currentLevel = this.calculateLevel(currentPoints);
    const nextLevel = currentLevel + 1;
    const pointsForNextLevel = Math.pow(nextLevel - 1, 2) * 100;
    return pointsForNextLevel - currentPoints;
  }

  private async saveUserProfile(userId: string, profile: GamificationProfile): Promise<void> {
    console.log('LOG: GAMIFICATION-SAVE-1 - Saving user profile:', userId);
    
    try {
      // In production, this would update the users.profile_data field
      // For now, store in memory for demo purposes
      if (typeof global !== 'undefined') {
        global.gamificationProfiles = global.gamificationProfiles ?? new Map();
        global.gamificationProfiles.set(userId, profile);
      }
      
      console.log('LOG: GAMIFICATION-SAVE-2 - Profile saved successfully');
    } catch (error) {
      console.error('LOG: GAMIFICATION-SAVE-ERROR-1 - Failed to save profile:', error);
      throw error;
    }
  }

  getAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  getBadges(): Badge[] {
    return Array.from(this.badges.values());
  }

  getAchievement(id: string): Achievement | null {
    return this.achievements.get(id)  ?? null;
  }

  getBadge(id: string): Badge | null {
    return this.badges.get(id)  ?? null;
  }

  async getLeaderboard(limit: number = 10): Promise<Array<{ user_id: string; username: string; points: number; level: number; badges: number }>> {
    console.log('LOG: GAMIFICATION-LEADERBOARD-1 - Getting leaderboard, limit:', limit);
    
    try {
      // Mock leaderboard data (in production, would query all users and sort by points)
      const mockLeaderboard = [
        { user_id: 'user1', username: 'tech_sarah', points: 2340, level: 5, badges: 4 },
        { user_id: 'user2', username: 'content_mike', points: 1890, level: 4, badges: 3 },
        { user_id: 'user3', username: 'viral_queen', points: 1650, level: 4, badges: 3 },
        { user_id: 'demo-user', username: 'demo_user', points: 850, level: 3, badges: 3 },
        { user_id: 'user4', username: 'ai_creator', points: 720, level: 3, badges: 2 },
        { user_id: 'user5', username: 'trend_setter', points: 560, level: 2, badges: 2 },
        { user_id: 'user6', username: 'newbie_creator', points: 320, level: 2, badges: 1 },
        { user_id: 'user7', username: 'startup_guru', points: 180, level: 1, badges: 1 }
      ];

      return mockLeaderboard.slice(0, limit);
    } catch (error) {
      console.error('LOG: GAMIFICATION-LEADERBOARD-ERROR-1 - Failed to get leaderboard:', error);
      return [];
    }
  }
}

// Export singleton instance
export const gamificationService = new GamificationService();