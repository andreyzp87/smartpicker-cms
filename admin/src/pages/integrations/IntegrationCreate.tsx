import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PageIntro } from '@/components/layout/PageIntro'
import { Card, CardContent } from '@/components/ui/card'
import { IntegrationForm } from '@/components/integrations/IntegrationForm'
import { trpc } from '@/lib/trpc'

export function IntegrationCreate() {
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const createMutation = trpc.integrations.create.useMutation({
    onSuccess: async () => {
      await utils.integrations.list.invalidate()
      toast.success('Integration created')
      navigate('/integrations')
    },
    onError: (error) => {
      toast.error(`Failed to create integration: ${error.message}`)
    },
  })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Create"
        title="New Integration"
        description="Create a software compatibility target. Use the integration kind and primary protocol to make the editorial intent explicit."
      />

      <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardContent className="p-6">
          <IntegrationForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
