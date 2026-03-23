import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PageIntro } from '@/components/layout/PageIntro'
import { Card, CardContent } from '@/components/ui/card'
import { PlatformForm } from '@/components/platforms/PlatformForm'
import { trpc } from '@/lib/trpc'

export function PlatformCreate() {
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const createMutation = trpc.platforms.create.useMutation({
    onSuccess: async () => {
      await utils.platforms.list.invalidate()
      toast.success('Platform created')
      navigate('/platforms')
    },
    onError: (error) => {
      toast.error(`Failed to create platform: ${error.message}`)
    },
  })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Create"
        title="New Platform"
        description="Use platforms for software environments like Home Assistant, OpenHAB, or Homey. Integrations are linked separately."
      />

      <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardContent className="p-6">
          <PlatformForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
