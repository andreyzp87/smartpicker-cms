import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UsersPanel } from '@/components/users/UsersPanel';
import { toast } from 'sonner';
import { Download, FileJson, Loader2 } from 'lucide-react';

export function Settings() {
  const generateAllMutation = trpc.exports.generateAll.useMutation({
    onSuccess: (data) => {
      toast.success('All exports generated successfully', {
        description: `Products: ${data.exports.products.count}, Manufacturers: ${data.exports.manufacturers.count}, Categories: ${data.exports.categories.count}, Hubs: ${data.exports.hubs.count}, Protocols: ${data.exports.protocols.count}`,
      });
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const generateProductsMutation = trpc.exports.generateProducts.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const generateManufacturersMutation = trpc.exports.generateManufacturers.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const generateCategoriesMutation = trpc.exports.generateCategories.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const generateHubsMutation = trpc.exports.generateHubs.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const generateProtocolsMutation = trpc.exports.generateProtocols.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const isAnyMutationLoading =
    generateAllMutation.isPending ||
    generateProductsMutation.isPending ||
    generateManufacturersMutation.isPending ||
    generateCategoriesMutation.isPending ||
    generateHubsMutation.isPending ||
    generateProtocolsMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage system settings and data exports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Data Exports
          </CardTitle>
          <CardDescription>
            Generate JSON exports for the public frontend. Only published products will be included
            in the exports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Generate All Button */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
            <div>
              <h3 className="font-semibold">Generate All Exports</h3>
              <p className="text-sm text-gray-600">
                Products, manufacturers, categories, hubs, protocols, site metadata, and sitemap
              </p>
            </div>
            <Button
              onClick={() => generateAllMutation.mutate()}
              disabled={isAnyMutationLoading}
              className="gap-2"
            >
              {generateAllMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Generate All
                </>
              )}
            </Button>
          </div>

          {/* Individual Export Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Products</h4>
                <p className="text-sm text-gray-600">All published products</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateProductsMutation.mutate()}
                disabled={isAnyMutationLoading}
              >
                {generateProductsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Export'
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Manufacturers</h4>
                <p className="text-sm text-gray-600">All manufacturers</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateManufacturersMutation.mutate()}
                disabled={isAnyMutationLoading}
              >
                {generateManufacturersMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Export'
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Categories</h4>
                <p className="text-sm text-gray-600">Category hierarchy</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateCategoriesMutation.mutate()}
                disabled={isAnyMutationLoading}
              >
                {generateCategoriesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Export'
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Hubs</h4>
                <p className="text-sm text-gray-600">All smart home hubs</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateHubsMutation.mutate()}
                disabled={isAnyMutationLoading}
              >
                {generateHubsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Export'
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Protocols</h4>
                <p className="text-sm text-gray-600">Protocol landing pages and counts</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateProtocolsMutation.mutate()}
                disabled={isAnyMutationLoading}
              >
                {generateProtocolsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Export'
                )}
              </Button>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Generated exports are stored in{' '}
              <code className="bg-blue-100 px-1 py-0.5 rounded">data/exports/</code> and served at{' '}
              <code className="bg-blue-100 px-1 py-0.5 rounded">/api/exports/</code>
            </p>
          </div>
        </CardContent>
      </Card>

      <UsersPanel />
    </div>
  );
}
