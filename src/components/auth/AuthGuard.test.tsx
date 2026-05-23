import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AuthGuard from './AuthGuard'
import { useAuthStore } from '@/store/useAuthStore'

const pushMock = vi.fn()
let pathname = '/dashboard'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    push: pushMock,
  }),
}))

describe('AuthGuard', () => {
  beforeEach(() => {
    pathname = '/dashboard'
    pushMock.mockClear()
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isAdmin: false,
      hasHydrated: false,
    })
  })

  it('keeps protected routes in an accessible loading state until auth storage hydrates', () => {
    render(
      <AuthGuard>
        <main>Dashboard protegido</main>
      </AuthGuard>
    )

    expect(screen.getByRole('status', { name: /validando sessao/i })).toBeInTheDocument()
    expect(screen.queryByText('Dashboard protegido')).not.toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('redirects protected routes after hydration when there is no authenticated admin', async () => {
    useAuthStore.setState({ hasHydrated: true })

    render(
      <AuthGuard>
        <main>Dashboard protegido</main>
      </AuthGuard>
    )

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'))
  })
})
