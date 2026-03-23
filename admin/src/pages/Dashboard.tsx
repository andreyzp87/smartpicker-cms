import {
  Boxes,
  FolderClock,
  GitBranch,
  Loader2,
  Package,
  RadioTower,
  UploadCloud,
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PageIntro } from '@/components/layout/PageIntro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { trpc } from '@/lib/trpc'

function toDate(value: string | Date | null | undefined) {
  return value ? new Date(value) : null
}

function formatDate(value: string | Date | null | undefined) {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function Dashboard() {
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const { data: dashboardOverview } = trpc.dashboard.overview.useQuery()
  const { data: importsData } = trpc.imports.list.useQuery({
    limit: 12,
    offset: 0,
  })
  const { data: integrationRows = [] } = trpc.compatibility.integrationList.useQuery()
  const { data: hubRows = [] } = trpc.compatibility.hubList.useQuery()
  const { data: bulkPublishPreview, isLoading: isBulkPublishPreviewLoading } =
    trpc.products.bulkPublishPreview.useQuery()

  const bulkPublishMutation = trpc.products.bulkPublishSafe.useMutation({
    onSuccess: async (data) => {
      await Promise.all([
        utils.dashboard.overview.invalidate(),
        utils.products.list.invalidate(),
        utils.products.bulkPublishPreview.invalidate(),
      ])

      if (data.publishedProducts === 0) {
        toast.info('No export-ready draft devices found')
        return
      }

      toast.success('Bulk publish complete', {
        description: `${data.publishedProducts} products published. Newly unlocked in export: ${data.newlyUnlockedRelated.manufacturers} manufacturers, ${data.newlyUnlockedRelated.categories} categories, ${data.newlyUnlockedRelated.hubs} hubs.`,
      })
    },
    onError: (error) => {
      toast.error(`Bulk publish failed: ${error.message}`)
    },
  })

  const dashboardCards = [
    {
      title: 'Published products',
      value: dashboardOverview?.publishedProducts ?? 0,
      description: 'Live catalog entries ready for export.',
      icon: Package,
      tone: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    {
      title: 'Published integrations',
      value: dashboardOverview?.publishedIntegrations ?? 0,
      description: 'Compatibility anchor points visible to editors.',
      icon: GitBranch,
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    {
      title: 'Published hubs',
      value: dashboardOverview?.publishedHubs ?? 0,
      description: 'Direct commercial hub targets.',
      icon: RadioTower,
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    {
      title: 'Pending reviews',
      value: dashboardOverview?.pendingReviews ?? 0,
      description: 'Compatibility rows waiting for editorial review.',
      icon: FolderClock,
      tone: 'border-rose-200 bg-rose-50 text-rose-700',
    },
    {
      title: 'Evidence items',
      value: dashboardOverview?.evidenceItems ?? 0,
      description: 'Imported source assertions preserved for audit.',
      icon: Boxes,
      tone: 'border-violet-200 bg-violet-50 text-violet-700',
    },
    {
      title: 'Imports in 7 days',
      value: dashboardOverview?.importsProcessedLastWeek ?? 0,
      description: 'Recently processed source records.',
      icon: UploadCloud,
      tone: 'border-slate-200 bg-slate-100 text-slate-700',
    },
  ]

  const recentCompatibilityChanges = [...integrationRows, ...hubRows]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Operations"
        title="Dashboard"
        description="A schema-aware editorial cockpit for products, integrations, commercial hubs, and source-backed compatibility. Use this page to spot publishing opportunities and review pressure quickly."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboardCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="border-gray-200 bg-white shadow-sm">
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="text-sm text-slate-600">{card.title}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{card.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p>
                </div>
                <div className={`rounded-2xl border p-3 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Latest imports</CardTitle>
            <CardDescription>Most recent source ingestions and processing status.</CardDescription>
          </CardHeader>
          <CardContent>
            {importsData ? (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Record</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Imported</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importsData.items.slice(0, 6).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.source}</TableCell>
                        <TableCell className="font-mono text-xs">{item.sourceId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.processedAt ? 'Processed' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.importedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <TableSkeleton rows={6} />
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Latest compatibility changes</CardTitle>
            <CardDescription>Most recently updated canonical compatibility rows.</CardDescription>
          </CardHeader>
          <CardContent>
            {integrationRows.length || hubRows.length ? (
              <div className="space-y-3">
                {recentCompatibilityChanges.map((row) => {
                  const targetName = 'integration' in row ? row.integration.name : row.hub.name
                  return (
                    <button
                      key={`${'integration' in row ? 'integration' : 'hub'}-${row.id}`}
                      type="button"
                      onClick={() => navigate('/compatibility')}
                      className="flex w-full items-start justify-between rounded-3xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white"
                    >
                      <div>
                        <p className="font-medium text-slate-950">{row.product.name}</p>
                        <p className="mt-1 text-sm text-slate-600">{targetName}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{row.status}</Badge>
                        <p className="mt-2 text-xs text-slate-500">{formatDate(row.updatedAt)}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <TableSkeleton rows={5} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 bg-white text-gray-900 shadow-sm">
        <CardHeader className="gap-3">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <UploadCloud className="h-5 w-5 text-gray-500" />
            Safe Publish Runway
          </CardTitle>
          <CardDescription className="text-gray-600">
            Promote only export-ready draft devices. Current rule set: manufacturer, category, and
            primary protocol must already exist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Safe draft devices</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {bulkPublishPreview?.eligibleProducts ?? 0}
              </p>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Manufacturers unlocked</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {bulkPublishPreview?.newlyUnlockedRelated.manufacturers ?? 0}
              </p>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Categories unlocked</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {bulkPublishPreview?.newlyUnlockedRelated.categories ?? 0}
              </p>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Hub exports unlocked</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {bulkPublishPreview?.newlyUnlockedRelated.hubs ?? 0}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 text-sm leading-7 text-gray-600">
            <p>
              Drafts reviewed: {bulkPublishPreview?.draftProducts ?? 0}. Blocked drafts:{' '}
              {bulkPublishPreview?.blockedProducts ?? 0}.
            </p>
            <p>
              Missing fields: manufacturer {bulkPublishPreview?.missingManufacturerCount ?? 0},
              category {bulkPublishPreview?.missingCategoryCount ?? 0}, protocol{' '}
              {bulkPublishPreview?.missingProtocolCount ?? 0}.
            </p>
          </div>

          <Button
            onClick={() => bulkPublishMutation.mutate()}
            disabled={
              isBulkPublishPreviewLoading ||
              bulkPublishMutation.isPending ||
              (bulkPublishPreview?.eligibleProducts ?? 0) === 0
            }
          >
            {bulkPublishMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Bulk Publish Safe Drafts
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
