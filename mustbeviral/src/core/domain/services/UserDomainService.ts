/**
 * User Domain Service
 * Implements complex business logic that doesn't belong in entities
 * Follows Domain-Driven Design principles
 */

import { User, UserRole, UserStatus } from '../entities/User';
import { IUserRepository } from '../repositories/IUserRepository';
import { IPasswordService, IEmailService, IEventPublisher } from '../../interfaces/IPasswordService';

export interface UserRegistrationCommand {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  acceptedTerms: boolean;
  marketingOptIn?: boolean;
  referralCode?: string;
}

export interface UserRegistrationResult {
  user: User;
  verificationToken: string;
  requiresEmailVerification: boolean;
}

export interface UserAuthenticationCommand {
  email: string;
  password: string;
  rememberMe?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserAuthenticationResult {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  requiresMFA?: boolean;
  isLocked?: boolean;
  error?: string;
}

export interface PasswordResetCommand {
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PasswordResetConfirmCommand {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserProfileUpdateCommand {
  userId: string;
  firstName?: string;
  lastName?: string;
  preferences?: any;
  requestedBy: string;
}

export interface UserRoleChangeCommand {
  userId: string;
  newRole: UserRole;
  reason: string;
  changedBy: string;
}

/**
 * Domain Events
 */
export interface UserRegisteredEvent {
  type: 'USER_REGISTERED';
  userId: string;
  email: string;
  role: UserRole;
  timestamp: Date;
  metadata: {
    registrationMethod: string;
    referralCode?: string;
    marketingOptIn: boolean;
  };
}

export interface UserEmailVerifiedEvent {
  type: 'USER_EMAIL_VERIFIED';
  userId: string;
  email: string;
  timestamp: Date;
}

export interface UserAuthenticatedEvent {
  type: 'USER_AUTHENTICATED';
  userId: string;
  email: string;
  timestamp: Date;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    rememberMe: boolean;
  };
}

export interface UserPasswordResetEvent {
  type: 'USER_PASSWORD_RESET_REQUESTED';
  userId: string;
  email: string;
  timestamp: Date;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface UserRoleChangedEvent {
  type: 'USER_ROLE_CHANGED';
  userId: string;
  oldRole: UserRole;
  newRole: UserRole;
  changedBy: string;
  reason: string;
  timestamp: Date;
}

/**
 * User Domain Service Implementation
 */
export class UserDomainService {
  constructor(
    private userRepository: IUserRepository,
    private passwordService: IPasswordService,
    private emailService: IEmailService,
    private eventPublisher: IEventPublisher
  ) {}

  /**
   * Register a new user with complete business logic
   */
  async registerUser(command: UserRegistrationCommand): Promise<UserRegistrationResult> {
    // Validate business rules
    await this.validateUserRegistration(command);

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(command.password);

    // Create user entity
    const user = User.create({
      email: command.email,
      firstName: command.firstName,
      lastName: command.lastName,
      passwordHash,
      role: command.role
    });

    // Persist user
    const savedUser = await this.userRepository.create(user.toPersistence());
    const createdUser = User.fromPersistence(savedUser);

    // Send verification email
    const verificationToken = createdUser.toPersistence().emailVerificationToken!;
    const requiresEmailVerification = await this.sendVerificationEmail(createdUser, verificationToken);

    // Publish domain event
    await this.eventPublisher.publish({
      type: 'USER_REGISTERED',
      userId: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
      timestamp: new Date(),
      metadata: {
        registrationMethod: 'email',
        referralCode: command.referralCode,
        marketingOptIn: command.marketingOptIn || false
      }
    });

    return {
      user: createdUser,
      verificationToken,
      requiresEmailVerification
    };
  }

