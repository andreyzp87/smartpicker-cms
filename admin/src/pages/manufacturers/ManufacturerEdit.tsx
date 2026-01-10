import { useParams, useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { ManufacturerForm } from '@/components/manufacturers/ManufacturerForm';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export function ManufacturerEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: manufacturer, isLoading } = trpc.manufacturers.byId.useQuery({
    id: Number(id),
  });

  const updateMutation = trpc.manufacturers.update.useMutation({
    onSuccess: () => {
      utils.manufacturers.list.invalidate();
      toast.success('Manufacturer updated successfully');
      navigate('/manufacturers');
    },
    onError: (error) => {
      toast.error(`Failed to update manufacturer: ${error.message}`);
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!manufacturer) return <div>Manufacturer not found</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Manufacturer</h1>

      <Card className="p-6">
        <ManufacturerForm
          initialData={manufacturer}
          onSubmit={(data) => updateMutation.mutate({ id: Number(id), data })}
          isLoading={updateMutation.isPending}
        />
      </Card>
    </div>
  );
}
