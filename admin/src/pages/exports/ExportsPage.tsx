import { Download, FileJson, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { PageIntro } from '@/components/layout/PageIntro'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'

export function ExportsPage() {
  const generateAllMutation = trpc.exports.generateAll.useMutation({
    onSuccess: (data) => {
      toast.success('All exports generated', {
        description: `Products ${data.exports.products.count}, integrations ${data.exports.integrations.count}, platforms ${data.exports.platforms.count}, hubs ${data.exports.hubs.count}, catalog ${data.exports.catalog.count}, search ${data.exports.search.count}.`,
      })
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`)
    },
  })

  const generateProductsMutation = trpc.exports.generateProducts.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(`Export failed: ${error.message}`),
  })
  const generateManufacturersMutation = trpc.exports.generateManufacturers.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(`Export failed: ${error.message}`),
  })
  const generateCategoriesMutation = trpc.exports.generateCategories.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(`Export failed: ${error.message}`),
  })
  const generateIntegrationsMutation = trpc.exports.generateIntegrations.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(`Export failed: ${error.message}`),
  })
  const generatePlatformsMutation = trpc.exports.generatePlatforms.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(`Export failed: ${error.message}`),
  })
  const generateHubsMutation = trpc.exports.generateHubs.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(`Export failed: ${error.message}`),
  })
  const generateProtocolsMutation = trpc.exports.generateProtocols.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(`Export failed: ${error.message}`),
  })
  const generateCatalogMutation = trpc.exports.generateCatalog.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(`Export failed: ${error.message}`),
  })
  const generateSearchMutation = trpc.exports.generateSearch.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (error) => toast.error(`Export failed: ${error.message}`),
  })

  const isBusy =
    generateAllMutation.isPending ||
    generateProductsMutation.isPending ||
    generateManufacturersMutation.isPending ||
    generateCategoriesMutation.isPending ||
    generateIntegrationsMutation.isPending ||
    generatePlatformsMutation.isPending ||
    generateHubsMutation.isPending ||
    generateProtocolsMutation.isPending ||
    generateCatalogMutation.isPending ||
    generateSearchMutation.isPending

  const exportCards = [
    {
      title: 'Products',
      description: 'Device summaries plus grouped compatibility detail files.',
      action: () => generateProductsMutation.mutate(),
      pending: generateProductsMutation.isPending,
    },
    {
      title: 'Manufacturers',
      description: 'Published manufacturer payloads.',
      action: () => generateManufacturersMutation.mutate(),
      pending: generateManufacturersMutation.isPending,
    },
    {
      title: 'Categories',
      description: 'Category hierarchy and browse metadata.',
      action: () => generateCategoriesMutation.mutate(),
      pending: generateCategoriesMutation.isPending,
    },
    {
      title: 'Integrations',
      description: 'First-class integration payloads for Astro collection and detail pages.',
      action: () => generateIntegrationsMutation.mutate(),
      pending: generateIntegrationsMutation.isPending,
    },
    {
      title: 'Platforms',
      description: 'Derived platform exports with linked integrations and device coverage.',
      action: () => generatePlatformsMutation.mutate(),
      pending: generatePlatformsMutation.isPending,
    },
    {
      title: 'Hubs',
      description: 'Commercial hub exports for the public `/hubs` section.',
      action: () => generateHubsMutation.mutate(),
      pending: generateHubsMutation.isPending,
    },
    {
      title: 'Protocols',
      description: 'Protocol landing pages and summary metadata.',
      action: () => generateProtocolsMutation.mutate(),
      pending: generateProtocolsMutation.isPending,
    },
    {
      title: 'Catalog',
      description: 'Prebuilt product index with grouped filter facets for the Astro catalog.',
      action: () => generateCatalogMutation.mutate(),
      pending: generateCatalogMutation.isPending,
    },
    {
      title: 'Search',
      description: 'Static search payload covering devices, integrations, platforms, hubs, and manufacturers.',
      action: () => generateSearchMutation.mutate(),
      pending: generateSearchMutation.isPending,
    },
  ]

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Operations"
        title="Exports"
        description="Generate and validate the public data payloads. This area stays operationally focused while the rest of the CMS becomes more editorial."
        actions={
          <Button onClick={() => generateAllMutation.mutate()} disabled={isBusy}>
            {generateAllMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate All Exports
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Export Families
            </CardTitle>
            <CardDescription>
              Trigger individual payload families when you only need to refresh part of the public
              dataset.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {exportCards.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm"
              >
                <h3 className="font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={item.action}
                  disabled={isBusy}
                >
                  {item.pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Export'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-white text-gray-900 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Download className="h-5 w-5 text-gray-500" />
              Release Notes
            </CardTitle>
            <CardDescription className="text-gray-600">
              Generated files are written to the local exports store and served by the API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-gray-600">
            <p>
              The export contract now matches the current Astro information architecture: products,
              integrations, platforms, commercial hubs, catalog facets, and static search.
            </p>
            <p>
              Path: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-900">data/exports/</code>
            </p>
            <p>
              API: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-900">/api/exports/</code>
            </p>
            <p>
              Extra files:{' '}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-900">catalog.json</code>,{' '}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-900">search.json</code>, and
              detail families for{' '}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-900">integrations</code>{' '}
              and <code className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-900">platforms</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
