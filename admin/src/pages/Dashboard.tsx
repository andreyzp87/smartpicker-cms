import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import { Package, Building2, FolderTree, Radio, Plus } from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();

  const { data: productsData } = trpc.products.list.useQuery({
    limit: 1,
    offset: 0,
    sortField: 'createdAt',
    sortOrder: 'desc',
  });

  const { data: manufacturers } = trpc.manufacturers.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: hubs } = trpc.hubs.list.useQuery();
  const { data: importsData } = trpc.imports.list.useQuery({
    limit: 1,
    offset: 0,
  });

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
  ];

  const quickActions = [
    { label: 'Add Product', href: '/products/new', icon: Package },
    { label: 'Add Manufacturer', href: '/manufacturers/new', icon: Building2 },
    { label: 'Add Category', href: '/categories/new', icon: FolderTree },
    { label: 'Add Hub', href: '/hubs/new', icon: Radio },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(stat.href)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate(action.href)}
              >
                <Plus className="h-5 w-5" />
                <span>{action.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Recent Imports
        </h2>
        <p className="text-gray-600 mb-4">
          Total imports processed: {importsData?.total ?? 0}
        </p>
        <Button variant="outline" onClick={() => navigate('/imports')}>
          View All Imports
        </Button>
      </Card>
    </div>
  );
}
