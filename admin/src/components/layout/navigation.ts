import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  Boxes,
  Download,
  FolderTree,
  GitBranch,
  LayoutDashboard,
  Package,
  RadioTower,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCog,
  Workflow,
} from 'lucide-react'

export type NavigationItem = {
  name: string
  href: string
  icon: LucideIcon
  description: string
}

export type NavigationGroup = {
  label: string
  items: NavigationItem[]
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        name: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        description: 'Operational health, recent imports, and publishing activity.',
      },
      {
        name: 'Compatibility',
        href: '/compatibility',
        icon: Workflow,
        description: 'Canonical compatibility, reviews, and evidence.',
      },
    ],
  },
  {
    label: 'Catalog',
    items: [
      {
        name: 'Products',
        href: '/products',
        icon: Package,
        description: 'Endpoint devices and infrastructure hardware.',
      },
      {
        name: 'Platforms',
        href: '/platforms',
        icon: Boxes,
        description: 'Software environments like Home Assistant or Homey.',
      },
      {
        name: 'Integrations',
        href: '/integrations',
        icon: GitBranch,
        description: 'Compatibility anchor points such as ZHA or Z-Wave JS.',
      },
      {
        name: 'Commercial Hubs',
        href: '/commercial-hubs',
        icon: RadioTower,
        description: 'Directly evaluated ecosystems and hub products.',
      },
      {
        name: 'Manufacturers',
        href: '/manufacturers',
        icon: Building2,
        description: 'Vendors for products, integrations, and hubs.',
      },
      {
        name: 'Categories',
        href: '/categories',
        icon: FolderTree,
        description: 'Product taxonomy and browse hierarchy.',
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        name: 'Imports',
        href: '/imports',
        icon: Download,
        description: 'Raw source ingestion and transformation review.',
      },
      {
        name: 'Exports',
        href: '/exports',
        icon: SlidersHorizontal,
        description: 'Generate public payloads and release data safely.',
      },
      {
        name: 'Users',
        href: '/users',
        icon: UserRoundCog,
        description: 'Admin and editor account management.',
      },
    ],
  },
]

export const flatNavigation = navigationGroups.flatMap((group) => group.items)

export function getNavigationItem(pathname: string) {
  return (
    flatNavigation.find((item) => pathname === item.href) ??
    flatNavigation.find((item) => item.href !== '/' && pathname.startsWith(item.href)) ?? {
      name: 'Workspace',
      href: pathname,
      icon: ShieldCheck,
      description: 'SmartPicker editorial workspace.',
    }
  )
}
