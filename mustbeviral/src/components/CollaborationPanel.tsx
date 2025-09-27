// Real-time Collaboration Panel with Presence and Editing Indicators
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, MessageCircle, Eye, Edit3, Clock, CheckCircle, AlertCircle, UserPlus} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle} from './ui/Card';
import { Button} from './ui/Button';
import { Input} from './ui/Input';
import { cn} from '../lib/utils';

export interface CollaboratorInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'online' | 'away' | 'offline';
  lastSeen?: Date;
  cursor?: { x: number; y: number; selection?: string };
  color: string; // Hex color for cursor and presence
}

export interface ActivityItem {
  id: string;
  type: 'edit' | 'comment' | 'join' | 'leave' | 'save';
  collaborator: CollaboratorInfo;
  timestamp: Date;
  content?: string;
  location?: string; // Section/element being edited
}

export interface Comment {
  id: string;
  author: CollaboratorInfo;
  content: string;
  timestamp: Date;
  resolved: boolean;
  replies?: Comment[];
  location?: { x: number; y: number; elementId?: string };
}

export interface CollaborationPanelProps {
  collaborators: CollaboratorInfo[];
  activities: ActivityItem[];
  comments: Comment[];
  currentUser: CollaboratorInfo;
  onInviteUser?: (email: string, role: CollaboratorInfo['role']) => Promise<void>;
  onAddComment?: (content: string, location?: Comment['location']) => Promise<void>;
  onResolveComment?: (commentId: string) => Promise<void>;
  onReplyToComment?: (commentId: string, content: string) => Promise<void>;
  maxConcurrentUsers?: number;
  className?: string;
  compact?: boolean;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  collaborators, activities, comments, currentUser, onInviteUser, onAddComment, onResolveComment, onReplyToComment, maxConcurrentUsers = 50, className, compact = false
}) => {
  const [activeTab, setActiveTab] = useState<'presence' | 'activity' | 'comments'>('presence');
  const [newComment, setNewComment] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaboratorInfo['role']>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  
  const activitiesRef = useRef<HTMLDivElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll activities to bottom when new items are added
  useEffect(() => {
    if (activeTab === 'activity' && activitiesRef.current) {
      activitiesRef.current.scrollTop = activitiesRef.current.scrollHeight;
    }
  }, [activities, activeTab]);

  // Get online collaborators
  const onlineCollaborators = collaborators.filter(c => c.status === 'online');
  const isNearCapacity = onlineCollaborators.length >= maxConcurrentUsers * 0.8;

  // Handle invite user
  const handleInviteUser = useCallback(async () => {
    if (!onInviteUser || !inviteEmail.trim()) {return;}

    setIsInviting(true);
    try {
      await onInviteUser(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (error) {
      console.error('Failed to invite user:', error);
    } finally {
      setIsInviting(false);
    }
  }, [onInviteUser, inviteEmail, inviteRole]);

  // Handle add comment
  const handleAddComment = useCallback(async () => {
    if (!onAddComment || !newComment.trim()) {return;}

    setIsAddingComment(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsAddingComment(false);
    }
  }, [onAddComment, newComment]);

  // Format timestamp
  const formatTimestamp = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) {
    return 'Just now';
  }
    if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}m ago`;
  }
    if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}h ago`;
  }
    return date.toLocaleDateString();
  }, []);

  // Get activity icon
  const getActivityIcon = useCallback((type: ActivityItem['type']) => {
    switch (type) {
      case 'edit': return Edit3;
      case 'comment': return MessageCircle;
      case 'join': return UserPlus;
      case 'leave': return Users;
      case 'save': return CheckCircle;
      default: return Clock;
    }
  }, []);

  // Get role color
  const getRoleColor = useCallback((role: CollaboratorInfo['role']) => {
    switch (role) {
      case 'owner': return 'text-purple-600 bg-purple-100';
      case 'admin': return 'text-blue-600 bg-blue-100';
      case 'editor': return 'text-green-600 bg-green-100';
      case 'viewer': return 'text-gray-600 bg-gray-100';
    }
  }, []);

  return (
    <Card className={cn('h-full flex flex-col', className)} variant="outline">
      <CardHeader className={cn('pb-4', compact && 'py-3')}>
        <CardTitle level={4} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Collaboration
            {isNearCapacity && (
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                Near Capacity
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1">
              {onlineCollaborators.slice(0, 3).map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm overflow-hidden"
                  style={{ backgroundColor: collaborator.color }}
                  title={`${collaborator.name} (${collaborator.status})`}
                >
                  {collaborator.avatar ? (
                    <img 
                      src={collaborator.avatar} 
                      alt={collaborator.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-white font-medium">
                      {collaborator.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              {onlineCollaborators.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center text-xs font-medium">
                  +{onlineCollaborators.length - 3}
                </div>
              )}
            </div>
          </div>
        </CardTitle>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'presence', label: 'Team', count: onlineCollaborators.length },
            { id: 'activity', label: 'Activity', count: activities.length },
            { id: 'comments', label: 'Comments', count: comments.filter(c => !c.resolved).length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex-1 py-2 px-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              )}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  'ml-2 px-2 py-0.5 text-xs rounded-full',
                  activeTab === tab.id 
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-gray-100 text-gray-600'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        {/* Presence Tab */}
        {activeTab === 'presence' && (
          <div className="p-4 space-y-4 h-full overflow-y-auto">
            {/* Invite Button */}
            {onInviteUser && (
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
                  <div className="space-y-2 p-3 border border-gray-200 rounded-lg">
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      size="sm"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as CollaboratorInfo['role'])}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleInviteUser}
                        loading={isInviting}
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
                  </div>
                )}
              </div>
            )}

            {/* Online Collaborators */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-900">
                Online ({onlineCollaborators.length})
              </h5>
              {onlineCollaborators.map((collaborator) => (
                <div key={collaborator.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="relative">
                    <div
                      className="w-8 h-8 rounded-full overflow-hidden border-2"
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
                        'px-2 py-0.5 text-xs rounded-full font-medium',
                        getRoleColor(collaborator.role)
                      )}>
                        {collaborator.role}
                      </span>
                    </div>
                    {collaborator.cursor?.selection && (
                      <div className="text-xs text-gray-500 truncate">
                        Editing: {collaborator.cursor.selection}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {collaborator.cursor && (
                      <Eye className="w-3 h-3 text-gray-400" title="Currently viewing" />
                    )}
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: collaborator.color }}
                      title="User color"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Offline Collaborators */}
            {collaborators.filter(c => c.status !== 'online').length > 0 && (
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-gray-900">
                  Offline ({collaborators.filter(c => c.status !== 'online').length})
                </h5>
                {collaborators.filter(c => c.status !== 'online').map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center gap-3 p-2 rounded-lg opacity-60">
                    <div
                      className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-300"
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
                          'px-2 py-0.5 text-xs rounded-full font-medium',
                          getRoleColor(collaborator.role)
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

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div ref={activitiesRef} className="p-4 h-full overflow-y-auto">
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
                    <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                        style={{ backgroundColor: activity.collaborator.color }}
                      >
                        <Icon className="w-3 h-3" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          <span className="font-medium">{activity.collaborator.name}</span>
                          <span className="text-gray-600 ml-1">
                            {activity.type === 'edit' && 'edited'}
                            {activity.type === 'comment' && 'commented on'}
                            {activity.type === 'join' && 'joined the session'}
                            {activity.type === 'leave' && 'left the session'}
                            {activity.type === 'save' && 'saved changes'}
                          </span>
                          {activity.location && (
                            <span className="text-gray-500 ml-1">in {activity.location}</span>
                          )}
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
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div ref={commentsRef} className="p-4 h-full overflow-y-auto">
            {/* Add Comment Form */}
            {onAddComment && (
              <div className="mb-4 space-y-2">
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
                  loading={isAddingComment}
                  disabled={!newComment.trim()}
                  size="sm"
                  leftIcon={<MessageCircle className="w-4 h-4" />}
                >
                  Add Comment
                </Button>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No comments yet</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div 
                    key={comment.id} 
                    className={cn(
                      'p-3 rounded-lg border',
                      comment.resolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
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
                            <CheckCircle className="w-3 h-3 text-green-500" />
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
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};