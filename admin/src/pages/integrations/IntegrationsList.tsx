import { useNavigate } from 'react-router'
import { GitBranch, Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { PageIntro } from '@/components/layout/PageIntro'
import { IntegrationsTable } from '@/components/integrations/IntegrationsTable'

export function IntegrationsList() {
  const navigate = useNavigate()
  const { data, isLoading } = trpc.integrations.list.useQuery()

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Resource"
        title="Integrations"
        description="Compatibility is anchored here first. Use integrations for software layers like Zigbee2MQTT, ZHA, deCONZ, and Z-Wave JS."
        actions={
          <Button onClick={() => navigate('/integrations/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Integration
          </Button>
        }
      />

      <Card className="border-white/70 bg-white/75 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardContent className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sky-700">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Integration Library</h2>
              <p className="text-sm text-slate-600">
                Each row shows platform links and canonical device compatibility volume.
              </p>
            </div>
          </div>

          {isLoading ? <TableSkeleton rows={8} /> : <IntegrationsTable integrations={data ?? []} />}
        </CardContent>
      </Card>
    </div>
  )
}
