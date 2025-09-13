// Gamification widget for dashboard integration
// LOG: COMPONENT-GAMIFICATION-1 - Initialize gamification widget

'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Star, Award, TrendingUp, Target, Zap, Users, Gift } from 'lucide-react';
import { gamificationService } from '../lib/gamification';

interface GamificationProfile {
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
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points_reward: number;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  points: number;
  level: number;
  badges: number;
}

export function GamificationWidget({ userId = 'demo-user', compact = false }: { userId?: string; compact?: boolean }) {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'leaderboard' | 'achievements'>('profile');
  const [showNotification, setShowNotification] = useState(false);
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

  console.log('LOG: COMPONENT-GAMIFICATION-2 - GamificationWidget rendered for user:', userId);

  useEffect(() => {
    loadGamificationData();
  }, [userId]);

  const loadGamificationData = async () => {
    console.log('LOG: COMPONENT-GAMIFICATION-3 - Loading gamification data');
    setLoading(true);

    try {
      const [profileResponse, leaderboardResponse, achievementsResponse] = await Promise.all([
        fetch(`/api/gamification?type=profile&user_id=${userId}`),
        fetch(`/api/gamification?type=leaderboard&limit=5`),
        fetch(`/api/gamification?type=achievements`)
      ]);

      const profileResult = await profileResponse.json();
      const leaderboardResult = await leaderboardResponse.json();
      const achievementsResult = await achievementsResponse.json();

      if (profileResult.success) {
        setProfile(profileResult.data);
      }

      if (leaderboardResult.success) {
        setLeaderboard(leaderboardResult.data);
      }

      if (achievementsResult.success) {
        setAllBadges(achievementsResult.data.badges);
      }

      console.log('LOG: COMPONENT-GAMIFICATION-4 - Gamification data loaded successfully');
    } catch (error) {
      console.error('LOG: COMPONENT-GAMIFICATION-ERROR-1 - Failed to load gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerTestEvent = async (eventType: string) => {
    console.log('LOG: COMPONENT-GAMIFICATION-5 - Triggering test event:', eventType);
    
    try {
      const response = await fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'award_points',
          user_id: userId,
          event_type: eventType
        })
      });

      const result = await response.json();

      if (result.success) {
        // Show notification for new achievements/badges
        if (result.data.new_achievements.length > 0 || result.data.new_badges.length > 0) {
          setNotification({
            type: 'achievement',
            message: `🎉 ${result.data.points_awarded} points awarded! ${result.data.new_achievements.length} new achievements unlocked!`
          });
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 5000);
        }

        // Reload profile to show updated data
        await loadGamificationData();
      }
    } catch (error) {
      console.error('LOG: COMPONENT-GAMIFICATION-ERROR-2 - Failed to trigger event:', error);
    }
  };

  const getBadgeRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
      case 'epic': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'rare': return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white';
      case 'common': return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading gamification...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8 text-gray-500">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Gamification data not available</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {profile.level}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{formatNumber(profile.points)} pts</p>
              <p className="text-sm text-gray-500">Level {profile.level}</p>
            </div>
          </div>
          <div className="flex space-x-1">
            {profile.badges.slice(0, 3).map((badgeId) => {
              const badge = allBadges.find(b => b.id === badgeId);
              return badge ? (
                <span key={badgeId} className="text-lg" title={badge.name}>
                  {badge.icon}
                </span>
              ) : null;
            })}
            {profile.badges.length > 3 && (
              <span className="text-xs text-gray-500">+{profile.badges.length - 3}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {showNotification && notification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Trophy className="w-6 h-6 mr-2 text-indigo-600" />
            Gamification
          </h2>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{formatNumber(profile.points)}</p>
              <p className="text-sm text-gray-500">Total Points</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {profile.level}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'profile', label: 'Profile', icon: Star },
            { id: 'leaderboard', label: 'Leaderboard', icon: TrendingUp },
            { id: 'achievements', label: 'Achievements', icon: Award }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Level Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Level Progress</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Level {profile.level}</span>
              <span className="text-sm text-gray-500">
                {gamificationService.getPointsForNextLevel(profile.points)} points to next level
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (profile.points % 100))}%` 
                }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{profile.stats.content_created}</p>
              <p className="text-sm text-gray-600">Content Created</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <Zap className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{profile.stats.content_published}</p>
              <p className="text-sm text-gray-600">Published</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{profile.stats.matches_completed}</p>
              <p className="text-sm text-gray-600">Matches</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <Gift className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{profile.stats.workflows_run}</p>
              <p className="text-sm text-gray-600">AI Workflows</p>
            </div>
          </div>

          {/* Badges */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Earned Badges</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {profile.badges.map((badgeId) => {
                const badge = allBadges.find(b => b.id === badgeId);
                return badge ? (
                  <div key={badgeId} className={`p-4 rounded-lg text-center ${getBadgeRarityColor(badge.rarity)}`}>
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <h4 className="font-medium text-sm">{badge.name}</h4>
                    <p className="text-xs opacity-90">{badge.description}</p>
                  </div>
                ) : null;
              })}
              
              {profile.badges.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <Award className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No badges earned yet. Keep creating content to unlock badges!</p>
                </div>
              )}
            </div>
          </div>

          {/* Test Events (Development Only) */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Events (Demo)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { event: 'content_created', label: 'Create Content', icon: '✍️' },
                { event: 'content_published', label: 'Publish Content', icon: '📢' },
                { event: 'workflow_completed', label: 'Run Workflow', icon: '🤖' },
                { event: 'match_accepted', label: 'Accept Match', icon: '🤝' },
                { event: 'match_completed', label: 'Complete Match', icon: '✅' }
              ].map(({ event, label, icon }) => (
                <button
                  key={event}
                  onClick={() => triggerTestEvent(event)}
                  className="flex items-center justify-center px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                >
                  <span className="mr-2">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Creators</h3>
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div key={entry.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">@{entry.username}</h4>
                    <p className="text-sm text-gray-500">Level {entry.level} • {entry.badges} badges</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatNumber(entry.points)}</p>
                  <p className="text-xs text-gray-500">points</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">All Achievements</h3>
          <div className="grid gap-4">
            {gamificationService.getAchievements().map((achievement) => {
              const isUnlocked = profile.achievements.includes(achievement.id);
              return (
                <div key={achievement.id} className={`p-4 border rounded-lg ${
                  isUnlocked ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`text-2xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${isUnlocked ? 'text-green-900' : 'text-gray-700'}`}>
                        {achievement.name}
                      </h4>
                      <p className={`text-sm ${isUnlocked ? 'text-green-700' : 'text-gray-500'}`}>
                        {achievement.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isUnlocked ? 'text-green-600' : 'text-gray-500'}`}>
                        +{achievement.points_reward}
                      </p>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                    {isUnlocked && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for using gamification data in other components
export function useGamification(userId: string) {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    console.log('LOG: COMPONENT-GAMIFICATION-6 - Fetching profile via hook');
    setLoading(true);
    
    try {
      const response = await fetch(`/api/gamification?type=profile&user_id=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        setProfile(result.data);
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('LOG: COMPONENT-GAMIFICATION-ERROR-3 - Hook fetch failed:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const awardPoints = async (eventType: string, metadata?: any) => {
    console.log('LOG: COMPONENT-GAMIFICATION-7 - Awarding points via hook:', eventType);
    
    try {
      const response = await fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'award_points',
          user_id: userId,
          event_type: eventType,
          metadata
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchProfile(); // Refresh profile
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('LOG: COMPONENT-GAMIFICATION-ERROR-4 - Award points failed:', error);
      return null;
    }
  };

  return { profile, loading, fetchProfile, awardPoints };
}