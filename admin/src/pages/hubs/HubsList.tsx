import { useNavigate } from 'react-router'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { HubsTable } from '@/components/hubs/HubsTable'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'

export function HubsList() {
  const navigate = useNavigate()
  const { data, isLoading } = trpc.hubs.list.useQuery()

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Hubs</h1>
        <Button onClick={() => navigate('/hubs/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Hub
        </Button>
      </div>

      {isLoading ? <TableSkeleton rows={10} /> : <HubsTable hubs={data ?? []} />}
    </div>
  )
}
