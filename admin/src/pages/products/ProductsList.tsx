import { useNavigate } from 'react-router'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ProductsTable } from '@/components/products/ProductsTable'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'

type Product = {
  id: number
  name: string
  model: string | null
  slug: string
  primaryProtocol: string | null
  status: 'draft' | 'published' | 'archived'
  manufacturerId: number | null
  createdAt: string
}

export function ProductsList() {
  const navigate = useNavigate()
  const { data, isLoading } = trpc.products.list.useQuery({
    limit: 50,
    offset: 0,
    sortField: 'createdAt',
    sortOrder: 'desc',
  })

  const products: Product[] =
    data?.items.map((item) => ({
      id: item.id,
      name: item.name,
      model: item.model,
      slug: item.slug,
      primaryProtocol: item.primaryProtocol,
      status: item.status,
      manufacturerId: item.manufacturerId,
      createdAt: item.createdAt,
    })) ?? []

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <Button onClick={() => navigate('/products/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {isLoading ? <TableSkeleton rows={10} /> : <ProductsTable products={products} />}
    </div>
  )
}
