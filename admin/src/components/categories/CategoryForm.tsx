import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categoryCreateSchema } from '@/shared/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc'

type CategoryFormData = {
  name: string
  slug: string
  parentId?: number | null
  sortOrder?: number
}

interface CategoryFormProps {
  initialData?: Partial<CategoryFormData>
  onSubmit: (data: CategoryFormData) => void
  isLoading?: boolean
}

export function CategoryForm({ initialData, onSubmit, isLoading }: CategoryFormProps) {
  const { data: categories } = trpc.categories.list.useQuery()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryCreateSchema),
    defaultValues: initialData ?? {
      sortOrder: 0,
    },
  })

  const parentId = watch('parentId')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" {...register('slug')} />
          {errors.slug && <p className="text-sm text-red-600 mt-1">{errors.slug.message}</p>}
        </div>

        <div>
          <Label htmlFor="parentId">Parent Category</Label>
          <Select
            value={parentId?.toString() ?? 'none'}
            onValueChange={(value) => setValue('parentId', value === 'none' ? null : Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select parent category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Top Level)</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.parentId && (
            <p className="text-sm text-red-600 mt-1">{errors.parentId.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input id="sortOrder" type="number" {...register('sortOrder', { valueAsNumber: true })} />
          {errors.sortOrder && (
            <p className="text-sm text-red-600 mt-1">{errors.sortOrder.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Category'}
      </Button>
    </form>
  )
}
