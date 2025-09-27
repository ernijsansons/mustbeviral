// Collaboration Hub - Real-time editing interface with user presence and version control
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Edit3, MessageCircle, History, Share2, Eye,
  UserPlus, MoreVertical, CheckCircle, Clock, AlertCircle,
  Download, Upload, Copy, Trash2, Lock, Unlock, GitBranch
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';

// Enhanced TypeScript interfaces
export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'online' | 'away' | 'offline';
  lastSeen?: Date;
  cursor?: CursorPosition;
  selection?: TextSelection;
  color: string;
  isTyping?: boolean;
  currentSection?: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
}

export interface TextSelection {
  start: number;
  end: number;
  text: string;
  elementId: string;
}

export interface Comment {
  id: string;
  author: Collaborator;
  content: string;
  timestamp: Date;
  resolved: boolean;
  replies: Comment[];
  position?: { x: number; y: number };
  elementId?: string;
  mentions?: string[];
}

export interface Version {
  id: string;
  timestamp: Date;
  author: Collaborator;
  description: string;
  changes: ChangeItem[];
  isCurrent: boolean;
}

export interface ChangeItem {
  type: 'added' | 'removed' | 'modified';
  section: string;
  description: string;
  lineNumber?: number;
}

export interface Activity {
  id: string;
  type: 'edit' | 'comment' | 'join' | 'leave' | 'save' | 'version' | 'share';
  collaborator: Collaborator;
  timestamp: Date;
  content?: string;
  metadata?: Record<string, any>;
}

export interface CollaborationHubProps {
  collaborators: Collaborator[];
  comments: Comment[];
  versions: Version[];
  activities: Activity[];
  currentUser: Collaborator;
  onInviteUser?: (email: string, role: Collaborator['role']) => Promise<void>;
  onUpdateRole?: (userId: string, role: Collaborator['role']) => Promise<void>;
  onAddComment?: (content: string, position?: Comment['position'], mentions?: string[]) => Promise<void>;
  onResolveComment?: (commentId: string) => Promise<void>;
  onReplyToComment?: (commentId: string, content: string) => Promise<void>;
  onCreateVersion?: (description: string) => Promise<void>;
  onRestoreVersion?: (versionId: string) => Promise<void>;
  onRemoveUser?: (userId: string) => Promise<void>;
  className?: string;
  maxUsers?: number;
  enableVersionControl?: boolean;
  enableComments?: boolean;
}

const rolePermissions = {
  owner: ['read', 'write', 'admin', 'delete'],
  admin: ['read', 'write', 'admin'],
  editor: ['read', 'write'],
  viewer: ['read']
};

const roleColors = {
  owner: 'text-purple-600 bg-purple-100 border-purple-200',
  admin: 'text-blue-600 bg-blue-100 border-blue-200',
  editor: 'text-green-600 bg-green-100 border-green-200',
  viewer: 'text-gray-600 bg-gray-100 border-gray-200'
};

