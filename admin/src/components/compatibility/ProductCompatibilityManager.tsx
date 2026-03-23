import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { GitBranch, Plus, RadioTower, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CompatibilityStatusBadge, ReviewStateBadge } from './CompatibilityBadges'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

type IntegrationRow = {
  id: number
  integrationId: number
  status: 'verified' | 'supported' | 'reported' | 'untested' | 'incompatible'
  reviewState: 'pending' | 'approved' | 'rejected'
  supportSummary: string | null
  internalNotes: string | null
  canonicalSource: 'zigbee2mqtt' | 'blakadder' | 'zwave_js' | 'manual' | 'imported_other'
  firstSeenAt: string | Date | null
  lastConfirmedAt: string | Date | null
  updatedAt: string | Date
  integration: {
    id: number
    name: string
    manufacturer: { name: string } | null
    platformIntegrations: {
      platform: {
        id: number
        name: string
        slug: string
      }
    }[]
  }
  evidence: {
    id: number
    source: string
    assertedStatus: string
    note: string | null
    importedAt: string | Date
  }[]
}

type HubRow = {
  id: number
  hubId: number
  status: 'verified' | 'supported' | 'reported' | 'untested' | 'incompatible'
  reviewState: 'pending' | 'approved' | 'rejected'
  supportSummary: string | null
  internalNotes: string | null
  canonicalSource: 'zigbee2mqtt' | 'blakadder' | 'zwave_js' | 'manual' | 'imported_other'
  firstSeenAt: string | Date | null
  lastConfirmedAt: string | Date | null
  updatedAt: string | Date
  hub: {
    id: number
    name: string
    manufacturer: { name: string } | null
  }
  evidence: {
    id: number
    source: string
    assertedStatus: string
    note: string | null
    importedAt: string | Date
  }[]
}

type IntegrationFormState = {
  integrationId: string
  status: IntegrationRow['status']
  reviewState: IntegrationRow['reviewState']
  canonicalSource: IntegrationRow['canonicalSource']
  supportSummary: string
  internalNotes: string
  firstSeenAt: string
  lastConfirmedAt: string
}

type HubFormState = {
  hubId: string
  status: HubRow['status']
  reviewState: HubRow['reviewState']
  canonicalSource: HubRow['canonicalSource']
  supportSummary: string
  internalNotes: string
  firstSeenAt: string
  lastConfirmedAt: string
}

const statusOptions = ['verified', 'supported', 'reported', 'untested', 'incompatible'] as const
const reviewOptions = ['pending', 'approved', 'rejected'] as const
const evidenceSources = ['zigbee2mqtt', 'blakadder', 'zwave_js', 'manual', 'imported_other'] as const
const statusPrecedence = ['verified', 'supported', 'reported', 'untested', 'incompatible'] as const

function formatRelative(value: string | Date | null) {
  if (!value) return '—'
  return formatDistanceToNow(new Date(value), { addSuffix: true })
}

function formatDateInput(value: string | Date | null) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function parseDate(value: string) {
  return value ? new Date(`${value}T00:00:00`) : null
}

function defaultIntegrationForm(integrationId?: number): IntegrationFormState {
  return {
    integrationId: integrationId ? String(integrationId) : '',
    status: 'supported',
    reviewState: 'pending',
    canonicalSource: 'manual',
    supportSummary: '',
    internalNotes: '',
    firstSeenAt: '',
    lastConfirmedAt: '',
  }
}

function defaultHubForm(hubId?: number): HubFormState {
  return {
    hubId: hubId ? String(hubId) : '',
    status: 'supported',
    reviewState: 'pending',
    canonicalSource: 'manual',
    supportSummary: '',
    internalNotes: '',
    firstSeenAt: '',
    lastConfirmedAt: '',
  }
}

