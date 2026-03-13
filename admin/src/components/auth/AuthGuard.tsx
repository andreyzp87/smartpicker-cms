import { Loader2, Lock } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'

function AuthLoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Lock className="h-6 w-6 text-gray-600" />
          </div>
          <CardTitle>Checking session</CardTitle>
          <CardDescription>Verifying your SmartPicker admin access.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
        </CardContent>
      </Card>
    </div>
  )
}

export function RequireAuth() {
  const location = useLocation()
  const { data, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })

  if (isLoading) {
    return <AuthLoadingState />
  }

  if (!data?.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}

export function RedirectIfAuthenticated() {
  const { data, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })

  if (isLoading) {
    return <AuthLoadingState />
  }

  if (data?.user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
