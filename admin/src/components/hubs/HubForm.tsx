import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { hubCreateSchema, type Protocol } from '@/shared/schemas'
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
import { PROTOCOLS } from '@/shared/constants'

type HubFormInput = z.input<typeof hubCreateSchema>
type HubFormOutput = z.output<typeof hubCreateSchema>
const protocolOptions = Object.keys(PROTOCOLS) as Protocol[]

interface HubFormProps {
  initialData?: Partial<HubFormInput>
  onSubmit: (data: HubFormOutput) => void
  isLoading?: boolean
}

export function HubForm({ initialData, onSubmit, isLoading }: HubFormProps) {
  const { data: manufacturers } = trpc.manufacturers.list.useQuery()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<HubFormInput, unknown, HubFormOutput>({
    resolver: zodResolver(hubCreateSchema),
    defaultValues: initialData ?? {
      protocolsSupported: [],
    },
  })

  const manufacturerId = watch('manufacturerId')
  const protocolsSupported = watch('protocolsSupported') ?? []

  const toggleProtocol = (protocol: Protocol) => {
    if (protocolsSupported.includes(protocol)) {
      setValue(
        'protocolsSupported',
        protocolsSupported.filter((currentProtocol) => currentProtocol !== protocol),
      )
    } else {
      setValue('protocolsSupported', [...protocolsSupported, protocol])
    }
  }

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

        <div className="col-span-2">
          <Label htmlFor="manufacturerId">Manufacturer</Label>
          <Select
            value={manufacturerId?.toString() ?? 'none'}
            onValueChange={(value) =>
              setValue('manufacturerId', value === 'none' ? null : Number(value))
            }
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
          {protocolOptions.map((protocol) => (
            <label key={protocol} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={protocolsSupported.includes(protocol)}
                onChange={() => toggleProtocol(protocol)}
                className="rounded"
              />
              <span className="text-sm">{PROTOCOLS[protocol].name}</span>
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
  )
}
