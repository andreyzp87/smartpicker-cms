import { useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CategoriesTable } from '@/components/categories/CategoriesTable';

export function CategoriesList() {
  const navigate = useNavigate();
  const { data, isLoading } = trpc.categories.list.useQuery();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
        <Button onClick={() => navigate('/categories/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <CategoriesTable categories={data ?? []} />
      )}
    </div>
  );
}
