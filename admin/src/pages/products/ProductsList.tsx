import { useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProductsTable } from '@/components/products/ProductsTable';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

type Product = {
  id: number;
  name: string;
  model: string;
  slug: string;
  primaryProtocol: string;
  status: 'draft' | 'published' | 'archived';
  manufacturerId: number | null;
  createdAt: Date;
};

export function ProductsList() {
  const navigate = useNavigate();
  const { data, isLoading } = trpc.products.list.useQuery({
    limit: 50,
    offset: 0,
    sortField: 'createdAt',
    sortOrder: 'desc',
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <Button onClick={() => navigate('/products/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} />
      ) : (
        <ProductsTable products={(data?.items ?? []) as Product[]} />
      )}
    </div>
  );
}
