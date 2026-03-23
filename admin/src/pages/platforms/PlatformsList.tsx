import { useNavigate } from 'react-router'
import { Boxes, Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { PageIntro } from '@/components/layout/PageIntro'
import { PlatformsTable } from '@/components/platforms/PlatformsTable'

export function PlatformsList() {
  const navigate = useNavigate()
  const { data, isLoading } = trpc.platforms.list.useQuery()

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Resource"
        title="Platforms"
        description="Manage software environments separately from integrations and commercial hubs. Editors can see how many integrations are linked and how much product coverage is derived through them."
        actions={
          <Button onClick={() => navigate('/platforms/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Platform
          </Button>
        }
      />

      <Card className="border-white/70 bg-white/75 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardContent className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Platform Catalog</h2>
              <p className="text-sm text-slate-600">
                Open platforms and commercial platforms live here. Hubs belong elsewhere.
              </p>
            </div>
          </div>

          {isLoading ? <TableSkeleton rows={8} /> : <PlatformsTable platforms={data ?? []} />}
        </CardContent>
      </Card>
    </div>
  )
}
