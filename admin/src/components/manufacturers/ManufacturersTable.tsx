import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { trpc } from '@/lib/trpc';
import { DataTable } from '@/components/ui/data-table';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

type Manufacturer = {
  id: number;
  name: string;
  slug: string;
  website: string | null;
};

interface ManufacturersTableProps {
  manufacturers: Manufacturer[];
}

export function ManufacturersTable({ manufacturers }: ManufacturersTableProps) {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { confirm, Dialog } = useDeleteConfirm();

  const deleteMutation = trpc.manufacturers.delete.useMutation({
    onSuccess: () => {
      utils.manufacturers.list.invalidate();
      toast.success('Manufacturer deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete manufacturer: ${error.message}`);
    },
  });

  const columns: ColumnDef<Manufacturer>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
    },
    {
      accessorKey: 'website',
      header: 'Website',
      cell: ({ row }) => {
        const website = row.getValue('website') as string | null;
        return website ? (
          <a href={website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {website}
          </a>
        ) : (
          <span className="text-gray-400">—</span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const manufacturer = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/manufacturers/${manufacturer.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => confirm(() => deleteMutation.mutate({ id: manufacturer.id }))}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <DataTable<Manufacturer, unknown> columns={columns} data={manufacturers} />
      <Dialog />
    </>
  );
}
