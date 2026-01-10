import { useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ManufacturersTable } from '@/components/manufacturers/ManufacturersTable';

export function ManufacturersList() {
  const navigate = useNavigate();
  const { data, isLoading } = trpc.manufacturers.list.useQuery();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manufacturers</h1>
        <Button onClick={() => navigate('/manufacturers/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Manufacturer
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <ManufacturersTable manufacturers={data ?? []} />
      )}
    </div>
  );
}
