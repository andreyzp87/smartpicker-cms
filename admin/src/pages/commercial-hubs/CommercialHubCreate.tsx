import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PageIntro } from '@/components/layout/PageIntro'
import { Card, CardContent } from '@/components/ui/card'
import { CommercialHubForm } from '@/components/commercial-hubs/CommercialHubForm'
import { trpc } from '@/lib/trpc'

export function CommercialHubCreate() {
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const createMutation = trpc.commercialHubs.create.useMutation({
    onSuccess: async () => {
      await utils.commercialHubs.list.invalidate()
      toast.success('Commercial hub created')
      navigate('/commercial-hubs')
    },
    onError: (error) => {
      toast.error(`Failed to create commercial hub: ${error.message}`)
    },
  })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Create"
        title="New Commercial Hub"
        description="Create a direct hub target for user-facing compatibility. Use this only for products or ecosystems users actually evaluate as hubs."
      />

      <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardContent className="p-6">
          <CommercialHubForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
