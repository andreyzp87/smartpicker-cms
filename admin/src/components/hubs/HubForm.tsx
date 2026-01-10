import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { hubCreateSchema, type HubCreate } from '@/shared/schemas';
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

type HubFormData = HubCreate;

interface HubFormProps {
  initialData?: Partial<HubFormData>;
  onSubmit: (data: HubFormData) => void;
  isLoading?: boolean;
}

export function HubForm({ initialData, onSubmit, isLoading }: HubFormProps) {
  const { data: manufacturers } = trpc.manufacturers.list.useQuery();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<HubFormData>({
    resolver: zodResolver(hubCreateSchema) as any,
    defaultValues: initialData ?? {
      protocolsSupported: [],
    },
  });

  const manufacturerId = watch('manufacturerId');
  const protocolsSupported = watch('protocolsSupported') || [];

  const toggleProtocol = (protocol: string) => {
    const current = protocolsSupported || [];
    if (current.includes(protocol as any)) {
      setValue('protocolsSupported', current.filter((p) => p !== protocol) as any);
    } else {
      setValue('protocolsSupported', [...current, protocol] as any);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

        <div className="col-span-2">
          <Label htmlFor="manufacturerId">Manufacturer</Label>
          <Select
            value={manufacturerId?.toString() ?? 'none'}
            onValueChange={(value) => setValue('manufacturerId', value === 'none' ? null : Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select manufacturer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
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
      </div>

      <div>
        <Label>Protocols Supported</Label>
        <div className="grid grid-cols-3 gap-3 mt-2">
          {Object.entries(PROTOCOLS).map(([key, value]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={protocolsSupported.includes(key as any)}
                onChange={() => toggleProtocol(key)}
                className="rounded"
              />
              <span className="text-sm">{value.name}</span>
            </label>
          ))}
        </div>
        {errors.protocolsSupported && (
          <p className="text-sm text-red-600 mt-1">{errors.protocolsSupported.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          {...register('description')}
          className="w-full min-h-[100px] px-3 py-2 border rounded-md"
        />
        {errors.description && (
          <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Hub'}
      </Button>
    </form>
  );
}
