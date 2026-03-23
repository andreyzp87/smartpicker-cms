import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertTriangle,
  CheckCircle2,
  FilePenLine,
  FolderClock,
  GitBranch,
  Plus,
  RadioTower,
  Rows3,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { CompatibilityStatusBadge, ReviewStateBadge } from '@/components/compatibility/CompatibilityBadges'
import { PageIntro } from '@/components/layout/PageIntro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trpc } from '@/lib/trpc'

type TabKey = 'overview' | 'by-product' | 'by-integration' | 'by-hub' | 'evidence' | 'review'
type CompatibilityStatus = 'verified' | 'supported' | 'reported' | 'untested' | 'incompatible'
type ReviewState = 'pending' | 'approved' | 'rejected'
type EvidenceSource = 'zigbee2mqtt' | 'blakadder' | 'zwave_js' | 'manual' | 'imported_other'

type IntegrationRow = {
  id: number
  productId: number
  integrationId: number
  status: CompatibilityStatus
  reviewState: ReviewState
  supportSummary: string | null
  internalNotes: string | null
  canonicalSource: EvidenceSource
  firstSeenAt: string | Date | null
  lastConfirmedAt: string | Date | null
  updatedAt: string | Date
  product: {
    name: string
    manufacturer: { name: string } | null
  }
  integration: {
    name: string
    platformIntegrations: {
      platform: {
        id: number
        name: string
      }
    }[]
  }
  evidence: {
    id: number
    source: EvidenceSource
    assertedStatus: CompatibilityStatus
    note: string | null
    importedAt: string | Date
  }[]
}

type HubRow = {
  id: number
  productId: number
  hubId: number
  status: CompatibilityStatus
  reviewState: ReviewState
  supportSummary: string | null
  internalNotes: string | null
  canonicalSource: EvidenceSource
  firstSeenAt: string | Date | null
  lastConfirmedAt: string | Date | null
  updatedAt: string | Date
  product: {
    name: string
    manufacturer: { name: string } | null
  }
  hub: {
    name: string
    manufacturer: { name: string } | null
  }
  evidence: {
    id: number
    source: EvidenceSource
    assertedStatus: CompatibilityStatus
    note: string | null
    importedAt: string | Date
  }[]
}

type EvidenceRow = {
  id: number
  targetType: 'integration' | 'hub'
  productIntegrationCompatibilityId: number | null
  productHubCompatibilityId: number | null
  source: EvidenceSource
  sourceRecordKey: string
  assertedStatus: CompatibilityStatus
  note: string | null
  metadata: Record<string, unknown>
  importedAt: string | Date
  productIntegrationCompatibility: {
    product: {
      name: string
    }
    integration: {
      name: string
    }
  } | null
  productHubCompatibility: {
    product: {
      name: string
    }
    hub: {
      name: string
    }
  } | null
}

type ReviewTarget =
  | { kind: 'integration'; row: IntegrationRow }
  | { kind: 'hub'; row: HubRow }

type ReviewFormState = {
  status: CompatibilityStatus
  reviewState: ReviewState
  canonicalSource: EvidenceSource
  supportSummary: string
  internalNotes: string
  firstSeenAt: string
  lastConfirmedAt: string
}

type EvidenceFormState = {
  targetType: 'integration' | 'hub'
  targetId: string
  source: EvidenceSource
  sourceRecordKey: string
  assertedStatus: CompatibilityStatus
  note: string
  metadataText: string
  importedAt: string
}

const statusOptions: CompatibilityStatus[] = [
  'verified',
  'supported',
  'reported',
  'untested',
  'incompatible',
]
const reviewOptions: ReviewState[] = ['pending', 'approved', 'rejected']
const evidenceSources: EvidenceSource[] = [
  'zigbee2mqtt',
  'blakadder',
  'zwave_js',
  'manual',
  'imported_other',
]

