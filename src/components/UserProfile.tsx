// User Profile Management Component
import React, { _useState, useEffect } from 'react';
import { _User, Edit, Save, X, Camera, Settings, Bell, Shield, Key } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { _apiClient, type User as UserType } from '../lib/api';
import { logger } from '../lib/logging/productionLogger';

interface ProfileData {
  username: string;
  email: string;
  profile_data: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    website?: string;
    location?: string;
    socialLinks?: {
      twitter?: string;
      linkedin?: string;
      instagram?: string;
      tiktok?: string;
    };
    preferences?: {
      notifications?: boolean;
      publicProfile?: boolean;
      emailMarketing?: boolean;
    };
  };
}

export function UserProfile() {
  const { _user, refreshAuth } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    username: '',
    email: '',
    profile_data: {}
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username,
        email: user.email,
        profile_data: user.profile_data || {}
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string, section?: string) => {
    setProfileData(prev => {
      if (section) {
        return {
          ...prev,
          profile_data: {
            ...prev.profile_data,
            [section]: {
              ...prev.profile_data[section as keyof typeof prev.profile_data],
              [field]: value
            }
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.request(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          username: profileData.username,
          profile_data: profileData.profile_data
        })
      });

      if (response.success) {
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        await refreshAuth();

        logger.info('Profile updated successfully', undefined, {
          component: 'UserProfile',
          action: 'profileUpdate',
          metadata: { userId: user.id }
        });

        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMsg);

      logger.error('Profile update failed', err instanceof Error ? err : new Error(String(err)), {
        component: 'UserProfile',
        action: 'profileUpdateFailed',
        metadata: { userId: user?.id }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setProfileData({
        username: user.username,
        email: user.email,
        profile_data: user.profile_data || {}
      });
    }
    setIsEditing(false);
    setError(null);
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600"></div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative -mt-8">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <User className="h-8 w-8 text-gray-600" />
                </div>
                <button className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1 hover:bg-blue-700 transition-colors">
                  <Camera className="h-3 w-3" />
                </button>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{user.username}</h1>
                <p className="text-gray-600 capitalize">{user.role}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.onboarding_completed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.onboarding_completed ? 'Verified' : 'Pending Setup'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(_e) => handleInputChange('username', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={profileData.profile_data.firstName || ''}
                  onChange={(_e) => handleInputChange('firstName', e.target.value, 'profile_data')}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={profileData.profile_data.lastName || ''}
                  onChange={(_e) => handleInputChange('lastName', e.target.value, 'profile_data')}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  value={profileData.profile_data.bio || ''}
                  onChange={(_e) => handleInputChange('bio', e.target.value, 'profile_data')}
                  disabled={!isEditing}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={profileData.profile_data.website || ''}
                  onChange={(_e) => handleInputChange('website', e.target.value, 'profile_data')}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={profileData.profile_data.location || ''}
                  onChange={(_e) => handleInputChange('location', e.target.value, 'profile_data')}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="City, Country"
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Social Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Twitter
                </label>
                <input
                  type="url"
                  value={profileData.profile_data.socialLinks?.twitter || ''}
                  onChange={(_e) => handleInputChange('twitter', e.target.value, 'socialLinks')}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="https://twitter.com/yourusername"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn
                </label>
                <input
                  type="url"
                  value={profileData.profile_data.socialLinks?.linkedin || ''}
                  onChange={(_e) => handleInputChange('linkedin', e.target.value, 'socialLinks')}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="https://linkedin.com/in/yourusername"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram
                </label>
                <input
                  type="url"
                  value={profileData.profile_data.socialLinks?.instagram || ''}
                  onChange={(_e) => handleInputChange('instagram', e.target.value, 'socialLinks')}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="https://instagram.com/yourusername"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TikTok
                </label>
                <input
                  type="url"
                  value={profileData.profile_data.socialLinks?.tiktok || ''}
                  onChange={(_e) => handleInputChange('tiktok', e.target.value, 'socialLinks')}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="https://tiktok.com/@yourusername"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Member since</span>
                <span className="text-sm font-medium">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">AI Preference</span>
                <span className="text-sm font-medium">Level {user.ai_preference_level}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Role</span>
                <span className="text-sm font-medium capitalize">{user.role}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors">
                <Bell className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Notification Settings</span>
              </button>
              <button className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Privacy Settings</span>
              </button>
              <button className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors">
                <Key className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Change Password</span>
              </button>
              <button className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors">
                <Settings className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Account Settings</span>
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={profileData.profile_data.preferences?.notifications || false}
                  onChange={(_e) => handleInputChange('notifications', e.target.checked.toString(), 'preferences')}
                  disabled={!isEditing}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Email notifications</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={profileData.profile_data.preferences?.publicProfile || false}
                  onChange={(_e) => handleInputChange('publicProfile', e.target.checked.toString(), 'preferences')}
                  disabled={!isEditing}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Public profile</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={profileData.profile_data.preferences?.emailMarketing || false}
                  onChange={(_e) => handleInputChange('emailMarketing', e.target.checked.toString(), 'preferences')}
                  disabled={!isEditing}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Marketing emails</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;