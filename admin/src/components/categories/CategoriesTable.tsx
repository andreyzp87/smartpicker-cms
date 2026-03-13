import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Pencil, Trash } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { trpc } from '@/lib/trpc'
import { DataTable } from '@/components/ui/data-table'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

type Category = {
  id: number
  name: string
  slug: string
  sortOrder: number
  parentId: number | null
  parent?: {
    name: string
  } | null
}

interface CategoriesTableProps {
  categories: Category[]
}

export function CategoriesTable({ categories }: CategoriesTableProps) {
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const { confirm, Dialog } = useDeleteConfirm()

  const deleteMutation = trpc.categories.delete.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate()
      toast.success('Category deleted successfully')
    },
    onError: (error) => {
      toast.error(`Failed to delete category: ${error.message}`)
    },
  })

  const columns: ColumnDef<Category>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
    },
    {
      accessorKey: 'parent',
      header: 'Parent Category',
      cell: ({ row }) => {
        const parent = row.original.parent
        return parent ? <span>{parent.name}</span> : <span className="text-gray-400">—</span>
      },
    },
    {
      accessorKey: 'sortOrder',
      header: 'Sort Order',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const category = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/categories/${category.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => confirm(() => deleteMutation.mutate({ id: category.id }))}
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
      <DataTable<Category, unknown> columns={columns} data={categories} />
      <Dialog />
    </>
  )
}