function formatRelative(date: string | Date | null) {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

function toDateInput(value: string | Date | null) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function parseDate(value: string) {
  return value ? new Date(`${value}T00:00:00`) : null
}

function toDateTimeInput(value: string | Date | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function parseDateTime(value: string) {
  return value ? new Date(value) : new Date()
}

function defaultReviewForm(target: ReviewTarget): ReviewFormState {
  return {
    status: target.row.status,
    reviewState: target.row.reviewState,
    canonicalSource: target.row.canonicalSource,
    supportSummary: target.row.supportSummary ?? '',
    internalNotes: target.row.internalNotes ?? '',
    firstSeenAt: toDateInput(target.row.firstSeenAt),
    lastConfirmedAt: toDateInput(target.row.lastConfirmedAt),
  }
}

function defaultEvidenceForm(
  targetType: 'integration' | 'hub',
  targetId?: number,
  evidence?: EvidenceRow,
): EvidenceFormState {
  if (evidence) {
    return {
      targetType: evidence.targetType,
      targetId: String(
        evidence.targetType === 'integration'
          ? evidence.productIntegrationCompatibilityId
          : evidence.productHubCompatibilityId,
      ),
      source: evidence.source,
      sourceRecordKey: evidence.sourceRecordKey,
      assertedStatus: evidence.assertedStatus,
      note: evidence.note ?? '',
      metadataText: JSON.stringify(evidence.metadata ?? {}, null, 2),
      importedAt: toDateTimeInput(evidence.importedAt),
    }
  }

  return {
    targetType,
    targetId: targetId ? String(targetId) : '',
    source: 'manual',
    sourceRecordKey: '',
    assertedStatus: 'supported',
    note: '',
    metadataText: '{\n  \n}',
    importedAt: toDateTimeInput(new Date()),
  }
}

function SurfaceTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: ReactNode[][]
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/85 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <TableRow key={index}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={headers.length} className="h-24 text-center text-slate-500">
                No rows yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export function CompatibilityPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = (searchParams.get('tab') as TabKey | null) ?? 'overview'
  const utils = trpc.useUtils()
  const integrationQuery = trpc.compatibility.integrationList.useQuery()
  const hubQuery = trpc.compatibility.hubList.useQuery()
  const evidenceQuery = trpc.compatibility.evidenceList.useQuery()

  const integrationRows = (integrationQuery.data ?? []) as IntegrationRow[]
  const hubRows = (hubQuery.data ?? []) as HubRow[]
  const evidenceRows = (evidenceQuery.data ?? []) as EvidenceRow[]
  const isLoading = integrationQuery.isLoading || hubQuery.isLoading || evidenceQuery.isLoading

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)
  const [reviewForm, setReviewForm] = useState<ReviewFormState | null>(null)

  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false)
  const [editingEvidence, setEditingEvidence] = useState<EvidenceRow | null>(null)
  const [evidenceForm, setEvidenceForm] = useState<EvidenceFormState>(
    defaultEvidenceForm('integration'),
  )

  const invalidateAll = async () => {
    await Promise.all([
      utils.compatibility.integrationList.invalidate(),
      utils.compatibility.hubList.invalidate(),
      utils.compatibility.evidenceList.invalidate(),
    ])
  }

  const updateIntegrationMutation = trpc.compatibility.updateProductIntegration.useMutation({
    onSuccess: async () => {
      toast.success('Integration compatibility updated')
      setReviewDialogOpen(false)
      setReviewTarget(null)
      await invalidateAll()
    },
    onError: (error) => toast.error(`Failed to update integration compatibility: ${error.message}`),
  })

  const updateHubMutation = trpc.compatibility.updateProductHub.useMutation({
    onSuccess: async () => {
      toast.success('Hub compatibility updated')
      setReviewDialogOpen(false)
      setReviewTarget(null)
      await invalidateAll()
    },
    onError: (error) => toast.error(`Failed to update hub compatibility: ${error.message}`),
  })

  const createEvidenceMutation = trpc.compatibility.createEvidence.useMutation({
    onSuccess: async () => {
      toast.success('Evidence added')
      setEvidenceDialogOpen(false)
      setEditingEvidence(null)
      await invalidateAll()
    },
    onError: (error) => toast.error(`Failed to add evidence: ${error.message}`),
  })

  const updateEvidenceMutation = trpc.compatibility.updateEvidence.useMutation({
    onSuccess: async () => {
      toast.success('Evidence updated')
      setEvidenceDialogOpen(false)
      setEditingEvidence(null)
      await invalidateAll()
    },
    onError: (error) => toast.error(`Failed to update evidence: ${error.message}`),
  })

  const deleteEvidenceMutation = trpc.compatibility.deleteEvidence.useMutation({
    onSuccess: async () => {
      toast.success('Evidence deleted')
      await invalidateAll()
    },
    onError: (error) => toast.error(`Failed to delete evidence: ${error.message}`),
  })

  const compatibilityTargetOptions = useMemo(
    () => [
      ...integrationRows.map((row) => ({
        value: String(row.id),
        label: `${row.product.name} -> ${row.integration.name}`,
        targetType: 'integration' as const,
      })),
      ...hubRows.map((row) => ({
        value: String(row.id),
        label: `${row.product.name} -> ${row.hub.name}`,
        targetType: 'hub' as const,
      })),
    ],
    [hubRows, integrationRows],
  )

  const byProductRows = useMemo(() => {
    const map = new Map<
      number,
      {
        name: string
        manufacturer: string
        integrationCount: number
        hubCount: number
        lastChanged: string | Date | null
      }
    >()

    for (const row of integrationRows) {
      const current = map.get(row.productId) ?? {
        name: row.product.name,
        manufacturer: row.product.manufacturer?.name ?? '—',
        integrationCount: 0,
        hubCount: 0,
        lastChanged: row.updatedAt,
      }

      current.integrationCount += 1
      current.lastChanged =
        new Date(current.lastChanged ?? 0) > new Date(row.updatedAt)
          ? current.lastChanged
          : row.updatedAt
      map.set(row.productId, current)
    }

    for (const row of hubRows) {
      const current = map.get(row.productId) ?? {
        name: row.product.name,
        manufacturer: row.product.manufacturer?.name ?? '—',
        integrationCount: 0,
        hubCount: 0,
        lastChanged: row.updatedAt,
      }

      current.hubCount += 1
      current.lastChanged =
        new Date(current.lastChanged ?? 0) > new Date(row.updatedAt)
          ? current.lastChanged
          : row.updatedAt
      map.set(row.productId, current)
    }

    return Array.from(map.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [hubRows, integrationRows])

  const reviewRows = useMemo(
    () => [
      ...integrationRows
        .filter((row) => row.reviewState === 'pending')
        .map((row) => ({
          kind: 'integration' as const,
          row,
        })),
      ...hubRows
        .filter((row) => row.reviewState === 'pending')
        .map((row) => ({
          kind: 'hub' as const,
          row,
        })),
    ].sort(
      (left, right) =>
        new Date(right.row.updatedAt).getTime() - new Date(left.row.updatedAt).getTime(),
    ),
    [hubRows, integrationRows],
  )

  const metricCards = [
    {
      label: 'Integration rows',
      value: integrationRows.length,
      icon: GitBranch,
      tone: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    {
      label: 'Hub rows',
      value: hubRows.length,
      icon: RadioTower,
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    {
      label: 'Pending reviews',
      value: reviewRows.length,
      icon: FolderClock,
      tone: 'border-rose-200 bg-rose-50 text-rose-700',
    },
    {
      label: 'Evidence items',
      value: evidenceRows.length,
      icon: Rows3,
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
  ]

  const openReviewDialog = (target: ReviewTarget) => {
    setReviewTarget(target)
    setReviewForm(defaultReviewForm(target))
    setReviewDialogOpen(true)
  }

  const applyReviewState = (target: ReviewTarget, nextState: ReviewState) => {
    const payload = {
      status: target.row.status,
      reviewState: nextState,
      canonicalSource: target.row.canonicalSource,
      supportSummary: target.row.supportSummary,
      internalNotes: target.row.internalNotes,
      firstSeenAt: target.row.firstSeenAt ? new Date(target.row.firstSeenAt) : null,
      lastConfirmedAt: target.row.lastConfirmedAt ? new Date(target.row.lastConfirmedAt) : null,
    }

    if (target.kind === 'integration') {
      updateIntegrationMutation.mutate({
        id: target.row.id,
        data: payload,
      })
      return
    }

    updateHubMutation.mutate({
      id: target.row.id,
      data: payload,
    })
  }

  const submitReview = () => {
    if (!reviewTarget || !reviewForm) {
      return
    }

    const payload = {
      status: reviewForm.status,
      reviewState: reviewForm.reviewState,
      canonicalSource: reviewForm.canonicalSource,
      supportSummary: reviewForm.supportSummary || null,
      internalNotes: reviewForm.internalNotes || null,
      firstSeenAt: parseDate(reviewForm.firstSeenAt),
      lastConfirmedAt: parseDate(reviewForm.lastConfirmedAt),
    }

    if (reviewTarget.kind === 'integration') {
      updateIntegrationMutation.mutate({
        id: reviewTarget.row.id,
        data: payload,
      })
      return
    }

    updateHubMutation.mutate({
      id: reviewTarget.row.id,
      data: payload,
    })
  }

  const openCreateEvidenceDialog = (target?: ReviewTarget) => {
    const nextTargetType = target?.kind === 'hub' ? 'hub' : 'integration'
    const nextTargetId = target?.row.id

    setEditingEvidence(null)
    setEvidenceForm(defaultEvidenceForm(nextTargetType, nextTargetId))
    setEvidenceDialogOpen(true)
  }

  const openEditEvidenceDialog = (evidence: EvidenceRow) => {
    setEditingEvidence(evidence)
    setEvidenceForm(defaultEvidenceForm(evidence.targetType, undefined, evidence))
    setEvidenceDialogOpen(true)
  }

  const submitEvidence = () => {
    let metadata: Record<string, unknown>

    try {
      metadata = JSON.parse(evidenceForm.metadataText || '{}') as Record<string, unknown>
    } catch {
      toast.error('Metadata must be valid JSON')
      return
    }

    const payload = {
      targetType: evidenceForm.targetType,
      productIntegrationCompatibilityId:
        evidenceForm.targetType === 'integration' ? Number(evidenceForm.targetId) : null,
      productHubCompatibilityId:
        evidenceForm.targetType === 'hub' ? Number(evidenceForm.targetId) : null,
      source: evidenceForm.source,
      sourceRecordKey: evidenceForm.sourceRecordKey,
      assertedStatus: evidenceForm.assertedStatus,
      note: evidenceForm.note || null,
      metadata,
      importedAt: parseDateTime(evidenceForm.importedAt),
    }

    if (editingEvidence) {
      updateEvidenceMutation.mutate({
        id: editingEvidence.id,
        data: payload,
      })
      return
    }

    createEvidenceMutation.mutate(payload)
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Editorial Workflow"
        title="Compatibility"
        description="Review canonical compatibility as a first-class editorial object. Integrations, direct hubs, and source evidence all stay visible instead of collapsing into a generic hub bucket."
        actions={
          <Button onClick={() => openCreateEvidenceDialog()} disabled={compatibilityTargetOptions.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add Manual Evidence
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border-gray-200 bg-white shadow-sm">
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

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Compatibility Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs
            value={currentTab}
            onValueChange={(value) => setSearchParams({ tab: value })}
            className="gap-4"
          >
            <TabsList className="h-auto flex-wrap rounded-2xl bg-slate-100 p-1.5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="by-product">By Product</TabsTrigger>
              <TabsTrigger value="by-integration">By Integration</TabsTrigger>
              <TabsTrigger value="by-hub">By Hub</TabsTrigger>
              <TabsTrigger value="evidence">Evidence Queue</TabsTrigger>
              <TabsTrigger value="review">Review Queue</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {isLoading ? (
                <TableSkeleton rows={8} />
              ) : (
                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <Card className="border-slate-200 bg-slate-50/70">
                    <CardHeader>
                      <CardTitle className="text-lg">Editorial guidance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
                      <p>
                        Integration compatibility is the primary canonical layer. Commercial hub
                        compatibility exists for direct user-evaluated ecosystems.
                      </p>
                      <p>
                        Platform compatibility is derived via platform-integrations links, so it
                        should be reviewed as an outcome, not entered as a standalone row.
                      </p>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-5 w-5" />
                          <p>
                            Do not use “hub” as the generic target type. If the row is about ZHA,
                            Zigbee2MQTT, or Z-Wave JS, it belongs in integration compatibility.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 bg-slate-50 text-slate-900">
                    <CardHeader>
                      <CardTitle className="text-lg text-slate-900">Review snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
                      <p>
                        Approved integration rows:{' '}
                        {integrationRows.filter((row) => row.reviewState === 'approved').length}
                      </p>
                      <p>
                        Approved hub rows:{' '}
                        {hubRows.filter((row) => row.reviewState === 'approved').length}
                      </p>
                      <p>Pending evidence-driven reviews: {reviewRows.length}</p>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="flex items-center gap-2 text-slate-900">
                          <CheckCircle2 className="h-4 w-4 text-slate-500" />
                          Latest evidence import:{' '}
                          {evidenceRows[0] ? formatRelative(evidenceRows[0].importedAt) : '—'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="by-product">
              {isLoading ? (
                <TableSkeleton rows={8} />
              ) : (
                <SurfaceTable
                  headers={[
                    'Product',
                    'Manufacturer',
                    'Integration rows',
                    'Hub rows',
                    'Last change',
                  ]}
                  rows={byProductRows.map((row) => [
                    row.name,
                    row.manufacturer,
                    row.integrationCount,
                    row.hubCount,
                    formatRelative(row.lastChanged),
                  ])}
                />
              )}
            </TabsContent>

            <TabsContent value="by-integration">
              {isLoading ? (
                <TableSkeleton rows={8} />
              ) : (
                <SurfaceTable
                  headers={[
                    'Product',
                    'Integration',
                    'Status',
                    'Review',
                    'Source',
                    'Evidence',
                    'Updated',
                    'Actions',
                  ]}
                  rows={integrationRows.map((row) => [
                    <div>
                      <p className="font-medium text-slate-950">{row.product.name}</p>
                      <p className="text-xs text-slate-500">
                        {row.product.manufacturer?.name ?? 'Unknown manufacturer'}
                      </p>
                    </div>,
                    <div>
                      <p className="font-medium text-slate-950">{row.integration.name}</p>
                      <p className="text-xs text-slate-500">
                        {row.integration.platformIntegrations
                          .map((link) => link.platform.name)
                          .join(', ') || 'No linked platforms'}
                      </p>
                    </div>,
                    <CompatibilityStatusBadge status={row.status} />,
                    <ReviewStateBadge state={row.reviewState} />,
                    row.canonicalSource,
                    row.evidence.length,
                    formatRelative(row.updatedAt),
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReviewDialog({ kind: 'integration', row })}
                      >
                        <FilePenLine className="h-4 w-4" />
                        Review
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCreateEvidenceDialog({ kind: 'integration', row })}
                      >
                        <Plus className="h-4 w-4" />
                        Evidence
                      </Button>
                    </div>,
                  ])}
                />
              )}
            </TabsContent>

            <TabsContent value="by-hub">
              {isLoading ? (
                <TableSkeleton rows={8} />
              ) : (
                <SurfaceTable
                  headers={[
                    'Product',
                    'Commercial hub',
                    'Status',
                    'Review',
                    'Source',
                    'Evidence',
                    'Updated',
                    'Actions',
                  ]}
                  rows={hubRows.map((row) => [
                    <div>
                      <p className="font-medium text-slate-950">{row.product.name}</p>
                      <p className="text-xs text-slate-500">
                        {row.product.manufacturer?.name ?? 'Unknown manufacturer'}
                      </p>
                    </div>,
                    <div>
                      <p className="font-medium text-slate-950">{row.hub.name}</p>
                      <p className="text-xs text-slate-500">{row.hub.manufacturer?.name ?? '—'}</p>
                    </div>,
                    <CompatibilityStatusBadge status={row.status} />,
                    <ReviewStateBadge state={row.reviewState} />,
                    row.canonicalSource,
                    row.evidence.length,
                    formatRelative(row.updatedAt),
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReviewDialog({ kind: 'hub', row })}
                      >
                        <FilePenLine className="h-4 w-4" />
                        Review
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCreateEvidenceDialog({ kind: 'hub', row })}
                      >
                        <Plus className="h-4 w-4" />
                        Evidence
                      </Button>
                    </div>,
                  ])}
                />
              )}
            </TabsContent>

            <TabsContent value="evidence">
              {isLoading ? (
                <TableSkeleton rows={8} />
              ) : (
                <SurfaceTable
                  headers={[
                    'Target',
                    'Type',
                    'Source',
                    'Asserted status',
                    'Imported',
                    'Record key',
                    'Actions',
                  ]}
                  rows={evidenceRows.map((row) => {
                    const label = row.productIntegrationCompatibility
                      ? `${row.productIntegrationCompatibility.product.name} -> ${row.productIntegrationCompatibility.integration.name}`
                      : row.productHubCompatibility
                        ? `${row.productHubCompatibility.product.name} -> ${row.productHubCompatibility.hub.name}`
                        : 'Unknown target'

                    return [
                      <div>
                        <p className="font-medium text-slate-950">{label}</p>
                        {row.note ? <p className="text-xs text-slate-500">{row.note}</p> : null}
                      </div>,
                      <Badge variant="outline">{row.targetType}</Badge>,
                      row.source,
                      <CompatibilityStatusBadge status={row.assertedStatus} />,
                      formatRelative(row.importedAt),
                      <code className="text-xs">{row.sourceRecordKey}</code>,
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditEvidenceDialog(row)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600"
                          onClick={() => deleteEvidenceMutation.mutate({ id: row.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>,
                    ]
                  })}
                />
              )}
            </TabsContent>

            <TabsContent value="review">
              {isLoading ? (
                <TableSkeleton rows={8} />
              ) : (
                <SurfaceTable
                  headers={['Type', 'Target', 'Status', 'Canonical source', 'Updated', 'Actions']}
                  rows={reviewRows.map(({ kind, row }) => [
                    kind === 'integration' ? 'Integration' : 'Hub',
                    kind === 'integration'
                      ? `${row.product.name} -> ${row.integration.name}`
                      : `${row.product.name} -> ${row.hub.name}`,
                    <CompatibilityStatusBadge status={row.status} />,
                    row.canonicalSource,
                    formatRelative(row.updatedAt),
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          applyReviewState(
                            kind === 'integration'
                              ? { kind: 'integration', row }
                              : { kind: 'hub', row },
                            'approved',
                          )
                        }
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          applyReviewState(
                            kind === 'integration'
                              ? { kind: 'integration', row }
                              : { kind: 'hub', row },
                            'rejected',
                          )
                        }
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          openReviewDialog(
                            kind === 'integration'
                              ? { kind: 'integration', row }
                              : { kind: 'hub', row },
                          )
                        }
                      >
                        <FilePenLine className="h-4 w-4" />
                        Open
                      </Button>
                    </div>,
                  ])}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {reviewTarget?.kind === 'integration'
                ? 'Review integration compatibility'
                : 'Review hub compatibility'}
            </DialogTitle>
            <DialogDescription>
              Update the canonical summary, moderation state, and timestamps for this compatibility row.
            </DialogDescription>
          </DialogHeader>

          {reviewTarget && reviewForm ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="font-medium text-slate-950">
                  {reviewTarget.kind === 'integration'
                    ? `${reviewTarget.row.product.name} -> ${reviewTarget.row.integration.name}`
                    : `${reviewTarget.row.product.name} -> ${reviewTarget.row.hub.name}`}
                </p>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={reviewForm.status}
                  onValueChange={(value) =>
                    setReviewForm((current) =>
                      current ? { ...current, status: value as CompatibilityStatus } : current,
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Review state</Label>
                <Select
                  value={reviewForm.reviewState}
                  onValueChange={(value) =>
                    setReviewForm((current) =>
                      current ? { ...current, reviewState: value as ReviewState } : current,
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reviewOptions.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Canonical source</Label>
                <Select
                  value={reviewForm.canonicalSource}
                  onValueChange={(value) =>
                    setReviewForm((current) =>
                      current ? { ...current, canonicalSource: value as EvidenceSource } : current,
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {evidenceSources.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Public support summary</Label>
                <textarea
                  value={reviewForm.supportSummary}
                  onChange={(event) =>
                    setReviewForm((current) =>
                      current ? { ...current, supportSummary: event.target.value } : current,
                    )
                  }
                  className="min-h-24 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Internal review notes</Label>
                <textarea
                  value={reviewForm.internalNotes}
                  onChange={(event) =>
                    setReviewForm((current) =>
                      current ? { ...current, internalNotes: event.target.value } : current,
                    )
                  }
                  className="min-h-24 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm"
                />
              </div>

              <div>
                <Label>First seen</Label>
                <Input
                  type="date"
                  value={reviewForm.firstSeenAt}
                  onChange={(event) =>
                    setReviewForm((current) =>
                      current ? { ...current, firstSeenAt: event.target.value } : current,
                    )
                  }
                />
              </div>

              <div>
                <Label>Last confirmed</Label>
                <Input
                  type="date"
                  value={reviewForm.lastConfirmedAt}
                  onChange={(event) =>
                    setReviewForm((current) =>
                      current ? { ...current, lastConfirmedAt: event.target.value } : current,
                    )
                  }
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={
                !reviewForm || updateIntegrationMutation.isPending || updateHubMutation.isPending
              }
            >
              Save Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
        <DialogContent className="max-w-3xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingEvidence ? 'Edit evidence' : 'Add manual evidence'}</DialogTitle>
            <DialogDescription>
              Preserve source assertions separately from the canonical compatibility row.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Target type</Label>
              <Select
                value={evidenceForm.targetType}
                onValueChange={(value) =>
                  setEvidenceForm((current) => ({
                    ...current,
                    targetType: value as 'integration' | 'hub',
                    targetId: '',
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="integration">integration</SelectItem>
                  <SelectItem value="hub">hub</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Target row</Label>
              <Select
                value={evidenceForm.targetId}
                onValueChange={(value) =>
                  setEvidenceForm((current) => ({ ...current, targetId: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select compatibility row" />
                </SelectTrigger>
                <SelectContent>
                  {compatibilityTargetOptions
                    .filter((option) => option.targetType === evidenceForm.targetType)
                    .map((option) => (
                      <SelectItem key={`${option.targetType}-${option.value}`} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Evidence source</Label>
              <Select
                value={evidenceForm.source}
                onValueChange={(value) =>
                  setEvidenceForm((current) => ({ ...current, source: value as EvidenceSource }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {evidenceSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Asserted status</Label>
              <Select
                value={evidenceForm.assertedStatus}
                onValueChange={(value) =>
                  setEvidenceForm((current) => ({
                    ...current,
                    assertedStatus: value as CompatibilityStatus,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>Source record key</Label>
              <Input
                value={evidenceForm.sourceRecordKey}
                onChange={(event) =>
                  setEvidenceForm((current) => ({ ...current, sourceRecordKey: event.target.value }))
                }
              />
            </div>

            <div>
              <Label>Imported at</Label>
              <Input
                type="datetime-local"
                value={evidenceForm.importedAt}
                onChange={(event) =>
                  setEvidenceForm((current) => ({ ...current, importedAt: event.target.value }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <Label>Note</Label>
              <textarea
                value={evidenceForm.note}
                onChange={(event) =>
                  setEvidenceForm((current) => ({ ...current, note: event.target.value }))
                }
                className="min-h-24 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm"
              />
            </div>

            <div className="md:col-span-2">
              <Label>Metadata JSON</Label>
              <textarea
                value={evidenceForm.metadataText}
                onChange={(event) =>
                  setEvidenceForm((current) => ({ ...current, metadataText: event.target.value }))
                }
                className="min-h-40 w-full rounded-xl border border-input bg-white px-3 py-2 font-mono text-xs shadow-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEvidenceDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitEvidence}
              disabled={
                !evidenceForm.targetId ||
                !evidenceForm.sourceRecordKey ||
                createEvidenceMutation.isPending ||
                updateEvidenceMutation.isPending
              }
            >
              {editingEvidence ? 'Save Evidence' : 'Add Evidence'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
