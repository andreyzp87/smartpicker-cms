import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { PageIntro } from '@/components/layout/PageIntro'
import { CommercialHubCompatibilityPanel } from '@/components/commercial-hubs/CommercialHubCompatibilityPanel'
import { Card, CardContent } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { CommercialHubForm } from '@/components/commercial-hubs/CommercialHubForm'
import { trpc } from '@/lib/trpc'

export function CommercialHubEdit() {
  const navigate = useNavigate()
  const params = useParams()
  const id = Number(params.id)
  const utils = trpc.useUtils()
  const { data: hub, isLoading } = trpc.commercialHubs.byId.useQuery({ id }, { enabled: !!id })

  const updateMutation = trpc.commercialHubs.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.commercialHubs.list.invalidate(),
        utils.commercialHubs.byId.invalidate({ id }),
      ])
      toast.success('Commercial hub updated')
      navigate('/commercial-hubs')
    },
    onError: (error) => {
      toast.error(`Failed to update commercial hub: ${error.message}`)
    },
  })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Edit"
        title={hub ? `Commercial Hub: ${hub.name}` : 'Edit Commercial Hub'}
        description="Update metadata and publishing state. Direct compatibility rows and evidence remain inspectable in the Compatibility workspace."
      />

      <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardContent className="p-6">
          {isLoading || !hub ? (
            <TableSkeleton rows={6} />
          ) : (
            <CommercialHubForm
              initialData={{
                name: hub.name,
                slug: hub.slug,
                manufacturerId: hub.manufacturerId,
                website: hub.website,
                description: hub.description,
                status: hub.status,
              }}
              onSubmit={(data) => updateMutation.mutate({ id, data })}
              isLoading={updateMutation.isPending}
            />
          )}
        </CardContent>
      </Card>

      {hub ? <CommercialHubCompatibilityPanel hubId={id} /> : null}
    </div>
  )
}
