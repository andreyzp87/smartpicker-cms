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
import { PRODUCT_STATUSES } from '@/shared/constants'
import { toast } from 'sonner'

type CommercialHub = {
  id: number
  name: string
  slug: string
  manufacturer: { name: string } | null
  status: 'draft' | 'published' | 'archived'
  updatedAt: string | Date
  compatibility: { id: number }[]
}

interface CommercialHubsTableProps {
  hubs: CommercialHub[]
}

function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function CommercialHubsTable({ hubs }: CommercialHubsTableProps) {
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const { confirm, Dialog } = useDeleteConfirm()

  const deleteMutation = trpc.commercialHubs.delete.useMutation({
    onSuccess: async () => {
      await utils.commercialHubs.list.invalidate()
      toast.success('Commercial hub deleted')
    },
    onError: (error) => {
      toast.error(`Failed to delete hub: ${error.message}`)
    },
  })

  const columns: ColumnDef<CommercialHub>[] = [
    {
      accessorKey: 'name',
      header: 'Commercial hub',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-950">{row.original.name}</p>
          <p className="text-xs text-slate-500">{row.original.slug}</p>
        </div>
      ),
    },
    {
      accessorKey: 'manufacturer',
      header: 'Manufacturer',
      cell: ({ row }) => row.original.manufacturer?.name ?? '—',
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
            <DropdownMenuItem onClick={() => navigate(`/commercial-hubs/${row.original.id}/edit`)}>
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
      <DataTable columns={columns} data={hubs} />
      <Dialog />
    </>
  )
}
