import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Package, Plus } from 'lucide-react'
import { PageIntro } from '@/components/layout/PageIntro'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { ProductsTable } from '@/components/products/ProductsTable'
import { trpc } from '@/lib/trpc'

type ProductRow = {
  id: number
  name: string
  model: string | null
  slug: string
  manufacturer: string | null
  category: string | null
  primaryProtocol: string | null
  productRole: 'endpoint' | 'infrastructure'
  integrationCompatibilityCount: number
  hubCompatibilityCount: number
  status: 'draft' | 'published' | 'archived'
  updatedAt: string
}

export function ProductsList() {
  const navigate = useNavigate()
  const { data, isLoading } = trpc.products.list.useQuery({
    limit: 100,
    offset: 0,
    sortField: 'updatedAt',
    sortOrder: 'desc',
  })
  const { data: manufacturers = [] } = trpc.manufacturers.list.useQuery()
  const { data: categories = [] } = trpc.categories.list.useQuery()
  const { data: integrationRows = [] } = trpc.compatibility.integrationList.useQuery()
  const { data: hubRows = [] } = trpc.compatibility.hubList.useQuery()

  const products = useMemo<ProductRow[]>(() => {
    const manufacturerMap = new Map(manufacturers.map((item) => [item.id, item.name]))
    const categoryMap = new Map(categories.map((item) => [item.id, item.name]))
    const integrationCountMap = new Map<number, number>()
    const hubCountMap = new Map<number, number>()

    for (const row of integrationRows) {
      integrationCountMap.set(row.productId, (integrationCountMap.get(row.productId) ?? 0) + 1)
    }

    for (const row of hubRows) {
      hubCountMap.set(row.productId, (hubCountMap.get(row.productId) ?? 0) + 1)
    }

    return (
      data?.items.map((item) => ({
        id: item.id,
        name: item.name,
        model: item.model,
        slug: item.slug,
        manufacturer: item.manufacturerId ? manufacturerMap.get(item.manufacturerId) ?? null : null,
        category: item.categoryId ? categoryMap.get(item.categoryId) ?? null : null,
        primaryProtocol: item.primaryProtocol,
        productRole: item.productRole,
        integrationCompatibilityCount: integrationCountMap.get(item.id) ?? 0,
        hubCompatibilityCount: hubCountMap.get(item.id) ?? 0,
        status: item.status,
        updatedAt: item.updatedAt,
      })) ?? []
    )
  }, [categories, data?.items, hubRows, integrationRows, manufacturers])

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Catalog"
        title="Products"
        description="Manage endpoint devices and infrastructure hardware in one place. Compatibility counts are split by integrations and direct commercial hubs."
        actions={
          <Button onClick={() => navigate('/products/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        }
      />

      <Card className="border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardContent className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sky-700">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Product Catalog</h2>
              <p className="text-sm text-slate-600">
                Products now expose protocol, role, and compatibility spread directly in the list.
              </p>
            </div>
          </div>

          {isLoading ? <TableSkeleton rows={10} /> : <ProductsTable products={products} />}
        </CardContent>
      </Card>
    </div>
  )
}
