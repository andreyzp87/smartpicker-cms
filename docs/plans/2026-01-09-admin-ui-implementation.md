# Admin UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete admin interface for SmartPicker CMS with product, manufacturer, category, hub, and import management.

**Architecture:** React 19 SPA using tRPC for type-safe API calls, shadcn/ui for components, TanStack Table for data grids, React Hook Form for forms. Backend tRPC routes connect to Drizzle ORM queries. Two-phase implementation: backend endpoints first, then frontend pages.

**Tech Stack:** React 19, TypeScript, tRPC v11, TanStack Query, TanStack Table, React Hook Form, Zod, shadcn/ui, Tailwind CSS 4, React Router 7

---

## Phase 1: Backend tRPC Implementation

### Task 1: Products Router - List Endpoint

**Files:**
- Modify: `src/routes/products.ts:11-25`
- Test manually with: tRPC client or curl

**Step 1: Implement products.list query**

Replace the TODO in `products.ts` list query (lines 11-25):

```typescript
list: publicProcedure
  .input(productFilterSchema.merge(paginationSchema))
  .query(async ({ input }) => {
    const {
      search,
      protocol,
      manufacturerId,
      categoryId,
      status,
      localControl,
      matterCertified,
      limit,
      offset,
      sortField,
      sortOrder,
    } = input;

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.model, `%${search}%`)
        )
      );
    }

    if (protocol) {
      conditions.push(eq(products.primaryProtocol, protocol));
    }

    if (manufacturerId) {
      conditions.push(eq(products.manufacturerId, manufacturerId));
    }

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    if (status) {
      conditions.push(eq(products.status, status));
    }

    if (localControl !== undefined) {
      conditions.push(eq(products.localControl, localControl));
    }

    if (matterCertified !== undefined) {
      conditions.push(eq(products.matterCertified, matterCertified));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order by
    const orderByColumn = sortField === 'name' ? products.name :
                         sortField === 'createdAt' ? products.createdAt :
                         sortField === 'updatedAt' ? products.updatedAt :
                         products.createdAt;
    const orderByClause = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn);

    // Execute queries
    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(products)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(whereClause),
    ]);

    return {
      items,
      total: Number(countResult[0]?.count ?? 0),
    };
  }),
```

**Step 2: Add required imports at top of file**

Add these imports after existing imports:

```typescript
import { and, or, eq, ilike, asc, desc, sql } from 'drizzle-orm';
```

**Step 3: Test the endpoint**

Start the dev server and verify:
```bash
pnpm dev
```

Expected: Server starts without errors, endpoint is available

**Step 4: Commit**

```bash
git add src/routes/products.ts
git commit -m "feat(api): implement products.list endpoint with filtering and pagination"
```

---

### Task 2: Products Router - Single Product Queries

**Files:**
- Modify: `src/routes/products.ts:27-40`

**Step 1: Implement products.byId query**

Replace the TODO (lines 27-33):

```typescript
byId: publicProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ input }) => {
    const product = await db.query.products.findFirst({
      where: eq(products.id, input.id),
      with: {
        manufacturer: true,
        category: true,
        zigbeeDetails: true,
        zwaveDetails: true,
      },
    });

    return product ?? null;
  }),
```

**Step 2: Implement products.bySlug query**

Replace the TODO (lines 35-40):

```typescript
bySlug: publicProcedure
  .input(z.object({ slug: z.string() }))
  .query(async ({ input }) => {
    const product = await db.query.products.findFirst({
      where: eq(products.slug, input.slug),
      with: {
        manufacturer: true,
        category: true,
        zigbeeDetails: true,
        zwaveDetails: true,
      },
    });

    return product ?? null;
  }),
```

**Step 3: Commit**

```bash
git add src/routes/products.ts
git commit -m "feat(api): implement products.byId and products.bySlug queries"
```

---

### Task 3: Products Router - Create Mutation

**Files:**
- Modify: `src/routes/products.ts:42-48`
- Reference: `node_modules/slugify` for slug generation

**Step 1: Implement products.create mutation**

Replace the TODO (lines 42-48):

```typescript
create: publicProcedure
  .input(productCreateSchema)
  .mutation(async ({ input }) => {
    const [product] = await db
      .insert(products)
      .values({
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return product;
  }),
```

**Step 2: Commit**

```bash
git add src/routes/products.ts
git commit -m "feat(api): implement products.create mutation"
```

---

### Task 4: Products Router - Update and Delete Mutations

**Files:**
- Modify: `src/routes/products.ts:50-65`

**Step 1: Implement products.update mutation**

