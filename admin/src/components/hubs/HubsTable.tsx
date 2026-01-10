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

export const columns: ColumnDef<Hub>[] = [
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
            <DropdownMenuItem onClick={() => window.location.href = `/hubs/${hub.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
