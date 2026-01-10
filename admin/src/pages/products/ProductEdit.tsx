import { useParams, useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { ProductForm } from '@/components/products/ProductForm';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: product, isLoading } = trpc.products.byId.useQuery({
    id: Number(id),
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      toast.success('Product updated successfully');
      navigate('/products');
    },
    onError: (error) => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Product</h1>

      <Card className="p-6">
        <ProductForm
          initialData={product}
          onSubmit={(data) => updateMutation.mutate({ id: Number(id), data })}
          isLoading={updateMutation.isPending}
        />
      </Card>
    </div>
  );
}