Replace the TODO (lines 50-57):

```typescript
update: publicProcedure
  .input(
    z.object({
      id: z.number(),
      data: productUpdateSchema,
    })
  )
  .mutation(async ({ input }) => {
    const [product] = await db
      .update(products)
      .set({
        ...input.data,
        updatedAt: new Date(),
      })
      .where(eq(products.id, input.id))
      .returning();

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }),
```

**Step 2: Implement products.delete mutation**

Replace the TODO (lines 59-65):

```typescript
delete: publicProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    await db.delete(products).where(eq(products.id, input.id));

    return { success: true };
  }),
```

**Step 3: Commit**

```bash
git add src/routes/products.ts
git commit -m "feat(api): implement products.update and products.delete mutations"
```

---

### Task 5: Manufacturers Router - Complete Implementation

**Files:**
- Modify: `src/routes/manufacturers.ts:8-50`

**Step 1: Implement all manufacturers endpoints**

Replace the entire router definition (lines 8-50):

```typescript
export const manufacturersRouter = router({
  list: publicProcedure.query(async () => {
    const items = await db.query.manufacturers.findMany({
      orderBy: asc(manufacturers.name),
    });

    return items;
  }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const manufacturer = await db.query.manufacturers.findFirst({
        where: eq(manufacturers.id, input.id),
      });

      return manufacturer ?? null;
    }),

  create: publicProcedure
    .input(manufacturerCreateSchema)
    .mutation(async ({ input }) => {
      const [manufacturer] = await db
        .insert(manufacturers)
        .values({
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return manufacturer;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        data: manufacturerUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      const [manufacturer] = await db
        .update(manufacturers)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(manufacturers.id, input.id))
        .returning();

      if (!manufacturer) {
        throw new Error('Manufacturer not found');
      }

      return manufacturer;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(manufacturers).where(eq(manufacturers.id, input.id));

      return { success: true };
    }),
});
```

**Step 2: Add required imports**

Update imports at top of file:

```typescript
import { eq, asc } from 'drizzle-orm';
```

**Step 3: Commit**

```bash
git add src/routes/manufacturers.ts
git commit -m "feat(api): implement complete manufacturers router"
```

---

### Task 6: Categories Router - Complete Implementation

**Files:**
- Modify: `src/routes/categories.ts:8-50`

**Step 1: Implement all categories endpoints**

Replace the entire router definition (lines 8-50):

```typescript
export const categoriesRouter = router({
  list: publicProcedure.query(async () => {
    const items = await db.query.categories.findMany({
      orderBy: asc(categories.sortOrder),
      with: {
        parent: true,
      },
    });

    return items;
  }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, input.id),
        with: {
          parent: true,
          children: true,
        },
      });

      return category ?? null;
    }),

  create: publicProcedure
    .input(categoryCreateSchema)
    .mutation(async ({ input }) => {
      const [category] = await db
        .insert(categories)
        .values(input)
        .returning();

      return category;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        data: categoryUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      const [category] = await db
        .update(categories)
        .set(input.data)
        .where(eq(categories.id, input.id))
        .returning();

      if (!category) {
        throw new Error('Category not found');
      }

      return category;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(categories).where(eq(categories.id, input.id));

      return { success: true };
    }),
});
```

**Step 2: Add required imports**

Update imports:

```typescript
import { eq, asc } from 'drizzle-orm';
```

**Step 3: Commit**

```bash
git add src/routes/categories.ts
git commit -m "feat(api): implement complete categories router"
```

---

### Task 7: Hubs Router - Complete Implementation

**Files:**
- Modify: `src/routes/hubs.ts:8-50`

**Step 1: Implement all hubs endpoints**

Replace the entire router definition:

```typescript
export const hubsRouter = router({
  list: publicProcedure.query(async () => {
    const items = await db.query.hubs.findMany({
      orderBy: asc(hubs.name),
      with: {
        manufacturer: true,
      },
    });

    return items;
  }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const hub = await db.query.hubs.findFirst({
        where: eq(hubs.id, input.id),
        with: {
          manufacturer: true,
        },
      });

      return hub ?? null;
    }),

  create: publicProcedure
    .input(hubCreateSchema)
    .mutation(async ({ input }) => {
      const [hub] = await db
        .insert(hubs)
        .values({
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return hub;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        data: hubUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      const [hub] = await db
        .update(hubs)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(hubs.id, input.id))
        .returning();

      if (!hub) {
        throw new Error('Hub not found');
      }

      return hub;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(hubs).where(eq(hubs.id, input.id));

      return { success: true };
    }),
});
```

