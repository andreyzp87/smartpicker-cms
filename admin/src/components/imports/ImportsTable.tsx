import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type RawImport = {
  id: number;
  source: 'zigbee2mqtt' | 'blakadder' | 'zwave-js';
  sourceId: string;
  importedAt: Date;
  processedAt: Date | null;
};

export const columns: ColumnDef<RawImport>[] = [
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => {
      const source = row.getValue('source') as string;
      return <Badge variant="outline">{source}</Badge>;
    },
  },
  {
    accessorKey: 'sourceId',
    header: 'Source ID',
  },
  {
    accessorKey: 'importedAt',
    header: 'Imported',
    cell: ({ row }) => {
      const date = row.getValue('importedAt') as Date;
      return format(new Date(date), 'PPp');
    },
  },
  {
    accessorKey: 'processedAt',
    header: 'Status',
    cell: ({ row }) => {
      const processed = row.getValue('processedAt') as Date | null;
      return processed ? (
        <Badge className="bg-green-500">Processed</Badge>
      ) : (
        <Badge variant="secondary">Pending</Badge>
      );
    },
  },
];
