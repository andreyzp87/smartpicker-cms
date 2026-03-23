import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { integrationCreateSchema, type Protocol } from '@/shared/schemas'
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

type IntegrationFormInput = z.input<typeof integrationCreateSchema>
type IntegrationFormOutput = z.output<typeof integrationCreateSchema>

const protocolOptions = Object.keys(PROTOCOLS) as Protocol[]

interface IntegrationFormProps {
  initialData?: Partial<IntegrationFormInput>
  onSubmit: (data: IntegrationFormOutput) => void
  isLoading?: boolean
}

export function IntegrationForm({ initialData, onSubmit, isLoading }: IntegrationFormProps) {
  const { data: manufacturers } = trpc.manufacturers.list.useQuery()
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<IntegrationFormInput, unknown, IntegrationFormOutput>({
    resolver: zodResolver(integrationCreateSchema),
    defaultValues: initialData ?? {
      integrationKind: 'protocol_stack',
      status: 'draft',
    },
  })

  const manufacturerId = watch('manufacturerId')
  const integrationKind = watch('integrationKind') ?? 'protocol_stack'
  const primaryProtocol = watch('primaryProtocol') ?? null
  const status = watch('status') ?? 'draft'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Integration name</Label>
          <Input id="name" {...register('name')} />
          {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name.message}</p> : null}
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" {...register('slug')} />
          {errors.slug ? <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p> : null}
        </div>
        <div>
          <Label htmlFor="integrationKind">Integration kind</Label>
          <Select
            value={integrationKind}
            onValueChange={(value) =>
              setValue('integrationKind', value as typeof integrationKind)
            }
          >
            <SelectTrigger id="integrationKind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="protocol_stack">Protocol stack</SelectItem>
              <SelectItem value="bridge">Bridge</SelectItem>
              <SelectItem value="native_component">Native component</SelectItem>
              <SelectItem value="vendor_connector">Vendor connector</SelectItem>
              <SelectItem value="addon">Addon</SelectItem>
              <SelectItem value="external_service">External service</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="primaryProtocol">Primary protocol</Label>
          <Select
            value={primaryProtocol ?? 'none'}
            onValueChange={(value) =>
              setValue('primaryProtocol', value === 'none' ? null : (value as Protocol))
            }
          >
            <SelectTrigger id="primaryProtocol">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {protocolOptions.map((protocol) => (
                <SelectItem key={protocol} value={protocol}>
                  {PROTOCOLS[protocol].name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
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
          <Label htmlFor="website">Documentation URL</Label>
          <Input id="website" type="url" {...register('website')} />
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
        {isLoading ? 'Saving...' : 'Save Integration'}
      </Button>
    </form>
  )
}