**Step 2: Add required imports**

```typescript
import { eq, asc } from 'drizzle-orm';
```

**Step 3: Commit**

```bash
git add src/routes/hubs.ts
git commit -m "feat(api): implement complete hubs router"
```

---

### Task 8: Compatibility Router - Complete Implementation

**Files:**
- Modify: `src/routes/compatibility.ts:8-45`

**Step 1: Implement all compatibility endpoints**

Replace the entire router definition:

```typescript
export const compatibilityRouter = router({
  byProductId: publicProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const items = await db.query.deviceCompatibility.findMany({
        where: eq(deviceCompatibility.productId, input.productId),
        with: {
          hub: {
            with: {
              manufacturer: true,
            },
          },
        },
      });

      return items;
    }),

  byHubId: publicProcedure
    .input(z.object({ hubId: z.number() }))
    .query(async ({ input }) => {
      const items = await db.query.deviceCompatibility.findMany({
        where: eq(deviceCompatibility.hubId, input.hubId),
        with: {
          product: {
            with: {
              manufacturer: true,
            },
          },
        },
      });

      return items;
    }),

  create: publicProcedure
    .input(compatibilityCreateSchema)
    .mutation(async ({ input }) => {
      const [compatibility] = await db
        .insert(deviceCompatibility)
        .values({
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return compatibility;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        data: compatibilityUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      const [compatibility] = await db
        .update(deviceCompatibility)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(deviceCompatibility.id, input.id))
        .returning();

      if (!compatibility) {
        throw new Error('Compatibility entry not found');
      }

      return compatibility;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(deviceCompatibility).where(eq(deviceCompatibility.id, input.id));

      return { success: true };
    }),
});
```

**Step 2: Add required imports**

```typescript
import { eq } from 'drizzle-orm';
```

**Step 3: Commit**

```bash
git add src/routes/compatibility.ts
git commit -m "feat(api): implement complete compatibility router"
```

---

### Task 9: Imports Router - Complete Implementation

**Files:**
- Modify: `src/routes/imports.ts:8-35`

**Step 1: Implement imports.list query**

Replace the TODO (lines 8-20):

```typescript
list: publicProcedure
  .input(
    z.object({
      source: z.enum(['zigbee2mqtt', 'blakadder', 'zwave-js']).optional(),
      processed: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ input }) => {
    const { source, processed, limit, offset } = input;

    const conditions = [];

    if (source) {
      conditions.push(eq(rawImports.source, source));
    }

    if (processed !== undefined) {
      conditions.push(
        processed
          ? isNotNull(rawImports.processedAt)
          : isNull(rawImports.processedAt)
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(rawImports)
        .where(whereClause)
        .orderBy(desc(rawImports.importedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(rawImports)
        .where(whereClause),
    ]);

    return {
      items,
      total: Number(countResult[0]?.count ?? 0),
    };
  }),
```

**Step 2: Implement imports.byId query**

Replace the TODO (lines 22-27):

```typescript
byId: publicProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ input }) => {
    const rawImport = await db.query.rawImports.findFirst({
      where: eq(rawImports.id, input.id),
    });

    return rawImport ?? null;
  }),
```

**Step 3: Add required imports**

```typescript
import { eq, and, desc, isNull, isNotNull, sql } from 'drizzle-orm';
```

**Step 4: Commit**

```bash
git add src/routes/imports.ts
git commit -m "feat(api): implement imports.list and imports.byId queries"
```

---

## Phase 2: Admin UI - Core Infrastructure

### Task 10: Install shadcn/ui Components

**Files:**
- Modify: `admin/components.json` (will be created)
- Create: Multiple `admin/src/components/ui/*.tsx` files

**Step 1: Initialize shadcn/ui**

```bash
cd admin
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

**Step 2: Install required components**

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add table
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add select
npx shadcn@latest add form
npx shadcn@latest add toast
npx shadcn@latest add badge
npx shadcn@latest add tabs
npx shadcn@latest add separator
npx shadcn@latest add skeleton
```

**Step 3: Verify components installed**

```bash
ls src/components/ui/
```

Expected: All component files present

**Step 4: Commit**

```bash
git add .
git commit -m "feat(admin): install shadcn/ui components"
```

---

### Task 11: Create Layout Components

**Files:**
- Create: `admin/src/components/layout/AppLayout.tsx`
- Create: `admin/src/components/layout/Sidebar.tsx`
- Create: `admin/src/components/layout/Header.tsx`

**Step 1: Create AppLayout component**

