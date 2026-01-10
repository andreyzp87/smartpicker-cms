import { useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { ManufacturerForm } from '@/components/manufacturers/ManufacturerForm';
import { Card } from '@/components/ui/card';

export function ManufacturerCreate() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const createMutation = trpc.manufacturers.create.useMutation({
    onSuccess: () => {
      utils.manufacturers.list.invalidate();
      navigate('/manufacturers');
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Manufacturer</h1>

      <Card className="p-6">
        <ManufacturerForm
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </Card>
    </div>
  );
}
