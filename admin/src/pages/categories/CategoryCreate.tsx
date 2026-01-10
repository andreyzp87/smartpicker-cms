import { useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { Card } from '@/components/ui/card';

export function CategoryCreate() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const createMutation = trpc.categories.create.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      navigate('/categories');
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Category</h1>

      <Card className="p-6">
        <CategoryForm
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </Card>
    </div>
  );
}
