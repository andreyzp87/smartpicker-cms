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

type Platform = {
  id: number
  name: string
  slug: string
  kind: 'open_platform' | 'commercial_platform'
  manufacturer: { name: string } | null
  status: 'draft' | 'published' | 'archived'
  updatedAt: string | Date
  platformIntegrations: {
    integration: {
      compatibility: {
        productId: number
      }[]
    }
  }[]
}

interface PlatformsTableProps {
  platforms: Platform[]
}

function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function PlatformsTable({ platforms }: PlatformsTableProps) {
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const { confirm, Dialog } = useDeleteConfirm()

  const deleteMutation = trpc.platforms.delete.useMutation({
    onSuccess: async () => {
      await utils.platforms.list.invalidate()
      toast.success('Platform deleted')
    },
    onError: (error) => {
      toast.error(`Failed to delete platform: ${error.message}`)
    },
  })

  const columns: ColumnDef<Platform>[] = [
    {
      accessorKey: 'name',
      header: 'Platform',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-950">{row.original.name}</p>
          <p className="text-xs text-slate-500">{row.original.slug}</p>
        </div>
      ),
    },
    {
      accessorKey: 'kind',
      header: 'Kind',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.kind.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: 'manufacturer',
      header: 'Manufacturer',
      cell: ({ row }) => row.original.manufacturer?.name ?? 'Open/community',
    },
    {
      id: 'integrationCount',
      header: 'Integrations',
      cell: ({ row }) => row.original.platformIntegrations.length,
    },
    {
      id: 'coverage',
      header: 'Coverage',
      cell: ({ row }) => {
        const coverage = new Set(
          row.original.platformIntegrations.flatMap((link) =>
            link.integration.compatibility.map((compatibility) => compatibility.productId),
          ),
        )
        return coverage.size
      },
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
            <DropdownMenuItem onClick={() => navigate(`/platforms/${row.original.id}/edit`)}>
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
      <DataTable columns={columns} data={platforms} />
      <Dialog />
    </>
  )
}
