import { ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Pencil, Trash } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PROTOCOLS, PRODUCT_STATUSES } from '@/shared/constants'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { trpc } from '@/lib/trpc'
import { DataTable } from '@/components/ui/data-table'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

type Product = {
  id: number
  name: string
  model: string | null
  slug: string
  manufacturer: string | null
  category: string | null
  primaryProtocol: string | null
  productRole: 'endpoint' | 'infrastructure'
  integrationCompatibilityCount: number
  hubCompatibilityCount: number
  status: 'draft' | 'published' | 'archived'
  updatedAt: string
}

interface ProductsTableProps {
  products: Product[]
}

export function ProductsTable({ products }: ProductsTableProps) {
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const { confirm, Dialog } = useDeleteConfirm()

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate()
      toast.success('Product deleted successfully')
    },
    onError: (error) => {
      toast.error(`Failed to delete product: ${error.message}`)
    },
  })

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'name',
      header: 'Product',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-950">{row.original.name}</p>
          <p className="text-xs text-slate-500">{row.original.slug}</p>
        </div>
      ),
    },
    {
      accessorKey: 'model',
      header: 'Model',
    },
    {
      accessorKey: 'manufacturer',
      header: 'Manufacturer',
      cell: ({ row }) => row.original.manufacturer ?? <span className="text-slate-400">—</span>,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => row.original.category ?? <span className="text-slate-400">—</span>,
    },
    {
      accessorKey: 'primaryProtocol',
      header: 'Protocol',
      cell: ({ row }) => {
        const protocol = row.original.primaryProtocol
        if (!protocol) return <span className="text-slate-400">—</span>
        const protocolInfo = PROTOCOLS[protocol as keyof typeof PROTOCOLS]
        return (
          <Badge variant="outline" style={{ borderColor: protocolInfo?.color }}>
            {protocolInfo?.name ?? protocol}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'productRole',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.productRole}
        </Badge>
      ),
    },
    {
      accessorKey: 'integrationCompatibilityCount',
      header: 'Integration rows',
    },
    {
      accessorKey: 'hubCompatibilityCount',
      header: 'Hub rows',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status
        const statusInfo = PRODUCT_STATUSES[status as keyof typeof PRODUCT_STATUSES]
        return (
          <Badge
            variant="outline"
            className="border-transparent text-white"
            style={{ backgroundColor: statusInfo?.color }}
          >
            {statusInfo?.name ?? status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => formatDistanceToNow(new Date(row.original.updatedAt), { addSuffix: true }),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const product = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/products/${product.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => confirm(() => deleteMutation.mutate({ id: product.id }))}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <>
      <DataTable<Product, unknown> columns={columns} data={products} />
      <Dialog />
    </>
  )
}
