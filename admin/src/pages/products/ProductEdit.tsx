import { useParams, useNavigate } from 'react-router'
import { trpc } from '@/lib/trpc'
import { ProductForm } from '@/components/products/ProductForm'
import { ProductCompatibilityManager } from '@/components/compatibility/ProductCompatibilityManager'
import { PageIntro } from '@/components/layout/PageIntro'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { toast } from 'sonner'

export function ProductEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const { data: product, isLoading } = trpc.products.byId.useQuery({
    id: Number(id),
  })

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate()
      toast.success('Product updated successfully')
      navigate('/products')
    },
    onError: (error) => {
      toast.error(`Failed to update product: ${error.message}`)
    },
  })

  if (isLoading) {
    return <TableSkeleton rows={8} />
  }

  if (!product) return <div>Product not found</div>

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Edit"
        title={product.name}
        description="Update product metadata, inspect linked sources, and curate compatibility without leaving the product workflow."
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
          <CardContent className="p-6">
            <ProductForm
              initialData={product}
              onSubmit={(data) => updateMutation.mutate({ id: Number(id), data })}
              isLoading={updateMutation.isPending}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
            <CardHeader>
              <CardTitle>Product Snapshot</CardTitle>
              <CardDescription>Quick editorial context before changing compatibility.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Primary protocol</p>
                <p className="mt-2 font-medium text-slate-950">{product.primaryProtocol ?? 'Not set'}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Product role</p>
                <p className="mt-2 font-medium text-slate-950">{product.productRole}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Primary source</p>
                <p className="mt-2 font-medium text-slate-950">
                  {product.primarySource ? `${product.primarySource.source} / ${product.primarySource.sourceId}` : 'No primary source'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
            <CardHeader>
              <CardTitle>Linked Raw Sources</CardTitle>
              <CardDescription>Source provenance currently mapped to this canonical product.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.sources.length > 0 ? (
                product.sources.map((source) => (
                  <div key={source.id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="font-medium text-slate-950">
                      {source.rawImport.source} / {source.rawImport.sourceId}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {source.isPrimary ? 'Primary merge source' : 'Secondary source'} · confidence {source.mergeConfidence}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
                  No linked raw sources yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ProductCompatibilityManager productId={product.id} productName={product.name} />
    </div>
  )
}
