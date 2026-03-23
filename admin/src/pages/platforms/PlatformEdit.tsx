import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { PageIntro } from '@/components/layout/PageIntro'
import { Card, CardContent } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { PlatformForm } from '@/components/platforms/PlatformForm'
import { trpc } from '@/lib/trpc'

export function PlatformEdit() {
  const navigate = useNavigate()
  const params = useParams()
  const id = Number(params.id)
  const utils = trpc.useUtils()
  const { data: platform, isLoading } = trpc.platforms.byId.useQuery({ id }, { enabled: !!id })

  const updateMutation = trpc.platforms.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.platforms.list.invalidate(), utils.platforms.byId.invalidate({ id })])
      toast.success('Platform updated')
      navigate('/platforms')
    },
    onError: (error) => {
      toast.error(`Failed to update platform: ${error.message}`)
    },
  })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Edit"
        title={platform ? `Platform: ${platform.name}` : 'Edit Platform'}
        description="Update metadata, publish state, and manufacturer assignment. Linked integrations are shown in the platform detail payload and can be managed from the integrations workspace."
      />

      <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardContent className="p-6">
          {isLoading || !platform ? (
            <TableSkeleton rows={6} />
          ) : (
            <PlatformForm
              initialData={{
                name: platform.name,
                slug: platform.slug,
                kind: platform.kind,
                manufacturerId: platform.manufacturerId,
                website: platform.website,
                description: platform.description,
                status: platform.status,
              }}
              onSubmit={(data) => updateMutation.mutate({ id, data })}
              isLoading={updateMutation.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
