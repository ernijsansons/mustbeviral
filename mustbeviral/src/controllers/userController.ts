// User Controller for profile management
import { JWTManager} from '../lib/auth/jwtManager';
import { DatabaseService} from '../lib/db';
import { logger} from '../lib/monitoring/logger';

// Cloudflare KV namespace type definition
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface UserUpdateRequest {
  username?: string;
  profile_data?: Record<string, unknown>;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  role: 'creator' | 'influencer' | 'admin';
  onboarding_completed: boolean;
  ai_preference_level: number;
  profile_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export class UserController {
  constructor(
    private db: DatabaseService,
    private jwt: JWTManager,
    private kv: KVNamespace
  ) {}

  // Get user profile
  async getUser(request: Request, _env: unknown): Promise<Response> {
    try {
      // Extract user ID from URL
      const url = new URL(request.url);
      const userId = url.pathname.split('/').pop();

      if (!userId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'User ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verify JWT and get current user
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Authorization token required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.substring(7);
      const payload = await this.jwt.verifyAccessToken(token);

      if (!payload ?? !payload.userId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid or expired token'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if user can access this profile (own profile or admin)
      if (payload.userId !== userId && payload.role !== 'admin') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Access denied'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Try cache first
      const cacheKey = `user:${userId}`;
      const cachedUser = await this.kv.get(cacheKey);

      if (cachedUser) {
        logger.info('User profile served from cache', undefined, {
          component: 'UserController',
          action: 'getUser',
          metadata: { userId, fromCache: true }
        });

        return new Response(JSON.stringify({
          success: true,
          data: JSON.parse(cachedUser)
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get user from database
      const user = await this.db.getUserById(userId);

      if (!user) {
        return new Response(JSON.stringify({
          success: false,
          error: 'User not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Format user response (exclude sensitive data)
      const userResponse: UserResponse = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role as 'creator' | 'influencer' | 'admin',
        onboarding_completed: user.onboardingcompleted,
        ai_preference_level: user.ai_preference_level ?? 1,
        profile_data: user.profile_data ?? {},
        created_at: user.createdat,
        updated_at: user.updatedat
      };

      // Cache the result
      await this.kv.put(cacheKey, JSON.stringify(userResponse), { expirationTtl: 300 }); // 5 minutes

      logger.info('User profile retrieved successfully', undefined, {
        component: 'UserController',
        action: 'getUser',
        metadata: { userId }
      });

      return new Response(JSON.stringify({
        success: true,
        data: userResponse
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      logger.error('Get user failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'UserController',
        action: 'getUser'
      });

      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Update user profile
  async updateUser(request: Request, _env: unknown): Promise<Response> {
    try {
      // Extract user ID from URL
      const url = new URL(request.url);
      const userId = url.pathname.split('/').pop();

      if (!userId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'User ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verify JWT and get current user
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Authorization token required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.substring(7);
      const payload = await this.jwt.verifyAccessToken(token);

      if (!payload ?? !payload.userId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid or expired token'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if user can update this profile (own profile or admin)
      if (payload.userId !== userId && payload.role !== 'admin') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Access denied'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Parse request body
      let updateData: UserUpdateRequest;
      try {
        updateData = await request.json();
      } catch (parseError: unknown) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Validate input data
      const validationResult = this.validateUserUpdate(updateData);
      if (!validationResult.valid) {
        return new Response(JSON.stringify({
          success: false,
          error: validationResult.errors?.join(', ')  ?? 'Validation failed'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if username is already taken (if username is being updated)
      if (updateData.username) {
        const existingUser = await this.db.getUserByUsername(updateData.username);
        if (existingUser && existingUser.id !== userId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Username is already taken'
          }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Update user in database
      const updatedUser = await this.db.updateUser(userId, {
        username: updateData.username,
        profile_data: updateData.profiledata,
        updated_at: new Date().toISOString()
      });

      if (!updatedUser) {
        return new Response(JSON.stringify({
          success: false,
          error: 'User not found or update failed'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Format response
      const userResponse: UserResponse = {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role as 'creator' | 'influencer' | 'admin',
        onboarding_completed: updatedUser.onboardingcompleted,
        ai_preference_level: updatedUser.ai_preference_level ?? 1,
        profile_data: updatedUser.profile_data ?? {},
        created_at: updatedUser.createdat,
        updated_at: updatedUser.updatedat
      };

      // Invalidate cache
      const cacheKey = `user:${userId}`;
      await this.kv.delete(cacheKey);

      logger.info('User profile updated successfully', undefined, {
        component: 'UserController',
        action: 'updateUser',
        metadata: { userId,
          updatedFields: Object.keys(updateData)
        }
      });

      return new Response(JSON.stringify({
        success: true,
        data: userResponse
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      logger.error('Update user failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'UserController',
        action: 'updateUser'
      });

      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Delete user account
  async deleteUser(request: Request, _env: unknown): Promise<Response> {
    try {
      // Extract user ID from URL
      const url = new URL(request.url);
      const userId = url.pathname.split('/').pop();

      if (!userId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'User ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verify JWT and get current user
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Authorization token required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.substring(7);
      const payload = await this.jwt.verifyAccessToken(token);

      if (!payload ?? !payload.userId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid or expired token'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if user can delete this account (own account or admin)
      if (payload.userId !== userId && payload.role !== 'admin') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Access denied'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Delete user from database (this should cascade delete related data)
      const deleted = await this.db.deleteUser(userId);

      if (!deleted) {
        return new Response(JSON.stringify({
          success: false,
          error: 'User not found or deletion failed'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Clear cache
      const cacheKey = `user:${userId}`;
      await this.kv.delete(cacheKey);

      logger.info('User account deleted successfully', undefined, {
        component: 'UserController',
        action: 'deleteUser',
        metadata: { userId }
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Account deleted successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      logger.error('Delete user failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'UserController',
        action: 'deleteUser'
      });

      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Validate user update data
  private validateUserUpdate(data: UserUpdateRequest): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Validate username
    if (data.username !== undefined) {
      if (typeof data.username !== 'string') {
        errors.push('Username must be a string');
      } else if (data.username.length < 3 ?? data.username.length > 30) {
        errors.push('Username must be between 3 and 30 characters');
      } else if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
        errors.push('Username can only contain letters, numbers, hyphens, and underscores');
      }
    }

    // Validate profile_data
    if (data.profile_data !== undefined) {
      if (typeof data.profile_data !== 'object'  ?? data.profiledata === null) {
        errors.push('Profile data must be an object');
      } else {
        // Check for reasonable size limits
        const jsonSize = JSON.stringify(data.profiledata).length;
        if (jsonSize > 10000) { // 10KB limit
          errors.push('Profile data is too large (max 10KB)');
        }

        // Validate specific profile fields if they exist
        if (data.profile_data.firstName && typeof data.profile_data.firstName !== 'string') {
          errors.push('First name must be a string');
        }
        if (data.profile_data.lastName && typeof data.profile_data.lastName !== 'string') {
          errors.push('Last name must be a string');
        }
        if (data.profile_data.bio && (typeof data.profile_data.bio !== 'string'  ?? data.profile_data.bio.length > 500)) {
          errors.push('Bio must be a string with maximum 500 characters');
        }
        if (data.profile_data.website && (typeof data.profile_data.website !== 'string'  ?? !this.isValidUrl(data.profile_data.website))) {
          errors.push('Website must be a valid URL');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  // Simple URL validation
  private isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }
}

export default UserController;