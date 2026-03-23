import { useNavigate } from 'react-router'
import { trpc } from '@/lib/trpc'
import { ProductForm } from '@/components/products/ProductForm'
import { PageIntro } from '@/components/layout/PageIntro'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export function ProductCreate() {
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate()
      toast.success('Product created successfully')
      navigate('/products')
    },
    onError: (error) => {
      toast.error(`Failed to create product: ${error.message}`)
    },
  })

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Create"
        title="New Product"
        description="Create endpoint devices and infrastructure hardware in the same catalog. Compatibility editing happens after the product exists."
      />

      <Card className="border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
        <CardContent className="p-6">
          <ProductForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
