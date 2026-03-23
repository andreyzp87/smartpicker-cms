import { LogOut, Menu } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
import { getNavigationItem } from './navigation'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const utils = trpc.useUtils()
  const { data } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  })

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      utils.auth.me.setData(undefined, { user: null })
      await utils.auth.me.invalidate()
      toast.success('Signed out')
      navigate('/login', { replace: true })
    },
    onError: (error) => {
      toast.error(error.message || 'Unable to sign out')
    },
  })
  const activeItem = getNavigationItem(location.pathname)

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="border-gray-300 bg-white shadow-sm lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-gray-500">
              {activeItem.name}
            </p>
            <h2 className="truncate text-xl font-semibold tracking-tight text-gray-900">
              {activeItem.description}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-2xl border border-gray-200 bg-white px-4 py-2 text-right shadow-sm sm:block">
            <p className="text-sm font-medium text-gray-900">{data?.user?.name ?? 'Admin user'}</p>
            <p className="text-xs text-gray-500">{data?.user?.email ?? ''}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-300 bg-white shadow-sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  )
}
