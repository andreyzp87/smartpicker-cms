import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productCreateSchema, type ProductCreate } from '@/shared/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { PROTOCOLS } from '@/shared/constants';

interface ProductFormProps {
  initialData?: Partial<ProductCreate>;
  onSubmit: (data: ProductCreate) => void;
  isLoading?: boolean;
}

export function ProductForm({ initialData, onSubmit, isLoading }: ProductFormProps) {
  const { data: manufacturers } = trpc.manufacturers.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductCreate>({
    resolver: zodResolver(productCreateSchema) as any,
    defaultValues: initialData ?? {
      localControl: false,
      cloudDependent: false,
      requiresHub: false,
      matterCertified: false,
    },
  });

  const protocol = watch('primaryProtocol');

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register('name')} />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" {...register('slug')} />
          {errors.slug && (
            <p className="text-sm text-red-600 mt-1">{errors.slug.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="model">Model</Label>
          <Input id="model" {...register('model')} />
          {errors.model && (
            <p className="text-sm text-red-600 mt-1">{errors.model.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="manufacturerId">Manufacturer</Label>
          <Select
            value={watch('manufacturerId')?.toString()}
            onValueChange={(value) => setValue('manufacturerId', Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select manufacturer" />
            </SelectTrigger>
            <SelectContent>
              {manufacturers?.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.manufacturerId && (
            <p className="text-sm text-red-600 mt-1">{errors.manufacturerId.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="categoryId">Category</Label>
          <Select
            value={watch('categoryId')?.toString()}
            onValueChange={(value) => setValue('categoryId', Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && (
            <p className="text-sm text-red-600 mt-1">{errors.categoryId.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="primaryProtocol">Protocol</Label>
          <Select
            value={protocol ?? undefined}
            onValueChange={(value) => setValue('primaryProtocol', value as ProductCreate['primaryProtocol'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select protocol" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROTOCOLS).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.primaryProtocol && (
            <p className="text-sm text-red-600 mt-1">{errors.primaryProtocol.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('localControl')} className="rounded" />
          <span className="text-sm">Local Control</span>
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('cloudDependent')} className="rounded" />
          <span className="text-sm">Cloud Dependent</span>
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('requiresHub')} className="rounded" />
          <span className="text-sm">Requires Hub</span>
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('matterCertified')} className="rounded" />
          <span className="text-sm">Matter Certified</span>
        </label>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          {...register('description')}
          className="w-full min-h-[100px] px-3 py-2 border rounded-md"
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Product'}
      </Button>
    </form>
  );
}