```typescript
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

**Step 2: Create Sidebar component**

```typescript
import { Link, useLocation } from 'react-router';
import {
  Package,
  Building2,
  FolderTree,
  Radio,
  Download,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Manufacturers', href: '/manufacturers', icon: Building2 },
  { name: 'Categories', href: '/categories', icon: FolderTree },
  { name: 'Hubs', href: '/hubs', icon: Radio },
  { name: 'Imports', href: '/imports', icon: Download },
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
```

**Step 3: Create Header component**

```typescript
export function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">Admin User</span>
      </div>
    </header>
  );
}
```

**Step 4: Commit**

```bash
git add admin/src/components/layout/
git commit -m "feat(admin): create layout components (AppLayout, Sidebar, Header)"
```

---

### Task 12: Setup React Router

**Files:**
- Modify: `admin/src/App.tsx`
- Modify: `admin/src/main.tsx`
- Create: `admin/src/pages/Dashboard.tsx`

**Step 1: Create Dashboard page**

```typescript
export function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <p className="text-gray-600">
        Welcome to SmartPicker CMS Admin. Select a section from the sidebar to get started.
      </p>
    </div>
  );
}
```

**Step 2: Update App.tsx with routes**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Step 3: Test routing**

```bash
cd admin
pnpm dev
```

Expected: Layout renders with sidebar, dashboard page shows

**Step 4: Commit**

```bash
git add admin/src/App.tsx admin/src/main.tsx admin/src/pages/Dashboard.tsx
git commit -m "feat(admin): setup React Router with dashboard"
```

---

## Phase 3: Admin UI - Products Management

### Task 13: Products List Page - Data Table Setup

**Files:**
- Create: `admin/src/pages/products/ProductsList.tsx`
- Create: `admin/src/components/products/ProductsTable.tsx`
- Modify: `admin/src/App.tsx`

**Step 1: Create ProductsTable component**

```typescript
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PROTOCOLS, PRODUCT_STATUSES } from '@/shared/constants';

type Product = {
  id: number;
  name: string;
  model: string;
  slug: string;
  primaryProtocol: string;
  status: 'draft' | 'published' | 'archived';
  manufacturerId: number | null;
  createdAt: Date;
};

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'model',
    header: 'Model',
  },
  {
    accessorKey: 'primaryProtocol',
    header: 'Protocol',
    cell: ({ row }) => {
      const protocol = row.getValue('primaryProtocol') as string;
      const protocolInfo = PROTOCOLS[protocol as keyof typeof PROTOCOLS];
      return (
        <Badge variant="outline" style={{ borderColor: protocolInfo?.color }}>
          {protocolInfo?.name ?? protocol}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const statusInfo = PRODUCT_STATUSES[status as keyof typeof PRODUCT_STATUSES];
      return (
        <Badge style={{ backgroundColor: statusInfo?.color }}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const product = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
```

**Step 2: Create ProductsList page**

```typescript
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { columns } from '@/components/products/ProductsTable';
import { DataTable } from '@/components/ui/data-table';

export function ProductsList() {
  const { data, isLoading } = trpc.products.list.useQuery({
    limit: 50,
    offset: 0,
    sortField: 'createdAt',
    sortOrder: 'desc',
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <DataTable columns={columns} data={data?.items ?? []} />
      )}
    </div>
  );
}
```

**Step 3: Create reusable DataTable component**

Create `admin/src/components/ui/data-table.tsx`:

```typescript
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Step 4: Add route to App.tsx**

Add import and route:

```typescript
import { ProductsList } from './pages/products/ProductsList';

// Inside Routes:
<Route path="products" element={<ProductsList />} />
```

**Step 5: Copy constants file to admin**

```bash
cp src/shared/constants.ts admin/src/shared/constants.ts
```

**Step 6: Test the products list page**

Navigate to `/products` and verify data loads

**Step 7: Commit**

```bash
git add admin/src/pages/products/ admin/src/components/products/ admin/src/components/ui/data-table.tsx admin/src/App.tsx admin/src/shared/
git commit -m "feat(admin): create products list page with data table"
```

---

### Task 14: Product Form Component

**Files:**
- Create: `admin/src/components/products/ProductForm.tsx`
- Create: `admin/src/pages/products/ProductCreate.tsx`
- Create: `admin/src/pages/products/ProductEdit.tsx`

**Step 1: Create ProductForm component**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productCreateSchema } from '@/shared/schemas';
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

type ProductFormData = {
  name: string;
  slug: string;
  model: string;
  manufacturerId: number;
  categoryId: number;
  primaryProtocol: string;
  localControl: boolean;
  cloudDependent: boolean;
  requiresHub: boolean;
  matterCertified: boolean;
  description?: string;
  imageUrl?: string;
};

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
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
  } = useForm<ProductFormData>({
    resolver: zodResolver(productCreateSchema),
    defaultValues: initialData ?? {
      localControl: false,
      cloudDependent: false,
      requiresHub: false,
      matterCertified: false,
    },
  });

  const protocol = watch('primaryProtocol');

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
            value={protocol}
            onValueChange={(value) => setValue('primaryProtocol', value)}
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
```

**Step 2: Copy shared schemas to admin**

```bash
mkdir -p admin/src/shared
cp -r src/shared/schemas admin/src/shared/
```

**Step 3: Create ProductCreate page**

```typescript
import { useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { ProductForm } from '@/components/products/ProductForm';
import { Card } from '@/components/ui/card';

export function ProductCreate() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      navigate('/products');
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Product</h1>

      <Card className="p-6">
        <ProductForm
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </Card>
    </div>
  );
}
```

**Step 4: Create ProductEdit page**

```typescript
import { useParams, useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { ProductForm } from '@/components/products/ProductForm';
import { Card } from '@/components/ui/card';

export function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: product, isLoading } = trpc.products.byId.useQuery({
    id: Number(id),
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      navigate('/products');
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Product</h1>

      <Card className="p-6">
        <ProductForm
          initialData={product}
          onSubmit={(data) => updateMutation.mutate({ id: Number(id), data })}
          isLoading={updateMutation.isPending}
        />
      </Card>
    </div>
  );
}
```

**Step 5: Add routes to App.tsx**

```typescript
import { ProductCreate } from './pages/products/ProductCreate';
import { ProductEdit } from './pages/products/ProductEdit';

