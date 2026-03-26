import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RedirectIfAuthenticated, RequireAuth } from './AuthGuard'

const useQueryMock = vi.fn()

vi.mock('@/lib/trpc', () => ({
  trpc: {
    auth: {
      me: {
        useQuery: (...args: unknown[]) => useQueryMock(...args),
      },
    },
  },
}))

describe('AuthGuard', () => {
  beforeEach(() => {
    useQueryMock.mockReset()
  })

  it('shows a loading state while the session query is pending', () => {
    useQueryMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    render(
      <MemoryRouter initialEntries={['/products']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/products" element={<div>Protected page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Checking session')).toBeInTheDocument()
    expect(screen.queryByText('Protected page')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated users to login', () => {
    useQueryMock.mockReturnValue({
      data: { user: null },
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/products?tab=all']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/products" element={<div>Protected page</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Protected page')).not.toBeInTheDocument()
  })

  it('renders protected content for authenticated users', () => {
    useQueryMock.mockReturnValue({
      data: {
        user: { id: 1, email: 'admin@example.com' },
      },
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/products']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/products" element={<div>Protected page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Protected page')).toBeInTheDocument()
  })

  it('redirects authenticated users away from login', () => {
    useQueryMock.mockReturnValue({
      data: {
        user: { id: 1, email: 'admin@example.com' },
      },
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<div>Login page</div>} />
          </Route>
          <Route path="/" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
