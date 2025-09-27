// Content Preview Component
import React, { useState } from 'react';
import { X, Edit, Copy, Share, Eye, EyeOff, Twitter, Linkedin, Instagram, Facebook, FileText} from 'lucide-react';

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

interface ContentPreviewProps {
  content: ContentItem;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (content: ContentItem) => void;
  onStatusChange?: (contentId: string, newStatus: string) => void;
}

const platformIcons = {
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
  default: FileText,
};

const platformColors = {
  twitter: 'bg-blue-500',
  linkedin: 'bg-blue-700',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
  facebook: 'bg-blue-600',
  default: 'bg-gray-500',
};

export function ContentPreview({ content, isOpen, onClose, onEdit, onStatusChange }: ContentPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  if (!isOpen) {
    return null;
  }

  const PlatformIcon = platformIcons[content.platform as keyof typeof platformIcons]  ?? platformIcons.default;
  const platformColor = platformColors[content.platform as keyof typeof platformColors]  ?? platformColors.default;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content.body);
    // Could add a toast notification here
  };

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(content.id, newStatus);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg text-white ${platformColor}`}>
                <PlatformIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{content.title}</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span className="capitalize">{content.platform}</span>
                  <span>•</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    content.status === 'published'
                      ? 'bg-green-100 text-green-800'
                      : content.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {content.status}
                  </span>
                  {content.generatedByAi && (
                    <>
                      <span>•</span>
                      <span className="text-blue-600">AI Generated</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-6">
              {/* Platform Preview */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Platform Preview</h3>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </button>
                </div>

                {/* Mock Platform UI */}
                <div className="bg-white rounded-lg border p-4">
                  {content.platform === 'twitter' && (
                    <div className="max-w-md">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-1 mb-1">
                            <span className="font-bold text-sm">Your Brand</span>
                            <span className="text-gray-500 text-sm">@yourbrand</span>
                            <span className="text-gray-500 text-sm">• now</span>
                          </div>
                          <p className={`text-sm ${isExpanded ? '' : 'line-clamp-3'}`}>
                            {content.body}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {content.platform === 'linkedin' && (
                    <div>
                      <div className="flex items-start space-x-3 mb-3">
                        <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                        <div>
                          <div className="font-semibold text-sm">Your Name</div>
                          <div className="text-gray-500 text-xs">Your Title • now</div>
                        </div>
                      </div>
                      <p className={`text-sm ${isExpanded ? '' : 'line-clamp-4'}`}>
                        {content.body}
                      </p>
                    </div>
                  )}

                  {(content.platform === 'instagram' || content.platform === 'facebook') && (
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                        <div>
                          <div className="font-semibold text-sm">yourbrand</div>
                          <div className="text-gray-500 text-xs">now</div>
                        </div>
                      </div>
                      <p className={`text-sm ${isExpanded ? '' : 'line-clamp-4'}`}>
                        {content.body}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Raw Content */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Raw Content</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                    {content.body}
                  </pre>
                </div>
              </div>

              {/* Analytics */}
              {content.metadata && Object.keys(content.metadata).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Analytics & Metadata</h3>
                    <button
                      onClick={() => setShowAnalytics(!showAnalytics)}
                      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showAnalytics ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span>{showAnalytics ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>

                  {showAnalytics && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {content.metadata.optimizationScore && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Virality Score</span>
                          <span className="font-medium">{Math.round(content.metadata.optimizationScore)}/100</span>
                        </div>
                      )}
                      {content.metadata.analysis && (
                        <div>
                          <span className="text-sm text-gray-600 block mb-1">AI Analysis</span>
                          <p className="text-sm text-gray-800">{JSON.stringify(content.metadata.analysis, null, 2)}</p>
                        </div>
                      )}
                      {content.aiModelUsed && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">AI Model</span>
                          <span className="font-medium text-sm">{content.aiModelUsed}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Created</span>
                        <span className="font-medium text-sm">
                          {new Date(content.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <button
                onClick={copyToClipboard}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </button>

              <button className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                <Share className="h-4 w-4" />
                <span>Share</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              {content.status === 'draft' && (
                <button
                  onClick={() => handleStatusChange('published')}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Publish
                </button>
              )}

              {content.status === 'published' && (
                <button
                  onClick={() => handleStatusChange('draft')}
                  className="px-4 py-2 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                >
                  Unpublish
                </button>
              )}

              {onEdit && (
                <button
                  onClick={() => onEdit(content)}
                  className="flex items-center space-x-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContentPreview;