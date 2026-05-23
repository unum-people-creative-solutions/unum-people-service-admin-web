import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tenantService } from './tenantService'
import { useAuthStore } from '@/store/useAuthStore'

// Mock globals
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock CognitoUser para refresh
vi.mock('amazon-cognito-identity-js', () => ({
  CognitoUser: vi.fn(function (this: any) {
    this.refreshSession = vi.fn((_refreshToken: any, callback: any) => {
      callback(null, {
        getIdToken: () => ({
          getJwtToken: () => 'refreshed-id-token',
        }),
        getAccessToken: () => ({
          getJwtToken: () => 'refreshed-access-token',
        }),
      })
    })
  }),
  CognitoUserPool: vi.fn(),
  CognitoRefreshToken: vi.fn(function (this: any, { RefreshToken }: any) {
    this.getToken = () => RefreshToken
  }),
}))

describe('tenantService', () => {
  const accessToken = 'valid-access-token'
  const refreshToken = 'valid-refresh-token'
  const user = { email: 'admin@test.com', groups: ['GlobalAdmin'] }

  beforeEach(() => {
    mockFetch.mockReset()
    useAuthStore.setState({
      user,
      token: accessToken,
      refreshToken,
      isAuthenticated: true,
      isAdmin: true,
      hasHydrated: true,
    })
  })

  describe('getStats', () => {
    it('sends the access token as Bearer in the Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_tenants: 5 }),
      })

      await tenantService.getStats()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers).toHaveProperty('Authorization', `Bearer ${accessToken}`)
    })

    it('calls /admin/dashboard/stats endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_tenants: 5 }),
      })

      await tenantService.getStats()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/dashboard/stats'),
        expect.any(Object)
      )
    })
  })

  describe('getLogs', () => {
    it('sends the access token as Bearer in the Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      await tenantService.getLogs()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers).toHaveProperty('Authorization', `Bearer ${accessToken}`)
    })

    it('calls /admin/dashboard/logs endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      await tenantService.getLogs()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/dashboard/logs'),
        expect.any(Object)
      )
    })
  })

  describe('automatic token refresh on 401', () => {
    it('refreshes the token and retries the request on 401', async () => {
      // First call returns 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: 'Unauthorized' }),
        })
        // Second call (retry with refreshed token) returns success
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ total_tenants: 10 }),
        })

      const result = await tenantService.getStats()

      // Should have called fetch twice
      expect(mockFetch).toHaveBeenCalledTimes(2)

      // Second call should use the refreshed token
      const [, secondOptions] = mockFetch.mock.calls[1]
      expect(secondOptions.headers).toHaveProperty('Authorization', 'Bearer refreshed-id-token')

      // Store should be updated with new token
      const storeState = useAuthStore.getState()
      expect(storeState.token).toBe('refreshed-id-token')

      // Result should be from the refreshed request
      expect(result).toEqual({ total_tenants: 10 })
    })

    it('throws the original 401 error and logs out if refresh fails', async () => {
      // Override refreshSession mock to fail
      const cognitoModule = await import('amazon-cognito-identity-js')
      const mockCognitoUser = cognitoModule.CognitoUser as unknown as ReturnType<typeof vi.fn>
      mockCognitoUser.mockImplementationOnce(function (this: any) {
        this.refreshSession = vi.fn((_refreshToken: any, callback: any) => {
          callback(new Error('Refresh failed'), null)
        })
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      })

      const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout')

      await expect(tenantService.getStats()).rejects.toThrow('Unauthorized')

      expect(logoutSpy).toHaveBeenCalled()

      // Store should keep the old token when refresh fails but isAuthenticated will be false after logout
      // (Note: in the actual store, logout clears everything)
      const storeState = useAuthStore.getState()
      expect(storeState.isAuthenticated).toBe(false)
    })

    it('logs out if the retried request after refresh also returns 401', async () => {
      // First call 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      })
      // Second call (after refresh) still 401
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Persistent Unauthorized' }),
      })

      const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout')

      await expect(tenantService.getStats()).rejects.toThrow('Persistent Unauthorized')

      expect(logoutSpy).toHaveBeenCalled()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('throws the original error for non-401 failures without attempting refresh', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      })

      await expect(tenantService.getStats()).rejects.toThrow('Forbidden')

      // Should only have called fetch once (no retry)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})