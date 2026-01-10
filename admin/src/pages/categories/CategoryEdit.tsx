import { useParams, useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { Card } from '@/components/ui/card';

export function CategoryEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: category, isLoading } = trpc.categories.byId.useQuery({
    id: Number(id),
  });

  const updateMutation = trpc.categories.update.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      navigate('/categories');
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!category) return <div>Category not found</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Category</h1>

      <Card className="p-6">
        <CategoryForm
          initialData={category}
          onSubmit={(data) => updateMutation.mutate({ id: Number(id), data })}
          isLoading={updateMutation.isPending}
        />
      </Card>
    </div>
  );
}
