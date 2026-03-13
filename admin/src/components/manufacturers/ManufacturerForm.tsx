import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { manufacturerCreateSchema } from '@/shared/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ManufacturerFormData = {
  name: string
  slug: string
  website?: string | null
  logoUrl?: string | null
}

interface ManufacturerFormProps {
  initialData?: Partial<ManufacturerFormData>
  onSubmit: (data: ManufacturerFormData) => void
  isLoading?: boolean
}

export function ManufacturerForm({ initialData, onSubmit, isLoading }: ManufacturerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ManufacturerFormData>({
    resolver: zodResolver(manufacturerCreateSchema),
    defaultValues: initialData,
  })

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
          <Label htmlFor="website">Website</Label>
          <Input id="website" type="url" {...register('website')} />
          {errors.website && <p className="text-sm text-red-600 mt-1">{errors.website.message}</p>}
        </div>

        <div>
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input id="logoUrl" type="url" {...register('logoUrl')} />
          {errors.logoUrl && <p className="text-sm text-red-600 mt-1">{errors.logoUrl.message}</p>}
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Manufacturer'}
      </Button>
    </form>
  )
}