// Inside Routes:
<Route path="products/new" element={<ProductCreate />} />
<Route path="products/:id/edit" element={<ProductEdit />} />
```

**Step 6: Update ProductsList to link to create/edit**

In `ProductsList.tsx`, update the Add button:

```typescript
import { useNavigate } from 'react-router';

// Inside component:
const navigate = useNavigate();

<Button onClick={() => navigate('/products/new')}>
  <Plus className="mr-2 h-4 w-4" />
  Add Product
</Button>
```

In `ProductsTable.tsx`, update the Edit action:

```typescript
<DropdownMenuItem onClick={() => window.location.href = `/products/${product.id}/edit`}>
  <Pencil className="mr-2 h-4 w-4" />
  Edit
</DropdownMenuItem>
```

**Step 7: Commit**

```bash
git add admin/src/components/products/ProductForm.tsx admin/src/pages/products/ admin/src/shared/schemas/ admin/src/App.tsx
git commit -m "feat(admin): create product form with create/edit pages"
```

---

## Phase 4: Admin UI - Other Entity Management

### Task 15: Manufacturers Management Pages

**Files:**
- Create: `admin/src/pages/manufacturers/ManufacturersList.tsx`
- Create: `admin/src/components/manufacturers/ManufacturersTable.tsx`
- Create: `admin/src/components/manufacturers/ManufacturerForm.tsx`
- Modify: `admin/src/App.tsx`

**Step 1: Create ManufacturersTable component**

```typescript
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Manufacturer = {
  id: number;
  name: string;
  slug: string;
  website: string | null;
};

