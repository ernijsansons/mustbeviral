// Content Generator Component
import React, { useState } from 'react';
import { _Bot, FileText, Send, Loader2, Twitter, Linkedin, Instagram, Facebook, Eye } from 'lucide-react';
import { ContentPreview } from './ContentPreview';

interface ContentRequest {
  title?: string;
  topic: string;
  platforms: string[];
  tone?: string;
  targetAudience?: string;
  contentType: 'news_article' | 'social_post' | 'blog_post';
  aiAssisted?: boolean;
}

interface ContentItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  platform: string;
  status: 'draft' | 'published' | 'pending_review';
  generatedByAi: boolean;
  aiModelUsed?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const platformIcons = {
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
};

const toneOptions = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'inspiring', label: 'Inspiring' },
  { value: 'urgent', label: 'Urgent' },
];

const audienceOptions = [
  { value: 'general', label: 'General Audience' },
  { value: 'professionals', label: 'Professionals' },
  { value: 'entrepreneurs', label: 'Entrepreneurs' },
  { value: 'students', label: 'Students' },
  { value: 'millennials', label: 'Millennials' },
  { value: 'gen-z', label: 'Gen Z' },
];

const contentTypeOptions = [
  { value: 'social_post', label: 'Social Media Post' },
  { value: 'blog_post', label: 'Blog Post' },
  { value: 'news_article', label: 'News Article' },
];

export function ContentGenerator() {
  const [formData, setFormData] = useState<ContentRequest>({
    topic: '',
    platforms: [],
    tone: 'professional',
    targetAudience: 'general',
    contentType: 'social_post',
    aiAssisted: true,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<ContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<ContentItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const platforms = [
    { id: 'twitter', name: 'Twitter', icon: Twitter },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
    { id: 'instagram', name: 'Instagram', icon: Instagram },
    { id: 'facebook', name: 'Facebook', icon: Facebook },
  ];

  const handlePlatformToggle = (platformId: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic || formData.platforms.length === 0) {
      setError('Please provide a topic and select at least one platform');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://localhost:8787/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate content');
      }

      const result = await response.json();
      setGeneratedContent(result.content);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = (content: ContentItem) => {
    setPreviewContent(content);
    setShowPreview(true);
  };

  const handleStatusChange = async (contentId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`http://localhost:8787/api/content/${contentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update local state
        setGeneratedContent(prev =>
          prev.map(item =>
            item.id === contentId ? { ...item, status: newStatus as unknown } : item
          )
        );
        if (previewContent?.id === contentId) {
          setPreviewContent(prev => prev ? { ...prev, status: newStatus as unknown } : null);
        }
      }
    } catch (err: unknown) {
      console.error('Failed to update content status:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bot className="h-6 w-6 text-blue-600" />
          AI Content Generator
        </h2>
        <p className="text-gray-600 mt-1">Generate viral content for your social media platforms</p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-6">
        {/* Topic Input */}
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
            Content Topic
          </label>
          <input
            type="text"
            id="topic"
            value={formData.topic}
            onChange={(_e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
            placeholder="e.g., Top 5 productivity tips for remote workers"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Title Input (Optional) */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Custom Title (Optional)
          </label>
          <input
            type="text"
            id="title"
            value={formData.title || ''}
            onChange={(_e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Leave empty for AI-generated title"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Platform Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Platforms
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {platforms.map((_platform) => {
              const Icon = platform.icon;
              const isSelected = formData.platforms.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => handlePlatformToggle(platform.id)}
                  className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{platform.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Type */}
        <div>
          <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-2">
            Content Type
          </label>
          <select
            id="contentType"
            value={formData.contentType}
            onChange={(_e) => setFormData(prev => ({ ...prev, contentType: e.target.value as unknown }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {contentTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tone Selection */}
        <div>
          <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-2">
            Tone
          </label>
          <select
            id="tone"
            value={formData.tone}
            onChange={(_e) => setFormData(prev => ({ ...prev, tone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {toneOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Target Audience */}
        <div>
          <label htmlFor="audience" className="block text-sm font-medium text-gray-700 mb-2">
            Target Audience
          </label>
          <select
            id="audience"
            value={formData.targetAudience}
            onChange={(_e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {audienceOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating || !formData.topic || formData.platforms.length === 0}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Content...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Generate Content
            </>
          )}
        </button>
      </form>

      {/* Generated Content Results */}
      {generatedContent.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Generated Content</h3>
          {generatedContent.map((_content) => {
            const PlatformIcon = platformIcons[content.platform as keyof typeof platformIcons] || FileText;
            return (
              <div key={content.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PlatformIcon className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">{content.platform}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      content.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      content.status === 'published' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {content.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreview(content)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                    >
                      <Eye className="h-3 w-3" />
                      Preview
                    </button>
                    <span className="text-sm text-gray-500">
                      {new Date(content.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">{content.title}</h4>
                <p className="text-gray-700 whitespace-pre-wrap line-clamp-3">{content.body}</p>
                {content.metadata.optimizationScore && (
                  <div className="mt-3 text-sm text-gray-600">
                    Virality Score: {Math.round(content.metadata.optimizationScore)}/100
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Content Preview Modal */}
      {previewContent && (
        <ContentPreview
          content={previewContent}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

export default ContentGenerator;