  /**
   * Authenticate user with comprehensive security checks
   */
  async authenticateUser(command: UserAuthenticationCommand): Promise<UserAuthenticationResult> {
    const user = await this.userRepository.findByEmail(command.email);
    
    if (!user) {
      // Avoid timing attacks by still hashing even if user doesn't exist
      await this.passwordService.hashPassword('dummy_password');
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    const userEntity = User.fromPersistence(user);

    // Check if account is locked
    if (userEntity.isLocked()) {
      return {
        success: false,
        isLocked: true,
        error: 'Account is temporarily locked due to multiple failed login attempts'
      };
    }

    // Check if user can login (active, verified, etc.)
    if (!userEntity.canLogin()) {
      return {
        success: false,
        error: 'Account is not active or not verified'
      };
    }

    // Verify password
    const passwordValid = await this.passwordService.verifyPassword(
      command.password, 
      userEntity.toPersistence().passwordHash
    );

    if (!passwordValid) {
      // Record failed login attempt
      userEntity.recordFailedLogin();
      await this.userRepository.update(userEntity.id, userEntity.toPersistence());

      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    // Record successful login
    userEntity.recordSuccessfulLogin();
    await this.userRepository.update(userEntity.id, userEntity.toPersistence());

    // Generate tokens (would typically use JWT service here)
    const token = await this.generateAccessToken(userEntity);
    const refreshToken = await this.generateRefreshToken(userEntity);

    // Publish authentication event
    await this.eventPublisher.publish({
      type: 'USER_AUTHENTICATED',
      userId: userEntity.id,
      email: userEntity.email,
      timestamp: new Date(),
      metadata: {
        ipAddress: command.ipAddress,
        userAgent: command.userAgent,
        rememberMe: command.rememberMe || false
      }
    });

    return {
      success: true,
      user: userEntity,
      token,
      refreshToken,
      expiresIn: 3600 // 1 hour
    };
  }

  /**
   * Verify user email with token
   */
  async verifyEmail(userId: string, token: string): Promise<void> {
    const userData = await this.userRepository.findById(userId);
    if (!userData) {
      throw new Error('User not found');
    }

    const user = User.fromPersistence(userData);
    user.verifyEmail(token);

    await this.userRepository.update(userId, user.toPersistence());

    // Publish verification event
    await this.eventPublisher.publish({
      type: 'USER_EMAIL_VERIFIED',
      userId: user.id,
      email: user.email,
      timestamp: new Date()
    });
  }

  /**
   * Initiate password reset process
   */
  async initiatePasswordReset(command: PasswordResetCommand): Promise<void> {
    const userData = await this.userRepository.findByEmail(command.email);
    if (!userData) {
      // Don't reveal if email exists or not
      return;
    }

    const user = User.fromPersistence(userData);
    
    if (user.status !== UserStatus.ACTIVE) {
      // Don't allow password reset for inactive accounts
      return;
    }

    const resetToken = user.initiatePasswordReset();
    await this.userRepository.update(user.id, user.toPersistence());

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(user.email, resetToken, user.fullName);

    // Publish password reset event
    await this.eventPublisher.publish({
      type: 'USER_PASSWORD_RESET_REQUESTED',
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
      metadata: {
        ipAddress: command.ipAddress,
        userAgent: command.userAgent
      }
    });
  }

  /**
   * Confirm password reset with new password
   */
  async confirmPasswordReset(command: PasswordResetConfirmCommand): Promise<void> {
    if (command.newPassword !== command.confirmPassword) {
      throw new Error('Passwords do not match');
    }

    this.validatePassword(command.newPassword);

    // Find user by reset token (would need to modify repository)
    const userData = await this.userRepository.findByPasswordResetToken(command.token);
    if (!userData) {
      throw new Error('Invalid or expired password reset token');
    }

    const user = User.fromPersistence(userData);
    const newPasswordHash = await this.passwordService.hashPassword(command.newPassword);
    
    user.resetPassword(command.token, newPasswordHash);
    await this.userRepository.update(user.id, user.toPersistence());
  }

  /**
   * Update user profile with validation
   */
  async updateUserProfile(command: UserProfileUpdateCommand): Promise<User> {
    const userData = await this.userRepository.findById(command.userId);
    if (!userData) {
      throw new Error('User not found');
    }

    const user = User.fromPersistence(userData);

    // Validate permissions (simplified - in real app, check authorization)
    if (command.requestedBy !== command.userId) {
      // Only admins can update other users
      const requester = await this.userRepository.findById(command.requestedBy);
      if (!requester || !User.fromPersistence(requester).hasPermission('update:users')) {
        throw new Error('Insufficient permissions to update user profile');
      }
    }

    user.updateProfile({
      firstName: command.firstName,
      lastName: command.lastName,
      preferences: command.preferences
    });

    const updatedUserData = await this.userRepository.update(user.id, user.toPersistence());
    return User.fromPersistence(updatedUserData);
  }

  /**
   * Change user role (admin function)
   */
  async changeUserRole(command: UserRoleChangeCommand): Promise<void> {
    const userData = await this.userRepository.findById(command.userId);
    if (!userData) {
      throw new Error('User not found');
    }

    const user = User.fromPersistence(userData);
    const oldRole = user.role;

    // Validate that requester has permission to change roles
    const requester = await this.userRepository.findById(command.changedBy);
    if (!requester || !User.fromPersistence(requester).hasPermission('manage:users')) {
      throw new Error('Insufficient permissions to change user role');
    }

    user.changeRole(command.newRole);
    await this.userRepository.update(user.id, user.toPersistence());

    // Publish role change event
    await this.eventPublisher.publish({
      type: 'USER_ROLE_CHANGED',
      userId: user.id,
      oldRole,
      newRole: command.newRole,
      changedBy: command.changedBy,
      reason: command.reason,
      timestamp: new Date()
    });
  }

  /**
   * Get user statistics for admin dashboard
   */
  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByRole: Record<UserRole, number>;
    recentRegistrations: number;
  }> {
    const stats = await this.userRepository.getStatistics();
    return stats;
  }

  // Private helper methods
  private async validateUserRegistration(command: UserRegistrationCommand): Promise<void> {
    if (!command.acceptedTerms) {
      throw new Error('Terms of service must be accepted');
    }

    this.validateEmail(command.email);
    this.validatePassword(command.password);
    this.validateName(command.firstName, 'First name');
    this.validateName(command.lastName, 'Last name');
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter, one uppercase letter, and one number');
    }
  }

  private validateName(name: string, fieldName: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error(`${fieldName} is required`);
    }

    if (name.trim().length < 2) {
      throw new Error(`${fieldName} must be at least 2 characters long`);
    }

    if (!/^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ\s'-]+$/.test(name)) {
      throw new Error(`${fieldName} contains invalid characters`);
    }
  }

  private async sendVerificationEmail(user: User, token: string): Promise<boolean> {
    try {
      await this.emailService.sendVerificationEmail(user.email, token, user.fullName);
      return true;
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return false;
    }
  }

  private async generateAccessToken(user: User): Promise<string> {
    // In a real implementation, this would use a JWT service
    // For now, return a placeholder
    return `access_token_${user.id}_${Date.now()}`;
  }

  private async generateRefreshToken(user: User): Promise<string> {
    // In a real implementation, this would use a JWT service
    // For now, return a placeholder
    return `refresh_token_${user.id}_${Date.now()}`;
  }
}