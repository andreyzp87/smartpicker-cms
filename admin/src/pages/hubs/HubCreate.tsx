import { useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { HubForm } from '@/components/hubs/HubForm';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export function HubCreate() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const createMutation = trpc.hubs.create.useMutation({
    onSuccess: () => {
      utils.hubs.list.invalidate();
      toast.success('Hub created successfully');
      navigate('/hubs');
    },
    onError: (error) => {
      toast.error(`Failed to create hub: ${error.message}`);
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Hub</h1>

      <Card className="p-6">
        <HubForm
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </Card>
    </div>
  );
}
