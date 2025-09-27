/**
 * User Repository Interface
 * Defines data access contract for User aggregate
 * Follows Repository Pattern and Interface Segregation Principle
 */

import { IBaseEntity, IRepository, ISearchableRepository, ITransactionalRepository} from '../../interfaces/IRepository';
import { UserProps, UserRole, UserStatus} from '../entities/User';

export interface IUserRepository extends 
  IRepository<UserProps>, 
  ISearchableRepository<UserProps>, 
  ITransactionalRepository<UserProps> {
  
  // User-specific query methods
  findByEmail(email: string): Promise<UserProps | null>;
  findByEmailVerificationToken(token: string): Promise<UserProps | null>;
  findByPasswordResetToken(token: string): Promise<UserProps | null>;
  findByRole(role: UserRole): Promise<UserProps[]>;
  findByStatus(status: UserStatus): Promise<UserProps[]>;
  
  // Complex queries
  findActiveUsersWithSubscriptions(): Promise<UserProps[]>;
  findUsersWithExpiredTokens(): Promise<UserProps[]>;
  findLockedUsers(): Promise<UserProps[]>;
  findUsersRequiringVerification(days: number): Promise<UserProps[]>;
  
  // Batch operations
  updateMultipleUsers(userIds: string[], updates: Partial<UserProps>): Promise<void>;
  deleteInactiveUsers(inactiveDays: number): Promise<number>;
  
  // Statistics and reporting
  getStatistics(): Promise<UserStatistics>;
  getUserEngagementMetrics(userId: string): Promise<UserEngagementMetrics>;
  getUserLoginHistory(userId: string, limit?: number): Promise<LoginHistoryEntry[]>;
  
  // Security-related methods
  recordLoginAttempt(userId: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void>;
  getFailedLoginAttempts(userId: string, timeWindow: number): Promise<number>;
  cleanupExpiredTokens(): Promise<number>;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  suspendedUsers: number;
  usersByRole: Record<UserRole, number>;
  usersByStatus: Record<UserStatus, number>;
  recentRegistrations: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  averageLoginFrequency: number;
  topUsersByActivity: {
    userId: string;
    email: string;
    lastLoginAt: Date;
    loginCount: number;
  }[];
}

export interface UserEngagementMetrics {
  userId: string;
  loginCount: number;
  lastLoginAt: Date | null;
  averageSessionDuration: number;
  contentCreated: number;
  campaignsCreated: number;
  totalEngagement: number;
  registrationDate: Date;
  daysSinceRegistration: number;
  activityScore: number;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  loginAt: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  sessionDuration?: number;
}

// Extended search criteria for users
export interface UserSearchCriteria {
  email?: string;
  name?: string;
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  hasActiveSubscription?: boolean;
  registeredAfter?: Date;
  registeredBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  loginAttemptsGreaterThan?: number;
  isLocked?: boolean;
}

// User aggregate with computed fields
export interface UserAggregate extends UserProps {
  // Computed fields
  isLocked: boolean;
  hasActiveSubscription: boolean;
  daysSinceRegistration: number;
  daysSinceLastLogin: number | null;
  
  // Related data
  loginHistory?: LoginHistoryEntry[];
  engagementMetrics?: UserEngagementMetrics;
  contentCount?: number;
  campaignCount?: number;
}