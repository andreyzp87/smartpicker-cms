import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router'
import {
  AlertTriangle,
  ArrowRight,
  GitBranch,
  Package,
  RefreshCw,
  Rows3,
  ScanSearch,
  Sparkles,
  Unplug,
} from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc'
import { PageIntro } from '@/components/layout/PageIntro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { columns } from '@/components/imports/ImportsTable'
import { type ImportSource } from '@/shared/schemas'

type RawImport = {
  id: number
  source: 'zigbee2mqtt' | 'blakadder' | 'zwave-js'
  sourceId: string
  importedAt: string
  processedAt: string | null
}

type SourceFilter = ImportSource | 'all'
type ProcessedFilter = 'all' | 'true' | 'false'

function isImportSource(value: string): value is ImportSource {
  return value === 'zigbee2mqtt' || value === 'blakadder' || value === 'zwave-js'
}

function formatRelative(value: string | Date | null) {
  if (!value) return '—'
  return formatDistanceToNow(new Date(value), { addSuffix: true })
}

function formatTimestamp(value: string | Date | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function ImportsList() {
  const [source, setSource] = useState<SourceFilter>('all')
  const [processed, setProcessed] = useState<ProcessedFilter>('all')
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false)
  const [mappingForm, setMappingForm] = useState({
    sourceCode: '',
    targetType: 'integration' as 'integration' | 'hub',
    integrationId: '',
    hubId: '',
    notes: '',
  })

  const overviewQuery = trpc.imports.overview.useQuery()
  const { data: integrations = [] } = trpc.integrations.list.useQuery()
  const { data: commercialHubs = [] } = trpc.commercialHubs.list.useQuery()
  const { data, isLoading, refetch } = trpc.imports.list.useQuery({
    source: source === 'all' ? undefined : source,
    processed: processed === 'all' ? undefined : processed === 'true',
    limit: 100,
    offset: 0,
  })

  const triggerMutation = trpc.imports.trigger.useMutation({
    onSuccess: () => {
      void Promise.all([refetch(), overviewQuery.refetch()])
    },
  })
  const createMappingMutation = trpc.imports.createCompatibilityMapping.useMutation({
    onSuccess: (result) => {
      toast.success('Source code mapping saved', {
        description: `${result.updatedProducts} products refreshed from ${result.matchedImports} matching imports.`,
      })
      setMappingDialogOpen(false)
      setMappingForm({
        sourceCode: '',
        targetType: 'integration',
        integrationId: '',
        hubId: '',
        notes: '',
      })
      void overviewQuery.refetch()
    },
    onError: (error) => {
      toast.error(`Could not save mapping: ${error.message}`)
    },
  })

  const importRows: RawImport[] = useMemo(
    () =>
      data?.items.flatMap((item) =>
        isImportSource(item.source)
          ? [
              {
                id: item.id,
                source: item.source,
                sourceId: item.sourceId,
                importedAt: item.importedAt,
                processedAt: item.processedAt,
              },
            ]
          : [],
      ) ?? [],
    [data?.items],
  )

  const overview = overviewQuery.data
  const activeTargetId =
    mappingForm.targetType === 'integration' ? mappingForm.integrationId : mappingForm.hubId

  function openMappingDialog(code = '') {
    setMappingForm({
      sourceCode: code,
      targetType: 'integration',
      integrationId: '',
      hubId: '',
      notes: '',
    })
    setMappingDialogOpen(true)
  }

  function submitMapping() {
    createMappingMutation.mutate({
      source: 'blakadder',
      sourceCode: mappingForm.sourceCode,
      targetType: mappingForm.targetType,
      integrationId:
        mappingForm.targetType === 'integration' && mappingForm.integrationId
          ? Number(mappingForm.integrationId)
          : null,
      hubId:
        mappingForm.targetType === 'hub' && mappingForm.hubId ? Number(mappingForm.hubId) : null,
      notes: mappingForm.notes || null,
      applyToExistingProducts: true,
    })
  }

  const statCards = [
    {
      label: 'Total imports',
      value: overview?.totals.imports ?? 0,
      tone: 'border-slate-200 bg-slate-100 text-slate-700',
      icon: Rows3,
    },
    {
      label: 'Processed',
      value: overview?.totals.processed ?? 0,
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: Sparkles,
    },
    {
      label: 'Pending',
      value: overview?.totals.pending ?? 0,
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      icon: ScanSearch,
    },
    {
      label: 'Unresolved mappings',
      value: overview?.totals.unresolvedMappings ?? 0,
      tone: 'border-rose-200 bg-rose-50 text-rose-700',
      icon: AlertTriangle,
    },
    {
      label: 'Evidence conflicts',
      value: overview?.evidenceConflicts.length ?? 0,
      tone: 'border-orange-200 bg-orange-50 text-orange-700',
      icon: GitBranch,
    },
  ]

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Operations"
        title="Imports"
        description="Review raw source ingestion, transformed product outcomes, recent compatibility evidence, and unresolved mapping gaps from one operational workspace."
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={source} onValueChange={(value) => setSource(value as SourceFilter)}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="zigbee2mqtt">Zigbee2MQTT</SelectItem>
                <SelectItem value="blakadder">Blakadder</SelectItem>
                <SelectItem value="zwave-js">Z-Wave JS</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={processed}
              onValueChange={(value) => setProcessed(value as ProcessedFilter)}
            >
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Processed</SelectItem>
                <SelectItem value="false">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => triggerMutation.mutate({ source: 'zigbee2mqtt' })}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Trigger Import
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card
              key={card.label}
              className="border-white/70 bg-white/80 shadow-[0_16px_44px_rgba(22,36,32,0.08)]"
            >
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-600">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{card.value}</p>
                </div>
                <div className={`rounded-2xl border p-3 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
          <CardHeader>
            <CardTitle>Source Summary</CardTitle>
            <CardDescription>
              Processed state and canonical linkage by upstream source.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview ? (
              overview.sources.map((sourceSummary) => (
                <div
                  key={sourceSummary.source}
                  className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-950">{sourceSummary.source}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Last import {formatRelative(sourceSummary.lastImportedAt)}
                      </p>
                    </div>
                    <Badge variant="outline">{sourceSummary.total} rows</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">Processed</p>
                      <p className="mt-1 font-medium text-slate-950">{sourceSummary.processed}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Pending</p>
                      <p className="mt-1 font-medium text-slate-950">{sourceSummary.pending}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Linked products</p>
                      <p className="mt-1 font-medium text-slate-950">
                        {sourceSummary.linkedProducts}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <TableSkeleton rows={4} />
            )}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
          <CardHeader>
            <CardTitle>Recent Transformations</CardTitle>
            <CardDescription>
              The latest raw imports that successfully linked to canonical products.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview ? (
              overview.recentTransformed.length > 0 ? (
                overview.recentTransformed.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">
                          {item.product?.name ?? 'Unlinked product'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.source} / {item.sourceId}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                          {item.product?.manufacturer ?? 'Unknown manufacturer'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{item.product?.status ?? 'draft'}</Badge>
                        <p className="mt-2 text-xs text-slate-500">
                          Processed {formatRelative(item.processedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
                  No transformed imports yet.
                </div>
              )
            ) : (
              <TableSkeleton rows={5} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
          <CardHeader>
            <CardTitle>Recent Evidence From Imports</CardTitle>
            <CardDescription>
              Latest canonical evidence preserved from upstream sources.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview ? (
              overview.recentEvidence.length > 0 ? (
                overview.recentEvidence.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{item.targetLabel}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.sourceRecordKey}</p>
                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          {item.source}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{item.assertedStatus}</Badge>
                        <p className="mt-2 text-xs text-slate-500">
                          Imported {formatRelative(item.importedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
                  No evidence rows yet.
                </div>
              )
            ) : (
              <TableSkeleton rows={5} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
          <CardHeader>
            <CardTitle>Recent Import Batches</CardTitle>
            <CardDescription>
              Hourly source batches inferred from raw import timestamps so you can spot partial
              runs, linkage gaps, and noisy upstream drops.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview ? (
              overview.recentBatches.length > 0 ? (
                overview.recentBatches.map((batch) => (
                  <div
                    key={batch.key}
                    className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-950">{batch.source}</p>
                          <Badge variant="outline">{batch.total} rows</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Started {formatTimestamp(batch.batchStartedAt)} • latest row{' '}
                          {formatRelative(batch.latestImportedAt)}
                        </p>
                      </div>
                      <Rows3 className="mt-1 h-5 w-5 text-slate-400" />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-slate-500">Processed</p>
                        <p className="mt-1 font-medium text-slate-950">{batch.processed}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Pending</p>
                        <p className="mt-1 font-medium text-slate-950">{batch.pending}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Linked products</p>
                        <p className="mt-1 font-medium text-slate-950">{batch.linkedProducts}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Unresolved rows</p>
                        <p className="mt-1 font-medium text-slate-950">{batch.unresolvedRows}</p>
                      </div>
                    </div>

                    {batch.unresolvedCodes.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {batch.unresolvedCodes.map((code: string) => (
                          <Badge
                            key={`${batch.key}-${code}`}
                            variant="outline"
                            className="border-rose-200 bg-white text-rose-800"
                          >
                            {code}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
                  No recent batch groups yet.
                </div>
              )
            ) : (
              <TableSkeleton rows={5} />
            )}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
          <CardHeader>
            <CardTitle>Evidence Conflicts</CardTitle>
            <CardDescription>
              Compatibility rows where imported evidence disagrees across sources or no longer
              matches the canonical status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview ? (
              overview.evidenceConflicts.length > 0 ? (
                overview.evidenceConflicts.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-amber-950">
                            {item.product.name} <ArrowRight className="mx-1 inline h-3 w-3" />{' '}
                            {item.target.name}
                          </p>
                          <Badge variant="outline">{item.targetType}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-amber-800">
                          {item.conflictReason === 'conflicting_imports'
                            ? 'Imported sources disagree on compatibility status.'
                            : 'Canonical row no longer matches the imported evidence set.'}
                        </p>
                        <p className="mt-2 text-sm text-amber-950/80">
                          {item.product.manufacturer ?? 'Unknown manufacturer'} • last evidence{' '}
                          {formatRelative(item.lastImportedAt)}
                        </p>
                      </div>
                      <AlertTriangle className="mt-1 h-5 w-5 text-amber-600" />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge className="bg-white text-slate-900">
                        Canonical: {item.canonicalStatus}
                      </Badge>
                      {item.evidenceStatuses.map((status: string) => (
                        <Badge
                          key={`${item.id}-${status}`}
                          variant="outline"
                          className="border-amber-300 bg-white text-amber-900"
                        >
                          Evidence: {status}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.evidenceSources.map((source: string) => (
                        <Badge key={`${item.id}-${source}`} variant="outline">
                          {source}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2 rounded-2xl border border-white/70 bg-white/70 p-3">
                      {item.latestEvidence.map(
                        (evidence: {
                          id: number
                          source: string
                          assertedStatus: string
                          sourceRecordKey: string
                          importedAt: string
                        }) => (
                          <div
                            key={evidence.id}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">
                                {evidence.source} • {evidence.assertedStatus}
                              </p>
                              <p className="truncate font-mono text-xs text-slate-500">
                                {evidence.sourceRecordKey}
                              </p>
                            </div>
                            <p className="text-xs text-slate-500">
                              {formatRelative(evidence.importedAt)}
                            </p>
                          </div>
                        ),
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        to={`/products/${item.product.id}/edit`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:text-slate-950"
                      >
                        <Package className="h-4 w-4" />
                        Open Product
                      </Link>
                      <Link
                        to="/compatibility?tab=review"
                        className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100/80 px-3 py-1.5 text-sm font-medium text-amber-950 transition hover:border-amber-400"
                      >
                        <GitBranch className="h-4 w-4" />
                        Review Queue
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
                  No evidence conflicts detected in the current import-backed set.
                </div>
              )
            ) : (
              <TableSkeleton rows={4} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
          <CardHeader>
            <CardTitle>Unresolved Mapping Queue</CardTitle>
            <CardDescription>
              Blakadder codes that currently do not resolve to an integration or commercial hub.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview ? (
              overview.unresolvedMappings.length > 0 ? (
                overview.unresolvedMappings.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-rose-200 bg-rose-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-rose-950">{item.sourceId}</p>
                      <p className="mt-1 text-xs text-rose-700">
                        Imported {formatRelative(item.importedAt)}
                      </p>
                      {item.product ? (
                        <p className="mt-2 text-sm text-rose-900">
                          Linked product: {item.product.name}
                        </p>
                      ) : null}
                    </div>
                    <Unplug className="mt-1 h-5 w-5 text-rose-500" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.unresolvedCodes.map((code: string) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => openMappingDialog(code)}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-3 py-1 text-sm font-medium text-rose-900 transition hover:border-rose-400 hover:bg-rose-100"
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-rose-800">
                      Select a code to map it and backfill matching linked products.
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
                No unresolved mappings in the recent queue.
              </div>
            )
          ) : (
            <TableSkeleton rows={4} />
          )}
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Custom Mapping Library</CardTitle>
            <CardDescription>
              Editorial source-code mappings layered on top of the built-in compatibility map.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => openMappingDialog()}>
            <Unplug className="mr-2 h-4 w-4" />
            Add Mapping
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview ? (
            overview.customMappings.length > 0 ? (
              overview.customMappings.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-950">{item.sourceCode}</p>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                        <p className="font-medium text-slate-950">{item.targetLabel}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.source} • updated {formatRelative(item.updatedAt)}
                      </p>
                      {item.notes ? (
                        <p className="mt-2 text-sm text-slate-700">{item.notes}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline">{item.targetType}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
                No custom mappings yet.
              </div>
            )
          ) : (
            <TableSkeleton rows={4} />
          )}
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardHeader>
          <CardTitle>Raw Import Queue</CardTitle>
          <CardDescription>
            Filter individual raw imports when you need to inspect the raw feed directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={10} />
          ) : (
            <DataTable<RawImport, unknown> columns={columns} data={importRows} />
          )}
        </CardContent>
      </Card>

      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Resolve Source Code Mapping</DialogTitle>
            <DialogDescription>
              Map a source compatibility code to an integration or commercial hub, then backfill
              matching linked products automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="source-code">Source code</Label>
              <Input
                id="source-code"
                value={mappingForm.sourceCode}
                onChange={(event) =>
                  setMappingForm((current) => ({
                    ...current,
                    sourceCode: event.target.value.toLowerCase(),
                  }))
                }
                placeholder="zha"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-type">Target type</Label>
              <Select
                value={mappingForm.targetType}
                onValueChange={(value) =>
                  setMappingForm((current) => ({
                    ...current,
                    targetType: value as 'integration' | 'hub',
                    integrationId: '',
                    hubId: '',
                  }))
                }
              >
                <SelectTrigger id="target-type" className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="hub">Commercial hub</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mapping-target">
              {mappingForm.targetType === 'integration' ? 'Integration' : 'Commercial hub'}
            </Label>
            <Select
              value={activeTargetId}
              onValueChange={(value) =>
                setMappingForm((current) =>
                  current.targetType === 'integration'
                    ? { ...current, integrationId: value }
                    : { ...current, hubId: value },
                )
              }
            >
              <SelectTrigger id="mapping-target" className="bg-white">
                <SelectValue
                  placeholder={
                    mappingForm.targetType === 'integration'
                      ? 'Choose an integration'
                      : 'Choose a commercial hub'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {mappingForm.targetType === 'integration'
                  ? integrations.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))
                  : commercialHubs.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mapping-note">Editorial note</Label>
            <Input
              id="mapping-note"
              value={mappingForm.notes}
              onChange={(event) =>
                setMappingForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Optional context for why this code maps here"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Saving a mapping refreshes all linked Blakadder products whose raw imports contain this
            normalized code.
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitMapping}
              disabled={
                createMappingMutation.isPending || !mappingForm.sourceCode.trim() || !activeTargetId
              }
            >
              {createMappingMutation.isPending ? 'Saving...' : 'Save Mapping'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
