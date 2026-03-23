import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { PageIntro } from '@/components/layout/PageIntro'
import { Card, CardContent } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { IntegrationForm } from '@/components/integrations/IntegrationForm'
import { IntegrationRelationshipsManager } from '@/components/integrations/IntegrationRelationshipsManager'
import { trpc } from '@/lib/trpc'

export function IntegrationEdit() {
  const navigate = useNavigate()
  const params = useParams()
  const id = Number(params.id)
  const utils = trpc.useUtils()
  const { data: integration, isLoading } = trpc.integrations.byId.useQuery(
    { id },
    { enabled: !!id },
  )

  const updateMutation = trpc.integrations.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.integrations.list.invalidate(),
        utils.integrations.byId.invalidate({ id }),
      ])
      toast.success('Integration updated')
      navigate('/integrations')
    },
    onError: (error) => {
      toast.error(`Failed to update integration: ${error.message}`)
    },
  })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Edit"
        title={integration ? `Integration: ${integration.name}` : 'Edit Integration'}
        description="Update metadata now. Platform links and hardware support are already modeled server-side and can be layered into richer editor tooling next."
      />

      <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardContent className="p-6">
          {isLoading || !integration ? (
            <TableSkeleton rows={6} />
          ) : (
            <IntegrationForm
              initialData={{
                name: integration.name,
                slug: integration.slug,
                integrationKind: integration.integrationKind,
                primaryProtocol: integration.primaryProtocol,
                manufacturerId: integration.manufacturerId,
                website: integration.website,
                description: integration.description,
                status: integration.status,
              }}
              onSubmit={(data) => updateMutation.mutate({ id, data })}
              isLoading={updateMutation.isPending}
            />
          )}
        </CardContent>
      </Card>

      {integration ? (
        <IntegrationRelationshipsManager integrationId={id} integration={integration} />
      ) : null}
    </div>
  )
}
