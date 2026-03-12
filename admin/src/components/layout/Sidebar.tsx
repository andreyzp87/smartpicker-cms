import { Link, useLocation } from 'react-router';
import {
  Package,
  Building2,
  FolderTree,
  Radio,
  Download,
  LayoutDashboard,
  Settings as SettingsIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Manufacturers', href: '/manufacturers', icon: Building2 },
  { name: 'Categories', href: '/categories', icon: FolderTree },
  { name: 'Hubs', href: '/hubs', icon: Radio },
  { name: 'Imports', href: '/imports', icon: Download },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">SmartPicker</h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href ||
                          (item.href !== '/' && location.pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