export function ProductCompatibilityManager({
  productId,
  productName,
}: {
  productId: number
  productName: string
}) {
  const utils = trpc.useUtils()
  const { data: integrationRows = [], isLoading: isLoadingIntegrations } =
    trpc.compatibility.productIntegrationsByProductId.useQuery({ productId }) as {
      data: IntegrationRow[] | undefined
      isLoading: boolean
    }
  const { data: hubRows = [], isLoading: isLoadingHubs } =
    trpc.compatibility.productHubsByProductId.useQuery({ productId }) as {
      data: HubRow[] | undefined
      isLoading: boolean
    }
  const { data: integrations = [] } = trpc.integrations.list.useQuery()
  const { data: commercialHubs = [] } = trpc.commercialHubs.list.useQuery()

  const [integrationDialogOpen, setIntegrationDialogOpen] = useState(false)
  const [hubDialogOpen, setHubDialogOpen] = useState(false)
  const [editingIntegration, setEditingIntegration] = useState<IntegrationRow | null>(null)
  const [editingHub, setEditingHub] = useState<HubRow | null>(null)
  const [integrationForm, setIntegrationForm] = useState<IntegrationFormState>(defaultIntegrationForm())
  const [hubForm, setHubForm] = useState<HubFormState>(defaultHubForm())

  const invalidateAll = async () => {
    await Promise.all([
      utils.compatibility.productIntegrationsByProductId.invalidate({ productId }),
      utils.compatibility.productHubsByProductId.invalidate({ productId }),
      utils.compatibility.integrationList.invalidate(),
      utils.compatibility.hubList.invalidate(),
      utils.compatibility.evidenceList.invalidate(),
      utils.products.list.invalidate(),
    ])
  }

  const createIntegrationMutation = trpc.compatibility.createProductIntegration.useMutation({
    onSuccess: async () => {
      toast.success('Integration compatibility added')
      setIntegrationDialogOpen(false)
      setEditingIntegration(null)
      setIntegrationForm(defaultIntegrationForm())
      await invalidateAll()
    },
    onError: (error) => toast.error(`Failed to add integration compatibility: ${error.message}`),
  })

  const updateIntegrationMutation = trpc.compatibility.updateProductIntegration.useMutation({
    onSuccess: async () => {
      toast.success('Integration compatibility updated')
      setIntegrationDialogOpen(false)
      setEditingIntegration(null)
      await invalidateAll()
    },
    onError: (error) => toast.error(`Failed to update integration compatibility: ${error.message}`),
  })

  const deleteIntegrationMutation = trpc.compatibility.deleteProductIntegration.useMutation({
    onSuccess: async () => {
      toast.success('Integration compatibility removed')
      await invalidateAll()
    },
    onError: (error) => toast.error(`Failed to remove integration compatibility: ${error.message}`),
  })

  const createHubMutation = trpc.compatibility.createProductHub.useMutation({
    onSuccess: async () => {
      toast.success('Hub compatibility added')
      setHubDialogOpen(false)
      setEditingHub(null)
      setHubForm(defaultHubForm())
      await invalidateAll()
    },
    onError: (error) => toast.error(`Failed to add hub compatibility: ${error.message}`),
  })

  const updateHubMutation = trpc.compatibility.updateProductHub.useMutation({
    onSuccess: async () => {
      toast.success('Hub compatibility updated')
      setHubDialogOpen(false)
      setEditingHub(null)
      await invalidateAll()
    },
    onError: (error) => toast.error(`Failed to update hub compatibility: ${error.message}`),
  })

  const deleteHubMutation = trpc.compatibility.deleteProductHub.useMutation({
    onSuccess: async () => {
      toast.success('Hub compatibility removed')
      await invalidateAll()
    },
    onError: (error) => toast.error(`Failed to remove hub compatibility: ${error.message}`),
  })

  const derivedPlatforms = useMemo(() => {
    const map = new Map<
      number,
      {
        name: string
        slug: string
        status: IntegrationRow['status']
        via: string[]
      }
    >()

    for (const row of integrationRows) {
      for (const link of row.integration.platformIntegrations) {
        const previous = map.get(link.platform.id)
        const previousRank = previous ? statusPrecedence.indexOf(previous.status) : Number.POSITIVE_INFINITY
        const currentRank = statusPrecedence.indexOf(row.status)

        map.set(link.platform.id, {
          name: link.platform.name,
          slug: link.platform.slug,
          status: currentRank < previousRank ? row.status : previous?.status ?? row.status,
          via: Array.from(new Set([...(previous?.via ?? []), row.integration.name])),
        })
      }
    }

    return Array.from(map.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [integrationRows])

  const openCreateIntegrationDialog = () => {
    setEditingIntegration(null)
    setIntegrationForm(defaultIntegrationForm(integrations[0]?.id))
    setIntegrationDialogOpen(true)
  }

  const openEditIntegrationDialog = (row: IntegrationRow) => {
    setEditingIntegration(row)
    setIntegrationForm({
      integrationId: String(row.integrationId),
      status: row.status,
      reviewState: row.reviewState,
      canonicalSource: row.canonicalSource,
      supportSummary: row.supportSummary ?? '',
      internalNotes: row.internalNotes ?? '',
      firstSeenAt: formatDateInput(row.firstSeenAt),
      lastConfirmedAt: formatDateInput(row.lastConfirmedAt),
    })
    setIntegrationDialogOpen(true)
  }

  const openCreateHubDialog = () => {
    setEditingHub(null)
    setHubForm(defaultHubForm(commercialHubs[0]?.id))
    setHubDialogOpen(true)
  }

  const openEditHubDialog = (row: HubRow) => {
    setEditingHub(row)
    setHubForm({
      hubId: String(row.hubId),
      status: row.status,
      reviewState: row.reviewState,
      canonicalSource: row.canonicalSource,
      supportSummary: row.supportSummary ?? '',
      internalNotes: row.internalNotes ?? '',
      firstSeenAt: formatDateInput(row.firstSeenAt),
      lastConfirmedAt: formatDateInput(row.lastConfirmedAt),
    })
    setHubDialogOpen(true)
  }

  const submitIntegrationForm = () => {
    const payload = {
      productId,
      integrationId: Number(integrationForm.integrationId),
      status: integrationForm.status,
      reviewState: integrationForm.reviewState,
      canonicalSource: integrationForm.canonicalSource,
      supportSummary: integrationForm.supportSummary || null,
      internalNotes: integrationForm.internalNotes || null,
      firstSeenAt: parseDate(integrationForm.firstSeenAt),
      lastConfirmedAt: parseDate(integrationForm.lastConfirmedAt),
    }

    if (editingIntegration) {
      updateIntegrationMutation.mutate({ id: editingIntegration.id, data: payload })
      return
    }

    createIntegrationMutation.mutate(payload)
  }

  const submitHubForm = () => {
    const payload = {
      productId,
      hubId: Number(hubForm.hubId),
      status: hubForm.status,
      reviewState: hubForm.reviewState,
      canonicalSource: hubForm.canonicalSource,
      supportSummary: hubForm.supportSummary || null,
      internalNotes: hubForm.internalNotes || null,
      firstSeenAt: parseDate(hubForm.firstSeenAt),
      lastConfirmedAt: parseDate(hubForm.lastConfirmedAt),
    }

    if (editingHub) {
      updateHubMutation.mutate({ id: editingHub.id, data: payload })
      return
    }

    createHubMutation.mutate(payload)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-sky-700" />
                Integration Compatibility
              </CardTitle>
              <CardDescription>
                Canonical software-layer compatibility for {productName}.
              </CardDescription>
            </div>
            <Button size="sm" onClick={openCreateIntegrationDialog}>
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingIntegrations ? (
              <TableSkeleton rows={5} />
            ) : integrationRows.length > 0 ? (
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Integration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Evidence</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrationRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-950">{row.integration.name}</p>
                            <p className="text-xs text-slate-500">
                              {row.integration.platformIntegrations.map((link) => link.platform.name).join(', ') ||
                                'No linked platforms'}
                            </p>
                            {row.supportSummary ? (
                              <p className="mt-1 text-xs text-slate-600">{row.supportSummary}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <CompatibilityStatusBadge status={row.status} />
                        </TableCell>
                        <TableCell>
                          <ReviewStateBadge state={row.reviewState} />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-900">{row.evidence.length}</p>
                            <div className="flex flex-wrap gap-1">
                              {row.evidence.slice(0, 3).map((evidence) => (
                                <span
                                  key={evidence.id}
                                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                                >
                                  {evidence.source}
                                </span>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatRelative(row.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditIntegrationDialog(row)}>
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-rose-600"
                              onClick={() => deleteIntegrationMutation.mutate({ id: row.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
                No integration compatibility rows yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
          <CardHeader>
            <CardTitle>Derived Platform Preview</CardTitle>
            <CardDescription>
              Platforms are inferred from compatible integrations linked to them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {derivedPlatforms.length > 0 ? (
              derivedPlatforms.map((platform) => (
                <div key={platform.slug} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{platform.name}</p>
                      <p className="text-xs text-slate-500">via {platform.via.join(', ')}</p>
                    </div>
                    <CompatibilityStatusBadge status={platform.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
                Add at least one integration compatibility row to derive platform compatibility.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RadioTower className="h-5 w-5 text-amber-700" />
              Direct Commercial Hub Compatibility
            </CardTitle>
            <CardDescription>
              Direct hub compatibility for ecosystems users evaluate as products.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreateHubDialog}>
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingHubs ? (
            <TableSkeleton rows={5} />
          ) : hubRows.length > 0 ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hub</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hubRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-950">{row.hub.name}</p>
                          <p className="text-xs text-slate-500">
                            {row.hub.manufacturer?.name ?? 'No manufacturer'}
                          </p>
                          {row.supportSummary ? (
                            <p className="mt-1 text-xs text-slate-600">{row.supportSummary}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <CompatibilityStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell>
                        <ReviewStateBadge state={row.reviewState} />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-900">{row.evidence.length}</p>
                          <div className="flex flex-wrap gap-1">
                            {row.evidence.slice(0, 3).map((evidence) => (
                              <span
                                key={evidence.id}
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                              >
                                {evidence.source}
                              </span>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatRelative(row.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditHubDialog(row)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-rose-600"
                            onClick={() => deleteHubMutation.mutate({ id: row.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
              No direct commercial hub rows yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={integrationDialogOpen} onOpenChange={setIntegrationDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingIntegration ? 'Edit integration compatibility' : 'Add integration compatibility'}
            </DialogTitle>
            <DialogDescription>
              Make the target explicit: this row is about an integration, not a generic hub.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Integration</Label>
              <Select
                value={integrationForm.integrationId}
                onValueChange={(value) => setIntegrationForm((current) => ({ ...current, integrationId: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select integration" />
                </SelectTrigger>
                <SelectContent>
                  {integrations.map((integration) => (
                    <SelectItem key={integration.id} value={String(integration.id)}>
                      {integration.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={integrationForm.status}
                onValueChange={(value) =>
                  setIntegrationForm((current) => ({
                    ...current,
                    status: value as IntegrationFormState['status'],
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

            <div>
              <Label>Review state</Label>
              <Select
                value={integrationForm.reviewState}
                onValueChange={(value) =>
                  setIntegrationForm((current) => ({
                    ...current,
                    reviewState: value as IntegrationFormState['reviewState'],
                  }))
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
                value={integrationForm.canonicalSource}
                onValueChange={(value) =>
                  setIntegrationForm((current) => ({
                    ...current,
                    canonicalSource: value as IntegrationFormState['canonicalSource'],
                  }))
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
                value={integrationForm.supportSummary}
                onChange={(event) =>
                  setIntegrationForm((current) => ({ ...current, supportSummary: event.target.value }))
                }
                className="min-h-24 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm"
              />
            </div>

            <div className="md:col-span-2">
              <Label>Internal notes</Label>
              <textarea
                value={integrationForm.internalNotes}
                onChange={(event) =>
                  setIntegrationForm((current) => ({ ...current, internalNotes: event.target.value }))
                }
                className="min-h-24 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm"
              />
            </div>

            <div>
              <Label>First seen</Label>
              <Input
                type="date"
                value={integrationForm.firstSeenAt}
                onChange={(event) =>
                  setIntegrationForm((current) => ({ ...current, firstSeenAt: event.target.value }))
                }
              />
            </div>

            <div>
              <Label>Last confirmed</Label>
              <Input
                type="date"
                value={integrationForm.lastConfirmedAt}
                onChange={(event) =>
                  setIntegrationForm((current) => ({
                    ...current,
                    lastConfirmedAt: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIntegrationDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitIntegrationForm}
              disabled={
                !integrationForm.integrationId ||
                createIntegrationMutation.isPending ||
                updateIntegrationMutation.isPending
              }
            >
              {editingIntegration ? 'Save Changes' : 'Add Integration Row'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hubDialogOpen} onOpenChange={setHubDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingHub ? 'Edit hub compatibility' : 'Add hub compatibility'}</DialogTitle>
            <DialogDescription>
              Use this only for direct commercial hub compatibility.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Commercial hub</Label>
              <Select
                value={hubForm.hubId}
                onValueChange={(value) => setHubForm((current) => ({ ...current, hubId: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select commercial hub" />
                </SelectTrigger>
                <SelectContent>
                  {commercialHubs.map((hub) => (
                    <SelectItem key={hub.id} value={String(hub.id)}>
                      {hub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={hubForm.status}
                onValueChange={(value) =>
                  setHubForm((current) => ({ ...current, status: value as HubFormState['status'] }))
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
                value={hubForm.reviewState}
                onValueChange={(value) =>
                  setHubForm((current) => ({ ...current, reviewState: value as HubFormState['reviewState'] }))
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
                value={hubForm.canonicalSource}
                onValueChange={(value) =>
                  setHubForm((current) => ({ ...current, canonicalSource: value as HubFormState['canonicalSource'] }))
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
                value={hubForm.supportSummary}
                onChange={(event) => setHubForm((current) => ({ ...current, supportSummary: event.target.value }))}
                className="min-h-24 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm"
              />
            </div>

            <div className="md:col-span-2">
              <Label>Internal notes</Label>
              <textarea
                value={hubForm.internalNotes}
                onChange={(event) => setHubForm((current) => ({ ...current, internalNotes: event.target.value }))}
                className="min-h-24 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm"
              />
            </div>

            <div>
              <Label>First seen</Label>
              <Input
                type="date"
                value={hubForm.firstSeenAt}
                onChange={(event) => setHubForm((current) => ({ ...current, firstSeenAt: event.target.value }))}
              />
            </div>

            <div>
              <Label>Last confirmed</Label>
              <Input
                type="date"
                value={hubForm.lastConfirmedAt}
                onChange={(event) => setHubForm((current) => ({ ...current, lastConfirmedAt: event.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHubDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitHubForm}
              disabled={!hubForm.hubId || createHubMutation.isPending || updateHubMutation.isPending}
            >
              {editingHub ? 'Save Changes' : 'Add Hub Row'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