export const CollaborationHub: React.FC<CollaborationHubProps> = ({
  collaborators,
  comments,
  versions,
  activities,
  currentUser,
  onInviteUser,
  onUpdateRole,
  onAddComment,
  onResolveComment,
  onReplyToComment,
  onCreateVersion,
  onRestoreVersion,
  onRemoveUser,
  className,
  maxUsers = 10,
  enableVersionControl = true,
  enableComments = true
}) => {
  const [activeTab, setActiveTab] = useState<'presence' | 'comments' | 'versions' | 'activity'>('presence');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Collaborator['role']>('editor');
  const [newComment, setNewComment] = useState('');
  const [versionDescription, setVersionDescription] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Get online collaborators
  const onlineCollaborators = collaborators.filter(c => c.status === 'online');
  const isNearCapacity = onlineCollaborators.length >= maxUsers * 0.8;

  // Handle invite user
  const handleInviteUser = useCallback(async () => {
    if (!onInviteUser || !inviteEmail.trim()) return;

    setIsLoading(true);
    try {
      await onInviteUser(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (error) {
      console.error('Failed to invite user:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onInviteUser, inviteEmail, inviteRole]);

  // Handle add comment
  const handleAddComment = useCallback(async () => {
    if (!onAddComment || !newComment.trim()) return;

    setIsLoading(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onAddComment, newComment]);

  // Handle create version
  const handleCreateVersion = useCallback(async () => {
    if (!onCreateVersion || !versionDescription.trim()) return;

    setIsLoading(true);
    try {
      await onCreateVersion(versionDescription.trim());
      setVersionDescription('');
    } catch (error) {
      console.error('Failed to create version:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onCreateVersion, versionDescription]);

  // Format timestamp
  const formatTimestamp = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }, []);

  // Get activity icon
  const getActivityIcon = useCallback((type: Activity['type']) => {
    switch (type) {
      case 'edit': return Edit3;
      case 'comment': return MessageCircle;
      case 'join': return UserPlus;
      case 'leave': return Users;
      case 'save': return CheckCircle;
      case 'version': return GitBranch;
      case 'share': return Share2;
      default: return Clock;
    }
  }, []);

  // Can perform action
  const canPerformAction = useCallback((action: string) => {
    return rolePermissions[currentUser.role]?.includes(action) || false;
  }, [currentUser.role]);

  return (
    <Card className={cn('h-full flex flex-col', className)} variant="outline">
      <CardHeader className="pb-4">
        <CardTitle level={4} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            Collaboration
            {isNearCapacity && (
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                Near Capacity ({onlineCollaborators.length}/{maxUsers})
              </span>
            )}
          </div>

          {/* User Avatars */}
          <div className="flex items-center gap-1">
            {onlineCollaborators.slice(0, 3).map((collaborator) => (
              <motion.div
                key={collaborator.id}
                className="relative"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
              >
                <div
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden"
                  style={{ borderColor: collaborator.color }}
                  title={`${collaborator.name} (${collaborator.role})`}
                >
                  {collaborator.avatar ? (
                    <img
                      src={collaborator.avatar}
                      alt={collaborator.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-xs text-white font-medium"
                      style={{ backgroundColor: collaborator.color }}
                    >
                      {collaborator.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Typing indicator */}
                {collaborator.isTyping && (
                  <motion.div
                    className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                )}

                {/* Status indicator */}
                <div className={cn(
                  'absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white rounded-full',
                  collaborator.status === 'online' ? 'bg-green-500' :
                  collaborator.status === 'away' ? 'bg-yellow-500' :
                  'bg-gray-400'
                )} />
              </motion.div>
            ))}
            {onlineCollaborators.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center text-xs font-medium">
                +{onlineCollaborators.length - 3}
              </div>
            )}
          </div>
        </CardTitle>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'presence', label: 'Team', count: onlineCollaborators.length, icon: Users },
            { id: 'comments', label: 'Comments', count: comments.filter(c => !c.resolved).length, icon: MessageCircle },
            ...(enableVersionControl ? [{ id: 'versions', label: 'Versions', count: versions.length, icon: GitBranch }] : []),
            { id: 'activity', label: 'Activity', count: activities.length, icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex-1 py-2 px-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                )}
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count > 0 && (
                  <span className={cn(
                    'px-2 py-0.5 text-xs rounded-full',
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-100 text-gray-600'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        {/* Team/Presence Tab */}
        {activeTab === 'presence' && (
          <div className="p-4 space-y-4 h-full overflow-y-auto">
            {/* Invite Section */}
            {canPerformAction('admin') && (
              <div className="space-y-3">
                {!showInviteForm ? (
                  <Button
                    onClick={() => setShowInviteForm(true)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    leftIcon={<UserPlus className="w-4 h-4" />}
                  >
                    Invite Team Member
                  </Button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2 p-3 border border-gray-200 rounded-lg"
                  >
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      size="sm"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as Collaborator['role'])}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleInviteUser}
                        loading={isLoading}
                        size="sm"
                        className="flex-1"
                      >
                        Send Invite
                      </Button>
                      <Button
                        onClick={() => setShowInviteForm(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Online Users */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Online ({onlineCollaborators.length})
              </h5>

              {onlineCollaborators.map((collaborator) => (
                <motion.div
                  key={collaborator.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden border-2"
                      style={{ borderColor: collaborator.color }}
                    >
                      {collaborator.avatar ? (
                        <img
                          src={collaborator.avatar}
                          alt={collaborator.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-sm text-white font-medium"
                          style={{ backgroundColor: collaborator.color }}
                        >
                          {collaborator.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {collaborator.name}
                        {collaborator.id === currentUser.id && ' (You)'}
                      </span>
                      <span className={cn(
                        'px-2 py-0.5 text-xs rounded-full font-medium border',
                        roleColors[collaborator.role]
                      )}>
                        {collaborator.role}
                      </span>
                    </div>
                    {collaborator.currentSection && (
                      <div className="text-xs text-gray-500 truncate">
                        Working on: {collaborator.currentSection}
                      </div>
                    )}
                    {collaborator.isTyping && (
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <div className="flex gap-0.5">
                          <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" />
                          <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                        Typing...
                      </div>
                    )}
                  </div>

                  {canPerformAction('admin') && collaborator.id !== currentUser.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Offline Users */}
            {collaborators.filter(c => c.status !== 'online').length > 0 && (
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-gray-900">
                  Offline ({collaborators.filter(c => c.status !== 'online').length})
                </h5>
                {collaborators.filter(c => c.status !== 'online').map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center gap-3 p-2 rounded-lg opacity-60">
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300"
                    >
                      {collaborator.avatar ? (
                        <img
                          src={collaborator.avatar}
                          alt={collaborator.name}
                          className="w-full h-full object-cover grayscale"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm text-white font-medium bg-gray-400">
                          {collaborator.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600 truncate">
                          {collaborator.name}
                        </span>
                        <span className={cn(
                          'px-2 py-0.5 text-xs rounded-full font-medium border',
                          roleColors[collaborator.role]
                        )}>
                          {collaborator.role}
                        </span>
                      </div>
                      {collaborator.lastSeen && (
                        <div className="text-xs text-gray-500">
                          Last seen {formatTimestamp(collaborator.lastSeen)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && enableComments && (
          <div className="p-4 h-full overflow-y-auto space-y-4">
            {/* Add Comment Form */}
            <div className="space-y-2">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <Button
                onClick={handleAddComment}
                loading={isLoading}
                disabled={!newComment.trim()}
                size="sm"
                leftIcon={<MessageCircle className="w-4 h-4" />}
              >
                Add Comment
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No comments yet</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'p-3 rounded-lg border',
                      comment.resolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: comment.author.color }}
                      >
                        {comment.author.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{comment.author.name}</span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(comment.timestamp)}
                          </span>
                          {comment.resolved && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>

                        <div className={cn(
                          'text-sm',
                          comment.resolved ? 'text-gray-600' : 'text-gray-900'
                        )}>
                          {comment.content}
                        </div>

                        {/* Comment Actions */}
                        {!comment.resolved && onResolveComment && (
                          <div className="mt-2">
                            <Button
                              onClick={() => onResolveComment(comment.id)}
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                            >
                              Mark as Resolved
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Versions Tab */}
        {activeTab === 'versions' && enableVersionControl && (
          <div className="p-4 h-full overflow-y-auto space-y-4">
            {/* Create Version */}
            {canPerformAction('write') && (
              <div className="space-y-2">
                <Input
                  placeholder="Version description..."
                  value={versionDescription}
                  onChange={(e) => setVersionDescription(e.target.value)}
                />
                <Button
                  onClick={handleCreateVersion}
                  loading={isLoading}
                  disabled={!versionDescription.trim()}
                  size="sm"
                  leftIcon={<GitBranch className="w-4 h-4" />}
                >
                  Create Version
                </Button>
              </div>
            )}

            {/* Versions List */}
            <div className="space-y-3">
              {versions.map((version) => (
                <motion.div
                  key={version.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'p-3 rounded-lg border',
                    version.isCurrent ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <GitBranch className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">{version.description}</span>
                        {version.isCurrent && (
                          <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        By {version.author.name} • {formatTimestamp(version.timestamp)}
                      </div>
                      <div className="space-y-1">
                        {version.changes.slice(0, 3).map((change, index) => (
                          <div key={index} className="text-xs flex items-center gap-2">
                            <span className={cn(
                              'w-2 h-2 rounded-full',
                              change.type === 'added' ? 'bg-green-500' :
                              change.type === 'removed' ? 'bg-red-500' :
                              'bg-blue-500'
                            )} />
                            <span className="text-gray-600">{change.description}</span>
                          </div>
                        ))}
                        {version.changes.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{version.changes.length - 3} more changes
                          </div>
                        )}
                      </div>
                    </div>

                    {!version.isCurrent && canPerformAction('admin') && onRestoreVersion && (
                      <Button
                        onClick={() => onRestoreVersion(version.id)}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div ref={scrollRef} className="p-4 h-full overflow-y-auto">
            <div className="space-y-3">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                activities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                        style={{ backgroundColor: activity.collaborator.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          <span className="font-medium">{activity.collaborator.name}</span>
                          <span className="text-gray-600 ml-1">
                            {activity.type === 'edit' && 'edited content'}
                            {activity.type === 'comment' && 'left a comment'}
                            {activity.type === 'join' && 'joined the session'}
                            {activity.type === 'leave' && 'left the session'}
                            {activity.type === 'save' && 'saved changes'}
                            {activity.type === 'version' && 'created a version'}
                            {activity.type === 'share' && 'shared the project'}
                          </span>
                        </div>
                        {activity.content && (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            "{activity.content}"
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {formatTimestamp(activity.timestamp)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CollaborationHub;