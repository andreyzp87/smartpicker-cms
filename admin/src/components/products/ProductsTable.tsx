import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PROTOCOLS, PRODUCT_STATUSES } from '@/shared/constants';

type Product = {
  id: number;
  name: string;
  model: string;
  slug: string;
  primaryProtocol: string;
  status: 'draft' | 'published' | 'archived';
  manufacturerId: number | null;
  createdAt: Date;
};

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'model',
    header: 'Model',
  },
  {
    accessorKey: 'primaryProtocol',
    header: 'Protocol',
    cell: ({ row }) => {
      const protocol = row.getValue('primaryProtocol') as string;
      const protocolInfo = PROTOCOLS[protocol as keyof typeof PROTOCOLS];
      return (
        <Badge variant="outline" style={{ borderColor: protocolInfo?.color }}>
          {protocolInfo?.name ?? protocol}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const statusInfo = PRODUCT_STATUSES[status as keyof typeof PRODUCT_STATUSES];
      return (
        <Badge style={{ backgroundColor: statusInfo?.color }}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const product = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.location.href = `/products/${product.id}/edit`}>
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
