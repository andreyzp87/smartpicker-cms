import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CompatibilityStatusBadge, ReviewStateBadge } from '@/components/compatibility/CompatibilityBadges'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type PlatformLinkForm = {
  platformId: string
  supportType: 'native' | 'addon' | 'external' | 'community'
  notes: string
}

type HardwareSupportForm = {
  productId: string
  requirementType: 'required' | 'recommended' | 'supported'
  notes: string
}

function defaultPlatformLink(platformId?: number): PlatformLinkForm {
  return {
    platformId: platformId ? String(platformId) : '',
    supportType: 'addon',
    notes: '',
  }
}

function defaultHardwareSupport(productId?: number): HardwareSupportForm {
  return {
    productId: productId ? String(productId) : '',
    requirementType: 'supported',
    notes: '',
  }
}

export function IntegrationRelationshipsManager({
  integrationId,
  integration,
}: {
  integrationId: number
  integration: {
    platformIntegrations: {
      platformId: number
      supportType: 'native' | 'addon' | 'external' | 'community'
      notes: string | null
      platform: {
        id: number
        name: string
        kind: 'open_platform' | 'commercial_platform'
      }
    }[]
    hardwareSupport: {
      productId: number
      requirementType: 'required' | 'recommended' | 'supported'
      notes: string | null
      product: {
        id: number
        name: string
        model: string | null
      }
    }[]
    compatibility: {
      id: number
      status: 'verified' | 'supported' | 'reported' | 'untested' | 'incompatible'
      reviewState: 'pending' | 'approved' | 'rejected'
      product: {
        name: string
        manufacturer: { name: string } | null
      }
      evidence: { id: number }[]
    }[]
  }
}) {
  const utils = trpc.useUtils()
  const { data: platforms = [] } = trpc.platforms.list.useQuery()
  const { data: productsData } = trpc.products.list.useQuery({
    limit: 200,
    offset: 0,
    sortField: 'name',
    sortOrder: 'asc',
  })

  const infrastructureProducts = useMemo(
    () => (productsData?.items ?? []).filter((product) => product.productRole === 'infrastructure'),
    [productsData?.items],
  )

  const [platformDialogOpen, setPlatformDialogOpen] = useState(false)
  const [hardwareDialogOpen, setHardwareDialogOpen] = useState(false)
  const [platformForm, setPlatformForm] = useState<PlatformLinkForm>(defaultPlatformLink())
  const [hardwareForm, setHardwareForm] = useState<HardwareSupportForm>(defaultHardwareSupport())

  const refresh = async () => {
    await Promise.all([
      utils.integrations.byId.invalidate({ id: integrationId }),
      utils.integrations.list.invalidate(),
      utils.platforms.list.invalidate(),
      utils.compatibility.productIntegrationsByIntegrationId.invalidate({ integrationId }),
    ])
  }

  const addPlatformMutation = trpc.integrations.addPlatformLink.useMutation({
    onSuccess: async () => {
      toast.success('Platform link added')
      setPlatformDialogOpen(false)
      setPlatformForm(defaultPlatformLink())
      await refresh()
    },
    onError: (error) => toast.error(`Failed to add platform link: ${error.message}`),
  })

  const removePlatformMutation = trpc.integrations.removePlatformLink.useMutation({
    onSuccess: async () => {
      toast.success('Platform link removed')
      await refresh()
    },
    onError: (error) => toast.error(`Failed to remove platform link: ${error.message}`),
  })

  const addHardwareMutation = trpc.integrations.addHardwareSupport.useMutation({
    onSuccess: async () => {
      toast.success('Hardware support link added')
      setHardwareDialogOpen(false)
      setHardwareForm(defaultHardwareSupport())
      await refresh()
    },
    onError: (error) => toast.error(`Failed to add hardware support: ${error.message}`),
  })

  const removeHardwareMutation = trpc.integrations.removeHardwareSupport.useMutation({
    onSuccess: async () => {
      toast.success('Hardware support link removed')
      await refresh()
    },
    onError: (error) => toast.error(`Failed to remove hardware support: ${error.message}`),
  })

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-6">
        <Card className="border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Linked Platforms</CardTitle>
              <CardDescription>
                Editors can declare how this integration is available within each platform.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setPlatformDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Link
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {integration.platformIntegrations.length > 0 ? (
              integration.platformIntegrations.map((link) => (
                <div key={link.platformId} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{link.platform.name}</p>
                      <p className="text-xs text-slate-500">{link.platform.kind.replace('_', ' ')}</p>
                      <p className="mt-2 text-sm text-slate-600">{link.supportType}</p>
                      {link.notes ? <p className="mt-1 text-xs text-slate-500">{link.notes}</p> : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-rose-600"
                      onClick={() =>
                        removePlatformMutation.mutate({
                          platformId: link.platformId,
                          integrationId,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
                No platform links yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Supported Hardware</CardTitle>
              <CardDescription>
                Infrastructure hardware stays queryable instead of being buried in notes.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setHardwareDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Hardware
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {integration.hardwareSupport.length > 0 ? (
              integration.hardwareSupport.map((support) => (
                <div key={support.productId} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{support.product.name}</p>
                      <p className="text-xs text-slate-500">{support.product.model ?? 'No model'}</p>
                      <p className="mt-2 text-sm text-slate-600">{support.requirementType}</p>
                      {support.notes ? <p className="mt-1 text-xs text-slate-500">{support.notes}</p> : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-rose-600"
                      onClick={() =>
                        removeHardwareMutation.mutate({
                          integrationId,
                          productId: support.productId,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
                No hardware support rows yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardHeader>
          <CardTitle>Product Compatibility Snapshot</CardTitle>
          <CardDescription>
            Canonical rows currently anchored to this integration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integration.compatibility.length > 0 ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Evidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integration.compatibility.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-950">{row.product.name}</p>
                          <p className="text-xs text-slate-500">{row.product.manufacturer?.name ?? '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CompatibilityStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell>
                        <ReviewStateBadge state={row.reviewState} />
                      </TableCell>
                      <TableCell>{row.evidence.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
              No canonical compatibility rows yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={platformDialogOpen} onOpenChange={setPlatformDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add platform link</DialogTitle>
            <DialogDescription>
              Declare where this integration is available and how it is supported.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <Label>Platform</Label>
              <Select
                value={platformForm.platformId}
                onValueChange={(value) => setPlatformForm((current) => ({ ...current, platformId: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform.id} value={String(platform.id)}>
                      {platform.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Support type</Label>
              <Select
                value={platformForm.supportType}
                onValueChange={(value) =>
                  setPlatformForm((current) => ({
                    ...current,
                    supportType: value as PlatformLinkForm['supportType'],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="native">native</SelectItem>
                  <SelectItem value="addon">addon</SelectItem>
                  <SelectItem value="external">external</SelectItem>
                  <SelectItem value="community">community</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <textarea
                value={platformForm.notes}
                onChange={(event) => setPlatformForm((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-24 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPlatformDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                addPlatformMutation.mutate({
                  platformId: Number(platformForm.platformId),
                  integrationId,
                  supportType: platformForm.supportType,
                  notes: platformForm.notes || null,
                })
              }
              disabled={!platformForm.platformId || addPlatformMutation.isPending}
            >
              Add Platform Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hardwareDialogOpen} onOpenChange={setHardwareDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add hardware support</DialogTitle>
            <DialogDescription>
              Reference an infrastructure product that this integration needs or supports.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <Label>Infrastructure product</Label>
              <Select
                value={hardwareForm.productId}
                onValueChange={(value) => setHardwareForm((current) => ({ ...current, productId: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select hardware" />
                </SelectTrigger>
                <SelectContent>
                  {infrastructureProducts.map((product) => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Requirement type</Label>
              <Select
                value={hardwareForm.requirementType}
                onValueChange={(value) =>
                  setHardwareForm((current) => ({
                    ...current,
                    requirementType: value as HardwareSupportForm['requirementType'],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="required">required</SelectItem>
                  <SelectItem value="recommended">recommended</SelectItem>
                  <SelectItem value="supported">supported</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <textarea
                value={hardwareForm.notes}
                onChange={(event) => setHardwareForm((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-24 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHardwareDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                addHardwareMutation.mutate({
                  integrationId,
                  productId: Number(hardwareForm.productId),
                  requirementType: hardwareForm.requirementType,
                  notes: hardwareForm.notes || null,
                })
              }
              disabled={!hardwareForm.productId || addHardwareMutation.isPending}
            >
              Add Hardware Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
