import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { columns } from '@/components/imports/ImportsTable';
import { DataTable } from '@/components/ui/data-table';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type RawImport = {
  id: number;
  source: 'zigbee2mqtt' | 'blakadder' | 'zwave-js';
  sourceId: string;
  importedAt: Date;
  processedAt: Date | null;
};

export function ImportsList() {
  const [source, setSource] = useState<string>('all');
  const [processed, setProcessed] = useState<string>('all');

  const { data, isLoading, refetch } = trpc.imports.list.useQuery({
    source: source === 'all' ? undefined : source as any,
    processed: processed === 'all' ? undefined : processed === 'true',
    limit: 100,
    offset: 0,
  });

  const triggerMutation = trpc.imports.trigger.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Data Imports</h1>

        <div className="flex gap-2">
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="zigbee2mqtt">Zigbee2MQTT</SelectItem>
              <SelectItem value="blakadder">Blakadder</SelectItem>
              <SelectItem value="zwave-js">Z-Wave JS</SelectItem>
            </SelectContent>
          </Select>

          <Select value={processed} onValueChange={setProcessed}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Processed</SelectItem>
              <SelectItem value="false">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => triggerMutation.mutate({ source: 'zigbee2mqtt' })}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Trigger Import
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <DataTable<RawImport, unknown> columns={columns} data={(data?.items ?? []) as RawImport[]} />
      )}
    </div>
  );
}
