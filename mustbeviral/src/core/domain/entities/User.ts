/**
 * User Domain Entity - Domain-Driven Design
 * Encapsulates user business logic and invariants
 */

import { IBaseEntity } from '../../interfaces/IRepository';

export interface UserProps {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  preferences: UserPreferences;
  subscription?: UserSubscription;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  USER = 'user',
  CREATOR = 'creator',
  BRAND_MANAGER = 'brand_manager',
  AGENCY = 'agency',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  PENDING_VERIFICATION = 'pending_verification'
}

export interface UserPreferences {
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationPreferences;
  content: ContentPreferences;
  privacy: PrivacyPreferences;
}

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    campaigns: boolean;
    analytics: boolean;
    system: boolean;
    marketing: boolean;
  };
  push: {
    enabled: boolean;
    realTime: boolean;
    daily: boolean;
    weekly: boolean;
  };
  sms: {
    enabled: boolean;
    urgent: boolean;
  };
}

export interface ContentPreferences {
  defaultTone: string;
  preferredPlatforms: string[];
  autoOptimize: boolean;
  brandVoice: string;
  contentCategories: string[];
}

export interface PrivacyPreferences {
  profileVisibility: 'public' | 'private' | 'connections_only';
  dataSharing: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface UserSubscription {
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

/**
 * User Domain Entity
 * Rich domain model with business logic encapsulation
 */
export class User implements IBaseEntity {
  private constructor(private props: UserProps) {
    this.validateInvariants();
  }

  // Factory Methods
  static create(data: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    role?: UserRole;
  }): User {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const userProps: UserProps = {
      id,
      email: data.email.toLowerCase().trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      passwordHash: data.passwordHash,
      role: data.role || UserRole.USER,
      status: UserStatus.PENDING_VERIFICATION,
      emailVerified: false,
      emailVerificationToken: crypto.randomUUID(),
      loginAttempts: 0,
      preferences: User.createDefaultPreferences(),
      createdAt: now,
      updatedAt: now
    };

    return new User(userProps);
  }

  static fromPersistence(data: UserProps): User {
    return new User(data);
  }

  // Getters
  get id(): string { return this.props.id; }
  get email(): string { return this.props.email; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`.trim(); }
  get role(): UserRole { return this.props.role; }
  get status(): UserStatus { return this.props.status; }
  get emailVerified(): boolean { return this.props.emailVerified; }
  get lastLoginAt(): Date | undefined { return this.props.lastLoginAt; }
  get preferences(): UserPreferences { return { ...this.props.preferences }; }
  get subscription(): UserSubscription | undefined { 
    return this.props.subscription ? { ...this.props.subscription } : undefined; 
  }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // Business Logic Methods
  verifyEmail(token: string): void {
    if (!this.props.emailVerificationToken) {
      throw new Error('No verification token found');
    }

    if (this.props.emailVerificationToken !== token) {
      throw new Error('Invalid verification token');
    }

    if (this.props.emailVerified) {
      throw new Error('Email already verified');
    }

    this.props.emailVerified = true;
    this.props.emailVerificationToken = undefined;
    this.props.status = UserStatus.ACTIVE;
    this.updateTimestamp();
  }

  initiatePasswordReset(): string {
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    this.props.passwordResetToken = resetToken;
    this.props.passwordResetExpires = expiresAt;
    this.updateTimestamp();

    return resetToken;
  }

  resetPassword(token: string, newPasswordHash: string): void {
    if (!this.props.passwordResetToken || this.props.passwordResetToken !== token) {
      throw new Error('Invalid password reset token');
    }

    if (!this.props.passwordResetExpires || this.props.passwordResetExpires < new Date()) {
      throw new Error('Password reset token has expired');
    }

    this.props.passwordHash = newPasswordHash;
    this.props.passwordResetToken = undefined;
    this.props.passwordResetExpires = undefined;
    this.props.loginAttempts = 0; // Reset login attempts
    this.props.lockedUntil = undefined; // Unlock account if locked
    this.updateTimestamp();
  }

  recordSuccessfulLogin(): void {
    this.props.lastLoginAt = new Date();
    this.props.loginAttempts = 0;
    this.props.lockedUntil = undefined;
    this.updateTimestamp();
  }

  recordFailedLogin(): void {
    this.props.loginAttempts += 1;

    // Lock account after 5 failed attempts for 30 minutes
    if (this.props.loginAttempts >= 5) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 30);
      this.props.lockedUntil = lockUntil;
    }

    this.updateTimestamp();
  }

  isLocked(): boolean {
    return this.props.lockedUntil ? this.props.lockedUntil > new Date() : false;
  }

  canLogin(): boolean {
    return this.props.status === UserStatus.ACTIVE && 
           this.props.emailVerified && 
           !this.isLocked();
  }

  updateProfile(updates: {
    firstName?: string;
    lastName?: string;
    preferences?: Partial<UserPreferences>;
  }): void {
    if (updates.firstName) {
      this.props.firstName = updates.firstName.trim();
    }

    if (updates.lastName) {
      this.props.lastName = updates.lastName.trim();
    }

    if (updates.preferences) {
      this.props.preferences = {
        ...this.props.preferences,
        ...updates.preferences
      };
    }

    this.updateTimestamp();
  }

  changeRole(newRole: UserRole): void {
    if (this.props.role === newRole) {
      throw new Error('User already has this role');
    }

    this.props.role = newRole;
    this.updateTimestamp();
  }

  suspend(reason?: string): void {
    if (this.props.status === UserStatus.SUSPENDED) {
      throw new Error('User is already suspended');
    }

    this.props.status = UserStatus.SUSPENDED;
    this.updateTimestamp();
  }

  reactivate(): void {
    if (this.props.status !== UserStatus.SUSPENDED) {
      throw new Error('User is not suspended');
    }

    this.props.status = UserStatus.ACTIVE;
    this.updateTimestamp();
  }

  hasPermission(permission: string): boolean {
    const rolePermissions: Record<UserRole, string[]> = {
      [UserRole.USER]: ['read:own_content', 'create:own_content'],
      [UserRole.CREATOR]: ['read:own_content', 'create:own_content', 'publish:content', 'analytics:basic'],
      [UserRole.BRAND_MANAGER]: ['read:brand_content', 'create:brand_content', 'manage:campaigns', 'analytics:advanced'],
      [UserRole.AGENCY]: ['read:client_content', 'create:client_content', 'manage:client_campaigns', 'analytics:full'],
      [UserRole.ADMIN]: ['read:all', 'create:all', 'update:all', 'delete:all', 'manage:users'],
      [UserRole.SUPER_ADMIN]: ['*']
    };

    const permissions = rolePermissions[this.props.role] || [];
    return permissions.includes('*') || permissions.includes(permission);
  }

  hasActiveSubscription(): boolean {
    return this.props.subscription?.status === 'active' && 
           this.props.subscription.currentPeriodEnd > new Date();
  }

  updateSubscription(subscription: UserSubscription): void {
    this.props.subscription = subscription;
    this.updateTimestamp();
  }

  cancelSubscription(): void {
    if (!this.props.subscription) {
      throw new Error('No active subscription to cancel');
    }

    this.props.subscription.cancelAtPeriodEnd = true;
    this.updateTimestamp();
  }

  // Serialization
  toPersistence(): UserProps {
    return { ...this.props };
  }

  toPublicJSON(): {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    emailVerified: boolean;
    lastLoginAt?: Date;
    preferences: UserPreferences;
    hasActiveSubscription: boolean;
    createdAt: Date;
  } {
    return {
      id: this.props.id,
      email: this.props.email,
      firstName: this.props.firstName,
      lastName: this.props.lastName,
      role: this.props.role,
      status: this.props.status,
      emailVerified: this.props.emailVerified,
      lastLoginAt: this.props.lastLoginAt,
      preferences: { ...this.props.preferences },
      hasActiveSubscription: this.hasActiveSubscription(),
      createdAt: this.props.createdAt
    };
  }

  // Private Methods
  private validateInvariants(): void {
    if (!this.props.email || !this.isValidEmail(this.props.email)) {
      throw new Error('Invalid email address');
    }

    if (!this.props.firstName || this.props.firstName.trim().length === 0) {
      throw new Error('First name is required');
    }

    if (!this.props.lastName || this.props.lastName.trim().length === 0) {
      throw new Error('Last name is required');
    }

    if (!this.props.passwordHash || this.props.passwordHash.length === 0) {
      throw new Error('Password hash is required');
    }

    if (this.props.loginAttempts < 0) {
      throw new Error('Login attempts cannot be negative');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private updateTimestamp(): void {
    this.props.updatedAt = new Date();
  }

  private static createDefaultPreferences(): UserPreferences {
    return {
      timezone: 'UTC',
      language: 'en',
      theme: 'light',
      notifications: {
        email: {
          enabled: true,
          campaigns: true,
          analytics: true,
          system: true,
          marketing: false
        },
        push: {
          enabled: true,
          realTime: false,
          daily: true,
          weekly: true
        },
        sms: {
          enabled: false,
          urgent: false
        }
      },
      content: {
        defaultTone: 'professional',
        preferredPlatforms: [],
        autoOptimize: true,
        brandVoice: 'default',
        contentCategories: []
      },
      privacy: {
        profileVisibility: 'private',
        dataSharing: false,
        analytics: true,
        marketing: false
      }
    };
  }
}