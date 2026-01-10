import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

type Hub = {
  id: number;
  name: string;
  slug: string;
  manufacturerId: number | null;
  manufacturer?: {
    name: string;
  } | null | any;
  protocolsSupported: string[] | null;
};

interface HubsTableProps {
  hubs: Hub[];
}

export function HubsTable({ hubs }: HubsTableProps) {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { confirm, Dialog } = useDeleteConfirm();

  const deleteMutation = trpc.hubs.delete.useMutation({
    onSuccess: () => {
      utils.hubs.list.invalidate();
    },
  });

  const columns: ColumnDef<Hub>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
    },
    {
      accessorKey: 'manufacturer',
      header: 'Manufacturer',
      cell: ({ row }) => {
        const manufacturer = row.original.manufacturer;
        return manufacturer ? (
          <span>{manufacturer.name}</span>
        ) : (
          <span className="text-gray-400">—</span>
        );
      },
    },
    {
      accessorKey: 'protocolsSupported',
      header: 'Protocols',
      cell: ({ row }) => {
        const protocols = row.getValue('protocolsSupported') as string[] | null;
        if (!protocols || protocols.length === 0) {
          return <span className="text-gray-400">—</span>;
        }
        return (
          <div className="flex gap-1 flex-wrap">
            {protocols.map((protocol) => (
              <Badge key={protocol} variant="outline">
                {protocol}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const hub = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/hubs/${hub.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => confirm(() => deleteMutation.mutate({ id: hub.id }))}
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
      <DataTable<Hub, unknown> columns={columns} data={hubs} />
      <Dialog />
    </>
  );
}
