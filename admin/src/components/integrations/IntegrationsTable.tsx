import { ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Pencil, Trash } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { trpc } from '@/lib/trpc'
import { PRODUCT_STATUSES, PROTOCOLS } from '@/shared/constants'
import { toast } from 'sonner'

type Integration = {
  id: number
  name: string
  slug: string
  primaryProtocol:
    | 'zigbee'
    | 'zwave'
    | 'matter'
    | 'wifi'
    | 'thread'
    | 'bluetooth'
    | 'proprietary'
    | 'multi'
    | null
  integrationKind:
    | 'protocol_stack'
    | 'bridge'
    | 'native_component'
    | 'vendor_connector'
    | 'addon'
    | 'external_service'
  status: 'draft' | 'published' | 'archived'
  updatedAt: string | Date
  platformIntegrations: { id: number }[]
  hardwareSupport: { id: number }[]
  compatibility: { id: number }[]
}

interface IntegrationsTableProps {
  integrations: Integration[]
}

function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function IntegrationsTable({ integrations }: IntegrationsTableProps) {
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const { confirm, Dialog } = useDeleteConfirm()

  const deleteMutation = trpc.integrations.delete.useMutation({
    onSuccess: async () => {
      await utils.integrations.list.invalidate()
      toast.success('Integration deleted')
    },
    onError: (error) => {
      toast.error(`Failed to delete integration: ${error.message}`)
    },
  })

  const columns: ColumnDef<Integration>[] = [
    {
      accessorKey: 'name',
      header: 'Integration',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-950">{row.original.name}</p>
          <p className="text-xs text-slate-500">{row.original.slug}</p>
        </div>
      ),
    },
    {
      accessorKey: 'primaryProtocol',
      header: 'Protocol',
      cell: ({ row }) => {
        const protocol = row.original.primaryProtocol
        if (!protocol) return '—'
        return <Badge variant="outline">{PROTOCOLS[protocol].name}</Badge>
      },
    },
    {
      accessorKey: 'integrationKind',
      header: 'Kind',
      cell: ({ row }) => (
        <span className="capitalize text-slate-700">
          {row.original.integrationKind.replaceAll('_', ' ')}
        </span>
      ),
    },
    {
      id: 'platformCount',
      header: 'Platforms',
      cell: ({ row }) => row.original.platformIntegrations.length,
    },
    {
      id: 'compatibilityCount',
      header: 'Compatible devices',
      cell: ({ row }) => row.original.compatibility.length,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <Badge
            variant="outline"
            className="border-transparent"
            style={{ backgroundColor: PRODUCT_STATUSES[status].color, color: 'white' }}
          >
            {PRODUCT_STATUSES[status].name}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => formatRelative(row.original.updatedAt),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/integrations/${row.original.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => confirm(() => deleteMutation.mutate({ id: row.original.id }))}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <DataTable columns={columns} data={integrations} />
      <Dialog />
    </>
  )
}
