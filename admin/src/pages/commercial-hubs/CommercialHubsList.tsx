import { useNavigate } from 'react-router'
import { Plus, RadioTower } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { PageIntro } from '@/components/layout/PageIntro'
import { CommercialHubsTable } from '@/components/commercial-hubs/CommercialHubsTable'

export function CommercialHubsList() {
  const navigate = useNavigate()
  const { data, isLoading } = trpc.commercialHubs.list.useQuery()

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Resource"
        title="Commercial Hubs"
        description="Directly evaluated hub products stay first-class targets. Keep them distinct from platforms and from physical infrastructure hardware."
        actions={
          <Button onClick={() => navigate('/commercial-hubs/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Commercial Hub
          </Button>
        }
      />

      <Card className="border-white/70 bg-white/75 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardContent className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-700">
              <RadioTower className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Hub Ecosystems</h2>
              <p className="text-sm text-slate-600">
                These rows are direct compatibility targets and should not be used as a generic
                compatibility bucket.
              </p>
            </div>
          </div>

          {isLoading ? <TableSkeleton rows={8} /> : <CommercialHubsTable hubs={data ?? []} />}
        </CardContent>
      </Card>
    </div>
  )
}
