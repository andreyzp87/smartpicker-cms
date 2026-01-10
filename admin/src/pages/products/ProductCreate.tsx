import { useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { ProductForm } from '@/components/products/ProductForm';
import { Card } from '@/components/ui/card';

export function ProductCreate() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      navigate('/products');
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Product</h1>

      <Card className="p-6">
        <ProductForm
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </Card>
    </div>
  );
}
