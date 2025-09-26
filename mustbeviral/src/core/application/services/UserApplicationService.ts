/**
 * User Application Service
 * Orchestrates use cases and coordinates between domain services, repositories, and infrastructure
 * Implements Command Query Responsibility Segregation (CQRS) pattern
 */

import { UserDomainService } from '../../domain/services/UserDomainService';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User, UserRole } from '../../domain/entities/User';
import { ICommandService, IQueryService } from '../../interfaces/IService';

// Command DTOs
export interface RegisterUserCommand {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  acceptedTerms: boolean;
  marketingOptIn?: boolean;
  referralCode?: string;
}

export interface AuthenticateUserCommand {
  email: string;
  password: string;
  rememberMe?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface VerifyEmailCommand {
  userId: string;
  token: string;
}

export interface RequestPasswordResetCommand {
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ResetPasswordCommand {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateUserProfileCommand {
  userId: string;
  firstName?: string;
  lastName?: string;
  preferences?: any;
  requestedBy: string;
}

export interface ChangeUserRoleCommand {
  userId: string;
  newRole: UserRole;
  reason: string;
  changedBy: string;
}

// Query DTOs
export interface GetUserQuery {
  userId: string;
  includeEngagement?: boolean;
  includeLoginHistory?: boolean;
}

export interface GetUserByEmailQuery {
  email: string;
}

export interface SearchUsersQuery {
  criteria: {
    email?: string;
    name?: string;
    role?: UserRole;
    status?: string;
    emailVerified?: boolean;
    hasActiveSubscription?: boolean;
  };
  pagination: {
    page: number;
    limit: number;
  };
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface GetUserStatisticsQuery {
  includeEngagement?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

// Response DTOs
export interface UserRegistrationResponse {
  userId: string;
  email: string;
  requiresEmailVerification: boolean;
  verificationEmailSent: boolean;
}

export interface UserAuthenticationResponse {
  success: boolean;
  user?: UserProfileDto;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  requiresMFA?: boolean;
  error?: string;
}

export interface UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  status: string;
  emailVerified: boolean;
  hasActiveSubscription: boolean;
  lastLoginAt?: Date;
  preferences: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSearchResponse {
  users: UserProfileDto[];
  totalCount: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface UserStatisticsResponse {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  usersByRole: Record<UserRole, number>;
  recentRegistrations: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  engagementMetrics?: {
    averageSessionDuration: number;
    mostActiveUsers: {
      userId: string;
      email: string;
      activityScore: number;
    }[];
  };
}

/**
 * User Application Service - Command Side
 */
export class UserCommandService implements ICommandService<any, any> {
  readonly name = 'UserCommandService';
  readonly version = '1.0.0';

  constructor(
    private userDomainService: UserDomainService,
    private userRepository: IUserRepository
  ) {}

  async isHealthy(): Promise<boolean> {
    try {
      // Check if dependencies are available
      await this.userRepository.exists('health_check');
      return true;
    } catch {
      return false;
    }
  }

  async getMetrics(): Promise<any> {
    return {
      commandsProcessed: 0, // Would be tracked in real implementation
      averageProcessingTime: 0,
      errorRate: 0
    };
  }

  async execute(command: any): Promise<any> {
    const commandType = command.type;

    switch (commandType) {
      case 'REGISTER_USER':
        return this.handleRegisterUser(command.payload);
      case 'AUTHENTICATE_USER':
        return this.handleAuthenticateUser(command.payload);
      case 'VERIFY_EMAIL':
        return this.handleVerifyEmail(command.payload);
      case 'REQUEST_PASSWORD_RESET':
        return this.handleRequestPasswordReset(command.payload);
      case 'RESET_PASSWORD':
        return this.handleResetPassword(command.payload);
      case 'UPDATE_USER_PROFILE':
        return this.handleUpdateUserProfile(command.payload);
      case 'CHANGE_USER_ROLE':
        return this.handleChangeUserRole(command.payload);
      default:
        throw new Error(`Unknown command type: ${commandType}`);
    }
  }

  // Command Handlers
  async handleRegisterUser(command: RegisterUserCommand): Promise<UserRegistrationResponse> {
    const result = await this.userDomainService.registerUser(command);

    return {
      userId: result.user.id,
      email: result.user.email,
      requiresEmailVerification: result.requiresEmailVerification,
      verificationEmailSent: result.requiresEmailVerification
    };
  }

  async handleAuthenticateUser(command: AuthenticateUserCommand): Promise<UserAuthenticationResponse> {
    const result = await this.userDomainService.authenticateUser(command);

    if (!result.success || !result.user) {
      return {
        success: false,
        error: result.error
      };
    }

    return {
      success: true,
      user: this.mapToUserProfileDto(result.user),
      accessToken: result.token,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      requiresMFA: result.requiresMFA
    };
  }

  async handleVerifyEmail(command: VerifyEmailCommand): Promise<void> {
    await this.userDomainService.verifyEmail(command.userId, command.token);
  }

  async handleRequestPasswordReset(command: RequestPasswordResetCommand): Promise<void> {
    await this.userDomainService.initiatePasswordReset(command);
  }

  async handleResetPassword(command: ResetPasswordCommand): Promise<void> {
    await this.userDomainService.confirmPasswordReset(command);
  }

  async handleUpdateUserProfile(command: UpdateUserProfileCommand): Promise<UserProfileDto> {
    const updatedUser = await this.userDomainService.updateUserProfile(command);
    return this.mapToUserProfileDto(updatedUser);
  }

  async handleChangeUserRole(command: ChangeUserRoleCommand): Promise<void> {
    await this.userDomainService.changeUserRole(command);
  }

  // Helper method to map domain entity to DTO
  private mapToUserProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      hasActiveSubscription: user.hasActiveSubscription(),
      lastLoginAt: user.lastLoginAt,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

/**
 * User Application Service - Query Side
 */
export class UserQueryService implements IQueryService<any, any> {
  readonly name = 'UserQueryService';
  readonly version = '1.0.0';

  constructor(private userRepository: IUserRepository) {}

  async isHealthy(): Promise<boolean> {
    try {
      await this.userRepository.exists('health_check');
      return true;
    } catch {
      return false;
    }
  }

  async getMetrics(): Promise<any> {
    return {
      queriesProcessed: 0,
      averageQueryTime: 0,
      cacheHitRate: 0
    };
  }

  async query(query: any): Promise<any> {
    const queryType = query.type;

    switch (queryType) {
      case 'GET_USER':
        return this.handleGetUser(query.payload);
      case 'GET_USER_BY_EMAIL':
        return this.handleGetUserByEmail(query.payload);
      case 'SEARCH_USERS':
        return this.handleSearchUsers(query.payload);
      case 'GET_USER_STATISTICS':
        return this.handleGetUserStatistics(query.payload);
      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }
  }

  // Query Handlers
  async handleGetUser(query: GetUserQuery): Promise<UserProfileDto | null> {
    const userData = await this.userRepository.findById(query.userId);
    if (!userData) {
      return null;
    }

    const user = User.fromPersistence(userData);
    const dto = this.mapToUserProfileDto(user);

    // Add optional data if requested
    if (query.includeEngagement) {
      const engagement = await this.userRepository.getUserEngagementMetrics(query.userId);
      (dto as any).engagementMetrics = engagement;
    }

    if (query.includeLoginHistory) {
      const loginHistory = await this.userRepository.getUserLoginHistory(query.userId, 10);
      (dto as any).loginHistory = loginHistory;
    }

    return dto;
  }

  async handleGetUserByEmail(query: GetUserByEmailQuery): Promise<UserProfileDto | null> {
    const userData = await this.userRepository.findByEmail(query.email);
    if (!userData) {
      return null;
    }

    const user = User.fromPersistence(userData);
    return this.mapToUserProfileDto(user);
  }

  async handleSearchUsers(query: SearchUsersQuery): Promise<UserSearchResponse> {
    const searchResult = await this.userRepository.search({
      filters: query.criteria,
      pagination: query.pagination,
      sorting: query.sorting ? [query.sorting] : undefined
    });

    const users = searchResult.items.map(userData => {
      const user = User.fromPersistence(userData);
      return this.mapToUserProfileDto(user);
    });

    return {
      users,
      totalCount: searchResult.totalCount,
      page: searchResult.page,
      limit: searchResult.limit,
      hasNext: searchResult.hasNext,
      hasPrevious: searchResult.hasPrevious
    };
  }

  async handleGetUserStatistics(query: GetUserStatisticsQuery): Promise<UserStatisticsResponse> {
    const stats = await this.userRepository.getStatistics();

    const response: UserStatisticsResponse = {
      totalUsers: stats.totalUsers,
      activeUsers: stats.activeUsers,
      verifiedUsers: stats.verifiedUsers,
      usersByRole: stats.usersByRole,
      recentRegistrations: stats.recentRegistrations
    };

    if (query.includeEngagement) {
      response.engagementMetrics = {
        averageSessionDuration: stats.averageLoginFrequency,
        mostActiveUsers: stats.topUsersByActivity.map(user => ({
          userId: user.userId,
          email: user.email,
          activityScore: user.loginCount // Simplified activity score
        }))
      };
    }

    return response;
  }

  private mapToUserProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      hasActiveSubscription: user.hasActiveSubscription(),
      lastLoginAt: user.lastLoginAt,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

/**
 * Combined User Application Service
 * Provides a unified interface for both commands and queries
 */
export class UserApplicationService {
  constructor(
    public readonly commands: UserCommandService,
    public readonly queries: UserQueryService
  ) {}

  // Convenience methods that delegate to appropriate services
  async registerUser(command: RegisterUserCommand): Promise<UserRegistrationResponse> {
    return this.commands.handleRegisterUser(command);
  }

  async authenticateUser(command: AuthenticateUserCommand): Promise<UserAuthenticationResponse> {
    return this.commands.handleAuthenticateUser(command);
  }

  async getUser(userId: string, options?: { includeEngagement?: boolean; includeLoginHistory?: boolean }): Promise<UserProfileDto | null> {
    return this.queries.handleGetUser({ userId, ...options });
  }

  async searchUsers(criteria: any, pagination: { page: number; limit: number }): Promise<UserSearchResponse> {
    return this.queries.handleSearchUsers({ criteria, pagination });
  }

  async getUserStatistics(options?: { includeEngagement?: boolean }): Promise<UserStatisticsResponse> {
    return this.queries.handleGetUserStatistics(options || {});
  }
}