export const columns: ColumnDef<Manufacturer>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
  },
  {
    accessorKey: 'website',
    header: 'Website',
    cell: ({ row }) => {
      const website = row.getValue('website') as string | null;
      return website ? (
        <a href={website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {website}
        </a>
      ) : (
        <span className="text-gray-400">—</span>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const manufacturer = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.location.href = `/manufacturers/${manufacturer.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
```

**Step 2: Create ManufacturersList page**

```typescript
import { useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { columns } from '@/components/manufacturers/ManufacturersTable';
import { DataTable } from '@/components/ui/data-table';

export function ManufacturersList() {
  const navigate = useNavigate();
  const { data, isLoading } = trpc.manufacturers.list.useQuery();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manufacturers</h1>
        <Button onClick={() => navigate('/manufacturers/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Manufacturer
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <DataTable columns={columns} data={data ?? []} />
      )}
    </div>
  );
}
```

**Step 3: Create ManufacturerForm component**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { manufacturerCreateSchema } from '@/shared/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ManufacturerFormData = {
  name: string;
  slug: string;
  website?: string;
  logoUrl?: string;
};

interface ManufacturerFormProps {
  initialData?: Partial<ManufacturerFormData>;
  onSubmit: (data: ManufacturerFormData) => void;
  isLoading?: boolean;
}

export function ManufacturerForm({ initialData, onSubmit, isLoading }: ManufacturerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ManufacturerFormData>({
    resolver: zodResolver(manufacturerCreateSchema),
    defaultValues: initialData,
  });

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

        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" type="url" {...register('website')} />
          {errors.website && (
            <p className="text-sm text-red-600 mt-1">{errors.website.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input id="logoUrl" type="url" {...register('logoUrl')} />
          {errors.logoUrl && (
            <p className="text-sm text-red-600 mt-1">{errors.logoUrl.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Manufacturer'}
      </Button>
    </form>
  );
}
```

**Step 4: Create create/edit pages**

Create `admin/src/pages/manufacturers/ManufacturerCreate.tsx`:

```typescript
import { useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { ManufacturerForm } from '@/components/manufacturers/ManufacturerForm';
import { Card } from '@/components/ui/card';

export function ManufacturerCreate() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const createMutation = trpc.manufacturers.create.useMutation({
    onSuccess: () => {
      utils.manufacturers.list.invalidate();
      navigate('/manufacturers');
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Manufacturer</h1>

      <Card className="p-6">
        <ManufacturerForm
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </Card>
    </div>
  );
}
```

Create `admin/src/pages/manufacturers/ManufacturerEdit.tsx`:

```typescript
import { useParams, useNavigate } from 'react-router';
import { trpc } from '@/lib/trpc';
import { ManufacturerForm } from '@/components/manufacturers/ManufacturerForm';
import { Card } from '@/components/ui/card';

export function ManufacturerEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: manufacturer, isLoading } = trpc.manufacturers.byId.useQuery({
    id: Number(id),
  });

  const updateMutation = trpc.manufacturers.update.useMutation({
    onSuccess: () => {
      utils.manufacturers.list.invalidate();
      navigate('/manufacturers');
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!manufacturer) return <div>Manufacturer not found</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Manufacturer</h1>

      <Card className="p-6">
        <ManufacturerForm
          initialData={manufacturer}
          onSubmit={(data) => updateMutation.mutate({ id: Number(id), data })}
          isLoading={updateMutation.isPending}
        />
      </Card>
    </div>
  );
}
```

**Step 5: Add routes to App.tsx**

```typescript
import { ManufacturersList } from './pages/manufacturers/ManufacturersList';
import { ManufacturerCreate } from './pages/manufacturers/ManufacturerCreate';
import { ManufacturerEdit } from './pages/manufacturers/ManufacturerEdit';

// Inside Routes:
<Route path="manufacturers" element={<ManufacturersList />} />
<Route path="manufacturers/new" element={<ManufacturerCreate />} />
<Route path="manufacturers/:id/edit" element={<ManufacturerEdit />} />
```

**Step 6: Commit**

```bash
git add admin/src/pages/manufacturers/ admin/src/components/manufacturers/ admin/src/App.tsx
git commit -m "feat(admin): create manufacturers management pages"
```

---

### Task 16: Categories Management Pages

Follow the same pattern as Task 15 for categories:

**Files to create:**
- `admin/src/pages/categories/CategoriesList.tsx`
- `admin/src/components/categories/CategoriesTable.tsx`
- `admin/src/components/categories/CategoryForm.tsx`
- `admin/src/pages/categories/CategoryCreate.tsx`
- `admin/src/pages/categories/CategoryEdit.tsx`

**Key differences for categories:**
- Table should show parent category name
- Form should include parent category dropdown (hierarchical)
- Form should include sortOrder field (number input)

**Commit:**

```bash
git add admin/src/pages/categories/ admin/src/components/categories/ admin/src/App.tsx
git commit -m "feat(admin): create categories management pages with hierarchical support"
```

---

### Task 17: Hubs Management Pages

Follow the same pattern as Task 15 for hubs:

**Files to create:**
- `admin/src/pages/hubs/HubsList.tsx`
- `admin/src/components/hubs/HubsTable.tsx`
- `admin/src/components/hubs/HubForm.tsx`
- `admin/src/pages/hubs/HubCreate.tsx`
- `admin/src/pages/hubs/HubEdit.tsx`

**Key differences for hubs:**
- Table should show manufacturer name
- Form should include manufacturerId dropdown
- Form should include protocolsSupported (multi-select checkboxes for zigbee, zwave, matter, etc.)
- Form should include description textarea

**Commit:**

```bash
git add admin/src/pages/hubs/ admin/src/components/hubs/ admin/src/App.tsx
git commit -m "feat(admin): create hubs management pages"
```

---

## Phase 5: Advanced Features

### Task 18: Imports Monitoring Page

**Files:**
- Create: `admin/src/pages/imports/ImportsList.tsx`
- Create: `admin/src/components/imports/ImportsTable.tsx`

**Step 1: Create ImportsTable component**

```typescript
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type RawImport = {
  id: number;
  source: 'zigbee2mqtt' | 'blakadder' | 'zwave-js';
  sourceId: string;
  importedAt: Date;
  processedAt: Date | null;
};

export const columns: ColumnDef<RawImport>[] = [
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => {
      const source = row.getValue('source') as string;
      return <Badge variant="outline">{source}</Badge>;
    },
  },
  {
    accessorKey: 'sourceId',
    header: 'Source ID',
  },
  {
    accessorKey: 'importedAt',
    header: 'Imported',
    cell: ({ row }) => {
      const date = row.getValue('importedAt') as Date;
      return format(new Date(date), 'PPp');
    },
  },
  {
    accessorKey: 'processedAt',
    header: 'Status',
    cell: ({ row }) => {
      const processed = row.getValue('processedAt') as Date | null;
      return processed ? (
        <Badge className="bg-green-500">Processed</Badge>
      ) : (
        <Badge variant="secondary">Pending</Badge>
      );
    },
  },
];
```

**Step 2: Create ImportsList page**

```typescript
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { columns } from '@/components/imports/ImportsTable';
import { DataTable } from '@/components/ui/data-table';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ImportsList() {
  const [source, setSource] = useState<string>('all');
  const [processed, setProcessed] = useState<string>('all');

  const { data, isLoading, refetch } = trpc.imports.list.useQuery({
    source: source === 'all' ? undefined : source as any,
    processed: processed === 'all' ? undefined : processed === 'true',
    limit: 100,
    offset: 0,
  });

  const triggerMutation = trpc.imports.trigger.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Data Imports</h1>

        <div className="flex gap-2">
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="zigbee2mqtt">Zigbee2MQTT</SelectItem>
              <SelectItem value="blakadder">Blakadder</SelectItem>
              <SelectItem value="zwave-js">Z-Wave JS</SelectItem>
            </SelectContent>
          </Select>

          <Select value={processed} onValueChange={setProcessed}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Processed</SelectItem>
              <SelectItem value="false">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => triggerMutation.mutate({ source: 'zigbee2mqtt' })}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Trigger Import
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <DataTable columns={columns} data={data?.items ?? []} />
      )}
    </div>
  );
}
```

**Step 3: Install date-fns**

```bash
cd admin
pnpm add date-fns
```

**Step 4: Add route to App.tsx**

```typescript
import { ImportsList } from './pages/imports/ImportsList';

// Inside Routes:
<Route path="imports" element={<ImportsList />} />
```

**Step 5: Commit**

```bash
git add admin/src/pages/imports/ admin/src/components/imports/ admin/src/App.tsx admin/package.json
git commit -m "feat(admin): create imports monitoring page"
```

---

### Task 19: Delete Confirmations and Error Handling

**Files:**
- Create: `admin/src/hooks/useDeleteConfirm.tsx`
- Modify: All table components to use delete confirmation

**Step 1: Create delete confirmation hook**

```typescript
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function useDeleteConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState<(() => void) | null>(null);

  const confirm = (action: () => void) => {
    setDeleteAction(() => action);
    setIsOpen(true);
  };

  const handleConfirm = () => {
    if (deleteAction) {
      deleteAction();
    }
    setIsOpen(false);
    setDeleteAction(null);
  };

  const Dialog = () => (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the item.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-red-600">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, Dialog };
}
```

**Step 2: Install alert-dialog component**

```bash
cd admin
npx shadcn@latest add alert-dialog
```

**Step 3: Update ProductsTable to use delete confirmation**

In `ProductsTable.tsx`:

```typescript
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { trpc } from '@/lib/trpc';

// Inside component:
const utils = trpc.useUtils();
const { confirm, Dialog } = useDeleteConfirm();

const deleteMutation = trpc.products.delete.useMutation({
  onSuccess: () => {
    utils.products.list.invalidate();
  },
});

// Update Delete menu item:
<DropdownMenuItem
  className="text-red-600"
  onClick={() => confirm(() => deleteMutation.mutate({ id: product.id }))}
>
  <Trash className="mr-2 h-4 w-4" />
  Delete
</DropdownMenuItem>

// Add Dialog at end of component:
<Dialog />
```

**Step 4: Repeat for other table components**

Apply the same pattern to:
- `ManufacturersTable.tsx`
- `CategoriesTable.tsx`
- `HubsTable.tsx`

**Step 5: Commit**

```bash
git add admin/src/hooks/ admin/src/components/
git commit -m "feat(admin): add delete confirmations and error handling"
```

---

### Task 20: Toast Notifications

**Files:**
- Modify: `admin/src/App.tsx`
- Modify: All mutation hooks

**Step 1: Add Toaster to App.tsx**

```typescript
import { Toaster } from '@/components/ui/toaster';

// Inside App component, after BrowserRouter:
<BrowserRouter>
  <Routes>
    {/* ... routes */}
  </Routes>
  <Toaster />
</BrowserRouter>
```

**Step 2: Install toast hook**

```bash
cd admin
npx shadcn@latest add sonner
```

**Step 3: Update mutations to show toasts**

In `ProductCreate.tsx`:

```typescript
import { toast } from 'sonner';

const createMutation = trpc.products.create.useMutation({
  onSuccess: () => {
    utils.products.list.invalidate();
    toast.success('Product created successfully');
    navigate('/products');
  },
  onError: (error) => {
    toast.error(`Failed to create product: ${error.message}`);
  },
});
```

**Step 4: Repeat for all mutation hooks**

Update all create, update, and delete mutations across:
- Products (create, edit, delete)
- Manufacturers (create, edit, delete)
- Categories (create, edit, delete)
- Hubs (create, edit, delete)

**Step 5: Update Toaster import**

Replace the shadcn toaster with Sonner in App.tsx:

```typescript
import { Toaster } from 'sonner';

// Inside App:
<Toaster position="top-right" />
```

**Step 6: Commit**

```bash
git add admin/src/
git commit -m "feat(admin): add toast notifications for all mutations"
```

---

## Final Polish

### Task 21: Loading States and Skeletons

**Files:**
- Create: `admin/src/components/ui/LoadingSkeleton.tsx`
- Modify: All list pages

**Step 1: Create LoadingSkeleton component**

```typescript
import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-md border bg-white p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 flex-1" />
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Update list pages to use skeleton**

In `ProductsList.tsx` and others:

```typescript
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

{isLoading ? (
  <TableSkeleton rows={10} />
) : (
  <DataTable columns={columns} data={data?.items ?? []} />
)}
```

**Step 3: Commit**

```bash
git add admin/src/components/ui/LoadingSkeleton.tsx admin/src/pages/
git commit -m "feat(admin): add loading skeletons to all list pages"
```

---

### Task 22: Final Testing and Polish

**Step 1: Test all CRUD operations**

Manually test:
- Products: create, edit, delete, list, filter
- Manufacturers: create, edit, delete, list
- Categories: create, edit, delete, list (verify hierarchy)
- Hubs: create, edit, delete, list
- Imports: list, filter, trigger

**Step 2: Fix any styling inconsistencies**

Ensure:
- Consistent spacing and padding
- Proper responsive layout
- Accessible form labels
- Proper error message display

**Step 3: Update Dashboard with stats**

Add summary cards to Dashboard.tsx showing:
- Total products count
- Total manufacturers count
- Recent imports count
- Quick action buttons

**Step 4: Run build to check for TypeScript errors**

```bash
pnpm build
```

Expected: Clean build with no errors

**Step 5: Final commit**

```bash
git add .
git commit -m "feat(admin): final polish and testing"
```

---

## Deployment Checklist

- [ ] All backend tRPC routes implemented and tested
- [ ] All admin pages created (Products, Manufacturers, Categories, Hubs, Imports)
- [ ] Forms validated with Zod schemas
- [ ] Delete confirmations working
- [ ] Toast notifications on all mutations
- [ ] Loading states on all pages
- [ ] Responsive layout
- [ ] Build passes without errors
- [ ] Database seeded with initial data (`pnpm db:seed`)
- [ ] Environment variables configured

---

## Notes

**Testing Strategy:**
- Manual testing in dev mode for now
- Consider adding Vitest for unit tests later
- Consider Playwright for E2E tests later

**Performance Considerations:**
- Products list pagination working (50 items default)
- Consider virtual scrolling if lists exceed 500 items
- Add search debouncing if performance issues arise

**Future Enhancements:**
- Bulk actions (bulk delete, bulk status update)
- Product detail page showing full compatibility matrix
- Image upload for products and manufacturers
- Advanced filtering UI with filter chips
- Export functionality (CSV, JSON)
- Audit logs for all mutations
