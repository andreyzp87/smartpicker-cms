import { useParams, useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { HubForm } from '@/components/hubs/HubForm';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export function HubEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: hub, isLoading } = trpc.hubs.byId.useQuery({
    id: Number(id),
  });

  const updateMutation = trpc.hubs.update.useMutation({
    onSuccess: () => {
      utils.hubs.list.invalidate();
      toast.success('Hub updated successfully');
      navigate('/hubs');
    },
    onError: (error) => {
      toast.error(`Failed to update hub: ${error.message}`);
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!hub) return <div>Hub not found</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Hub</h1>

      <Card className="p-6">
        <HubForm
          initialData={{
            ...hub,
            protocolsSupported: (hub.protocolsSupported || []) as any,
          }}
          onSubmit={(data) => updateMutation.mutate({ id: Number(id), data })}
          isLoading={updateMutation.isPending}
        />
      </Card>
    </div>
  );
}
