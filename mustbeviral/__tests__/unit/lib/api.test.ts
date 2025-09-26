/**
 * API Client Tests
 */

// Mock the retry client - must be before imports
jest.mock('../../../src/lib/api/retryClient', () => ({
  retryClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    request: jest.fn()
  }
}));

import { ApiClient, ApiError } from '../../../src/lib/api';
import { retryClient } from '../../../src/lib/api/retryClient';

// Create typed mock for retryClient
const mockRetryClient = retryClient as jest.Mocked<typeof retryClient>;

// Mock auth functions
const mockAuth = {
  getToken: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn()
};

jest.mock('../../../src/lib/auth', () => mockAuth);

describe('ApiClient', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getToken.mockResolvedValue('valid-token');
    apiClient = new ApiClient();
  });

  describe('Authentication', () => {
    it('should include authorization header when token is available', async () => {
      mockRetryClient.get.mockResolvedValue({ data: 'success' });

      await apiClient.get('/users/profile');

      expect(mockRetryClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/users/profile'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      );
    });

    it('should make requests without auth header when token is not available', async () => {
      mockAuth.getToken.mockResolvedValue(null);
      mockRetryClient.get.mockResolvedValue({ data: 'success' });

      await apiClient.get('/public/data');

      expect(mockRetryClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/public/data'),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.unknown(String)
          })
        })
      );
    });

    it('should handle token refresh on 401 responses', async () => {
      const unauthorized = new Error('Unauthorized');
      (unauthorized as unknown).status = 401;

      mockRetryClient.get
        .mockRejectedValueOnce(unauthorized)
        .mockResolvedValueOnce({ data: 'success' });

      mockAuth.refreshToken.mockResolvedValue('new-token');
      mockAuth.getToken
        .mockResolvedValueOnce('expired-token')
        .mockResolvedValueOnce('new-token');

      const result = await apiClient.get('/protected/resource');

      expect(mockAuth.refreshToken).toHaveBeenCalled();
      expect(mockRetryClient.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: 'success' });
    });

    it('should logout user when token refresh fails', async () => {
      const unauthorized = new Error('Unauthorized');
      (unauthorized as unknown).status = 401;

      mockRetryClient.get.mockRejectedValue(unauthorized);
      mockAuth.refreshToken.mockRejectedValue(new Error('Refresh failed'));

      await expect(apiClient.get('/protected/resource')).rejects.toThrow('Unauthorized');
      expect(mockAuth.logout).toHaveBeenCalled();
    });
  });

  describe('HTTP Methods', () => {
    it('should handle GET requests', async () => {
      const mockData = { id: 1, name: 'Test User' };
      mockRetryClient.get.mockResolvedValue(mockData);

      const result = await apiClient.get('/users/1');

      expect(result).toEqual(mockData);
      expect(mockRetryClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.unknown(Object)
      );
    });

    it('should handle POST requests with data', async () => {
      const postData = { name: 'New User', email: 'user@example.com' };
      const mockResponse = { id: 2, ...postData };

      mockRetryClient.post.mockResolvedValue(mockResponse);

      const result = await apiClient.post('/users', postData);

      expect(result).toEqual(mockResponse);
      expect(mockRetryClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        postData,
        expect.unknown(Object)
      );
    });

    it('should handle PUT requests', async () => {
      const updateData = { name: 'Updated User' };
      const mockResponse = { id: 1, name: 'Updated User', email: 'user@example.com' };

      mockRetryClient.put.mockResolvedValue(mockResponse);

      const result = await apiClient.put('/users/1', updateData);

      expect(result).toEqual(mockResponse);
      expect(mockRetryClient.put).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        updateData,
        expect.unknown(Object)
      );
    });

    it('should handle DELETE requests', async () => {
      mockRetryClient.delete.mockResolvedValue({ success: true });

      const result = await apiClient.delete('/users/1');

      expect(result).toEqual({ success: true });
      expect(mockRetryClient.delete).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.unknown(Object)
      );
    });

    it('should handle PATCH requests', async () => {
      const patchData = { status: 'active' };
      const mockResponse = { id: 1, status: 'active' };

      mockRetryClient.patch.mockResolvedValue(mockResponse);

      const result = await apiClient.patch('/users/1/status', patchData);

      expect(result).toEqual(mockResponse);
      expect(mockRetryClient.patch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1/status'),
        patchData,
        expect.unknown(Object)
      );
    });
  });

  describe('Request Configuration', () => {
    it('should apply default headers', async () => {
      mockRetryClient.get.mockResolvedValue({ data: 'success' });

      await apiClient.get('/test');

      expect(mockRetryClient.get).toHaveBeenCalledWith(
        expect.unknown(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          })
        })
      );
    });

    it('should merge custom headers with defaults', async () => {
      mockRetryClient.get.mockResolvedValue({ data: 'success' });

      await apiClient.get('/test', {
        headers: { 'X-Custom-Header': 'custom-value' }
      });

      expect(mockRetryClient.get).toHaveBeenCalledWith(
        expect.unknown(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Custom-Header': 'custom-value'
          })
        })
      );
    });

    it('should allow overriding default headers', async () => {
      mockRetryClient.post.mockResolvedValue({ data: 'success' });

      await apiClient.post('/upload', new FormData(), {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      expect(mockRetryClient.post).toHaveBeenCalledWith(
        expect.unknown(String),
        expect.unknown(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'multipart/form-data'
          })
        })
      );
    });

    it('should construct full URLs with base URL', async () => {
      mockRetryClient.get.mockResolvedValue({ data: 'success' });

      await apiClient.get('/users');

      expect(mockRetryClient.get).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/users$/),
        expect.unknown(Object)
      );
    });

    it('should handle query parameters', async () => {
      mockRetryClient.get.mockResolvedValue({ data: 'success' });

      await apiClient.get('/users', {
        params: { page: 1, limit: 10, search: 'john' }
      });

      expect(mockRetryClient.get).toHaveBeenCalledWith(
        expect.stringMatching(/\/users\?page=1&limit=10&search=john/),
        expect.unknown(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw ApiError for HTTP errors', async () => {
      const httpError = new Error('Bad Request');
      (httpError as unknown).status = 400;
      (httpError as unknown).response = {
        status: 400,
        data: { error: 'Invalid input', details: 'Name is required' }
      };

      mockRetryClient.get.mockRejectedValue(httpError);

      await expect(apiClient.get('/users')).rejects.toThrow(ApiError);

      try {
        await apiClient.get('/users');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).message).toBe('Invalid input');
        expect((error as ApiError).details).toBe('Name is required');
      }
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockRetryClient.get.mockRejectedValue(networkError);

      await expect(apiClient.get('/users')).rejects.toThrow('Network error');
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Validation failed');
      (validationError as unknown).status = 422;
      (validationError as unknown).response = {
        status: 422,
        data: {
          error: 'Validation failed',
          errors: [
            { field: 'email', message: 'Invalid email format' },
            { field: 'password', message: 'Password too weak' }
          ]
        }
      };

      mockRetryClient.post.mockRejectedValue(validationError);

      try {
        await apiClient.post('/users', { email: 'invalid', password: '123' });
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(422);
        expect((error as ApiError).errors).toHaveLength(2);
      }
    });
  });

  describe('Specific API Methods', () => {
    describe('User Management', () => {
      it('should get current user profile', async () => {
        const mockProfile = { id: 1, name: 'John Doe', email: 'john@example.com' };
        mockRetryClient.get.mockResolvedValue(mockProfile);

        const result = await apiClient.getCurrentUser();

        expect(result).toEqual(mockProfile);
        expect(mockRetryClient.get).toHaveBeenCalledWith(
          expect.stringContaining('/users/me'),
          expect.unknown(Object)
        );
      });

      it('should update user profile', async () => {
        const updateData = { name: 'Jane Doe', company: 'Acme Corp' };
        const mockResponse = { id: 1, ...updateData };

        mockRetryClient.put.mockResolvedValue(mockResponse);

        const result = await apiClient.updateProfile(updateData);

        expect(result).toEqual(mockResponse);
        expect(mockRetryClient.put).toHaveBeenCalledWith(
          expect.stringContaining('/users/me'),
          updateData,
          expect.unknown(Object)
        );
      });

      it('should upload user avatar', async () => {
        const mockFile = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
        const mockResponse = { avatarUrl: 'https://example.com/avatar.jpg' };

        mockRetryClient.post.mockResolvedValue(mockResponse);

        const result = await apiClient.uploadAvatar(mockFile);

        expect(result).toEqual(mockResponse);

        const [url, formData, options] = mockRetryClient.post.mock.calls[0];
        expect(url).toContain('/users/me/avatar');
        expect(formData).toBeInstanceOf(FormData);
        expect(options.headers).not.toHaveProperty('Content-Type');
      });
    });

    describe('Content Management', () => {
      it('should get user content', async () => {
        const mockContent = [
          { id: 1, title: 'Post 1', status: 'published' },
          { id: 2, title: 'Post 2', status: 'draft' }
        ];

        mockRetryClient.get.mockResolvedValue({ data: mockContent, total: 2 });

        const result = await apiClient.getContent({ page: 1, limit: 10 });

        expect(result.data).toEqual(mockContent);
        expect(mockRetryClient.get).toHaveBeenCalledWith(
          expect.stringMatching(/\/content\?page=1&limit=10/),
          expect.unknown(Object)
        );
      });

      it('should create new content', async () => {
        const contentData = {
          title: 'New Post',
          body: 'Content body',
          tags: ['marketing', 'social']
        };

        const mockResponse = { id: 3, ...contentData, status: 'draft' };
        mockRetryClient.post.mockResolvedValue(mockResponse);

        const result = await apiClient.createContent(contentData);

        expect(result).toEqual(mockResponse);
        expect(mockRetryClient.post).toHaveBeenCalledWith(
          expect.stringContaining('/content'),
          contentData,
          expect.unknown(Object)
        );
      });

      it('should delete content', async () => {
        mockRetryClient.delete.mockResolvedValue({ success: true });

        const result = await apiClient.deleteContent('123');

        expect(result).toEqual({ success: true });
        expect(mockRetryClient.delete).toHaveBeenCalledWith(
          expect.stringContaining('/content/123'),
          expect.unknown(Object)
        );
      });
    });

    describe('Analytics', () => {
      it('should get analytics data', async () => {
        const mockAnalytics = {
          views: 1500,
          engagement: 85,
          reach: 10000,
          conversions: 42
        };

        mockRetryClient.get.mockResolvedValue(mockAnalytics);

        const result = await apiClient.getAnalytics({
          dateRange: '7d',
          metrics: ['views', 'engagement']
        });

        expect(result).toEqual(mockAnalytics);
        expect(mockRetryClient.get).toHaveBeenCalledWith(
          expect.stringMatching(/\/analytics\?dateRange=7d&metrics=views,engagement/),
          expect.unknown(Object)
        );
      });

      it('should export analytics report', async () => {
        const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
        mockRetryClient.get.mockResolvedValue(mockBlob);

        const result = await apiClient.exportAnalytics({
          format: 'csv',
          dateRange: '30d'
        });

        expect(result).toEqual(mockBlob);
        expect(mockRetryClient.get).toHaveBeenCalledWith(
          expect.stringContaining('/analytics/export'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Accept': 'text/csv'
            })
          })
        );
      });
    });
  });

  describe('Request Interceptors', () => {
    it('should add request ID to all requests', async () => {
      mockRetryClient.get.mockResolvedValue({ data: 'success' });

      await apiClient.get('/test');

      expect(mockRetryClient.get).toHaveBeenCalledWith(
        expect.unknown(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Request-ID': expect.stringMatching(/^[0-9a-f-]{36}$/)
          })
        })
      );
    });

    it('should add user agent information', async () => {
      mockRetryClient.get.mockResolvedValue({ data: 'success' });

      await apiClient.get('/test');

      expect(mockRetryClient.get).toHaveBeenCalledWith(
        expect.unknown(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('MustBeViral')
          })
        })
      );
    });

    it('should include API version header', async () => {
      mockRetryClient.get.mockResolvedValue({ data: 'success' });

      await apiClient.get('/test');

      expect(mockRetryClient.get).toHaveBeenCalledWith(
        expect.unknown(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'API-Version': '1.0'
          })
        })
      );
    });
  });

  describe('Response Interceptors', () => {
    it('should handle rate limit responses', async () => {
      const rateLimitError = new Error('Rate limited');
      (rateLimitError as unknown).status = 429;
      (rateLimitError as unknown).response = {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0'
        }
      };

      mockRetryClient.get.mockRejectedValue(rateLimitError);

      try {
        await apiClient.get('/test');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(429);
        expect((error as ApiError).retryAfter).toBe(60);
      }
    });

    it('should extract and include response metadata', async () => {
      const mockResponse = {
        data: [{ id: 1 }, { id: 2 }],
        pagination: {
          page: 1,
          totalPages: 5,
          total: 50
        }
      };

      mockRetryClient.get.mockResolvedValue(mockResponse);

      const result = await apiClient.get('/test');

      expect(result).toEqual(mockResponse);
    });
  });
});