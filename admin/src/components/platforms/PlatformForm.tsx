import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { platformCreateSchema } from '@/shared/schemas'
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

type PlatformFormInput = z.input<typeof platformCreateSchema>
type PlatformFormOutput = z.output<typeof platformCreateSchema>

interface PlatformFormProps {
  initialData?: Partial<PlatformFormInput>
  onSubmit: (data: PlatformFormOutput) => void
  isLoading?: boolean
}

export function PlatformForm({ initialData, onSubmit, isLoading }: PlatformFormProps) {
  const { data: manufacturers } = trpc.manufacturers.list.useQuery()
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PlatformFormInput, unknown, PlatformFormOutput>({
    resolver: zodResolver(platformCreateSchema),
    defaultValues: initialData ?? {
      kind: 'open_platform',
      status: 'draft',
    },
  })

  const manufacturerId = watch('manufacturerId')
  const kind = watch('kind') ?? 'open_platform'
  const status = watch('status') ?? 'draft'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Platform name</Label>
          <Input id="name" {...register('name')} />
          {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name.message}</p> : null}
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" {...register('slug')} />
          {errors.slug ? <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p> : null}
        </div>
        <div>
          <Label htmlFor="kind">Platform kind</Label>
          <Select value={kind} onValueChange={(value) => setValue('kind', value as typeof kind)}>
            <SelectTrigger id="kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open_platform">Open platform</SelectItem>
              <SelectItem value="commercial_platform">Commercial platform</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Publishing status</Label>
          <Select
            value={status}
            onValueChange={(value) => setValue('status', value as typeof status)}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="manufacturerId">Manufacturer</Label>
          <Select
            value={manufacturerId?.toString() ?? 'none'}
            onValueChange={(value) =>
              setValue('manufacturerId', value === 'none' ? null : Number(value))
            }
          >
            <SelectTrigger id="manufacturerId">
              <SelectValue placeholder="Select manufacturer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {manufacturers?.map((manufacturer) => (
                <SelectItem key={manufacturer.id} value={manufacturer.id.toString()}>
                  {manufacturer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="website">Documentation URL</Label>
          <Input id="website" type="url" {...register('website')} />
          {errors.website ? (
            <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
          ) : null}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          {...register('description')}
          className="min-h-32 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm"
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Platform'}
      </Button>
    </form>
  )
}
