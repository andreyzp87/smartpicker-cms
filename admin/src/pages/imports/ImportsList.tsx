import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { columns } from '@/components/imports/ImportsTable'
import { DataTable } from '@/components/ui/data-table'
import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { type ImportSource } from '@/shared/schemas'

type RawImport = {
  id: number
  source: 'zigbee2mqtt' | 'blakadder' | 'zwave-js'
  sourceId: string
  importedAt: string
  processedAt: string | null
}

type SourceFilter = ImportSource | 'all'
type ProcessedFilter = 'all' | 'true' | 'false'

function isImportSource(value: string): value is ImportSource {
  return value === 'zigbee2mqtt' || value === 'blakadder' || value === 'zwave-js'
}

export function ImportsList() {
  const [source, setSource] = useState<SourceFilter>('all')
  const [processed, setProcessed] = useState<ProcessedFilter>('all')

  const { data, isLoading, refetch } = trpc.imports.list.useQuery({
    source: source === 'all' ? undefined : source,
    processed: processed === 'all' ? undefined : processed === 'true',
    limit: 100,
    offset: 0,
  })

  const handleSourceChange = (value: string) => {
    if (
      value === 'all' ||
      value === 'zigbee2mqtt' ||
      value === 'blakadder' ||
      value === 'zwave-js'
    ) {
      setSource(value)
    }
  }

  const handleProcessedChange = (value: string) => {
    if (value === 'all' || value === 'true' || value === 'false') {
      setProcessed(value)
    }
  }

  const importRows: RawImport[] =
    data?.items.flatMap((item) =>
      isImportSource(item.source)
        ? [
            {
              id: item.id,
              source: item.source,
              sourceId: item.sourceId,
              importedAt: item.importedAt,
              processedAt: item.processedAt,
            },
          ]
        : [],
    ) ?? []

  const triggerMutation = trpc.imports.trigger.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Data Imports</h1>

        <div className="flex gap-2">
          <Select value={source} onValueChange={handleSourceChange}>
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

          <Select value={processed} onValueChange={handleProcessedChange}>
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
        <TableSkeleton rows={10} />
      ) : (
        <DataTable<RawImport, unknown> columns={columns} data={importRows} />
      )}
    </div>
  )
}
