import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'

export function Header() {
  const navigate = useNavigate()
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

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{data?.user?.name ?? 'Admin user'}</p>
          <p className="text-xs text-gray-500">{data?.user?.email ?? ''}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </header>
  )
}
