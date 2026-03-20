import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Package, Building2, FolderTree, Radio, Plus, Loader2, UploadCloud } from 'lucide-react'

export function Dashboard() {
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const { data: productsData } = trpc.products.list.useQuery({
    limit: 1,
    offset: 0,
    sortField: 'createdAt',
    sortOrder: 'desc',
  })

  const { data: manufacturers } = trpc.manufacturers.list.useQuery()
  const { data: categories } = trpc.categories.list.useQuery()
  const { data: hubs } = trpc.hubs.list.useQuery()
  const { data: importsData } = trpc.imports.list.useQuery({
    limit: 1,
    offset: 0,
  })
  const { data: bulkPublishPreview, isLoading: isBulkPublishPreviewLoading } =
    trpc.products.bulkPublishPreview.useQuery()
  const bulkPublishMutation = trpc.products.bulkPublishSafe.useMutation({
    onSuccess: async (data) => {
      await Promise.all([
        utils.products.list.invalidate(),
        utils.products.bulkPublishPreview.invalidate(),
        utils.manufacturers.list.invalidate(),
        utils.categories.list.invalidate(),
        utils.hubs.list.invalidate(),
      ])

      if (data.publishedProducts === 0) {
        toast.info('No export-ready draft devices found')
        return
      }

      toast.success('Bulk publish complete', {
        description: `${data.publishedProducts} devices published. Newly unlocked in export: ${data.newlyUnlockedRelated.manufacturers} manufacturers, ${data.newlyUnlockedRelated.categories} categories, ${data.newlyUnlockedRelated.hubs} hubs.`,
      })
    },
    onError: (error) => {
      toast.error(`Bulk publish failed: ${error.message}`)
    },
  })

  const stats = [
    {
      title: 'Total Products',
      value: productsData?.total ?? 0,
      icon: Package,
      href: '/products',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Manufacturers',
      value: manufacturers?.length ?? 0,
      icon: Building2,
      href: '/manufacturers',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Categories',
      value: categories?.length ?? 0,
      icon: FolderTree,
      href: '/categories',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Hubs',
      value: hubs?.length ?? 0,
      icon: Radio,
      href: '/hubs',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  const quickActions = [
    { label: 'Add Product', href: '/products/new', icon: Package },
    { label: 'Add Manufacturer', href: '/manufacturers/new', icon: Building2 },
    { label: 'Add Category', href: '/categories/new', icon: FolderTree },
    { label: 'Add Hub', href: '/hubs/new', icon: Radio },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.title}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(stat.href)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate(action.href)}
            >
              <Plus className="h-5 w-5" />
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Recent Imports</h2>
        <p className="text-gray-600 mb-4">Total imports processed: {importsData?.total ?? 0}</p>
        <Button variant="outline" onClick={() => navigate('/imports')}>
          View All Imports
        </Button>
      </Card>

      <Card className="mt-8">
        <CardHeader className="gap-3">
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5" />
            Live Export Prefill
          </CardTitle>
          <CardDescription>
            Safely publish draft devices that are export-ready. A device is considered safe when it
            already has a manufacturer, category, and primary protocol. Related manufacturers,
            categories, and hubs appear in the live export automatically once those devices are
            published.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Safe draft devices</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {bulkPublishPreview?.eligibleProducts ?? 0}
              </p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Manufacturers unlocked</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {bulkPublishPreview?.newlyUnlockedRelated.manufacturers ?? 0}
              </p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Categories unlocked</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {bulkPublishPreview?.newlyUnlockedRelated.categories ?? 0}
              </p>
            </div>
            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Hubs unlocked</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {bulkPublishPreview?.newlyUnlockedRelated.hubs ?? 0}
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-blue-50 p-4 text-sm text-blue-950">
            <p>
              Draft devices reviewed: {bulkPublishPreview?.draftProducts ?? 0}. Blocked drafts:{' '}
              {bulkPublishPreview?.blockedProducts ?? 0}.
            </p>
            <p className="mt-2">
              Missing fields across drafts: manufacturer{' '}
              {bulkPublishPreview?.missingManufacturerCount ?? 0}, category{' '}
              {bulkPublishPreview?.missingCategoryCount ?? 0}, protocol{' '}
              {bulkPublishPreview?.missingProtocolCount ?? 0}.
            </p>
            <p className="mt-2">
              After publishing, the export would contain approximately{' '}
              {bulkPublishPreview?.totalsAfterPublish.products ?? 0} devices,{' '}
              {bulkPublishPreview?.totalsAfterPublish.manufacturers ?? 0} manufacturers,{' '}
              {bulkPublishPreview?.totalsAfterPublish.categories ?? 0} categories, and{' '}
              {bulkPublishPreview?.totalsAfterPublish.hubs ?? 0} hubs.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-600">
              Rules:{' '}
              {bulkPublishPreview?.rules.join(' · ') ??
                'manufacturer · category · primary protocol'}
            </div>
            <Button
              onClick={() => bulkPublishMutation.mutate()}
              disabled={
                isBulkPublishPreviewLoading ||
                bulkPublishMutation.isPending ||
                (bulkPublishPreview?.eligibleProducts ?? 0) === 0
              }
              className="gap-2"
            >
              {bulkPublishMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  Bulk Publish Safe Drafts
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
