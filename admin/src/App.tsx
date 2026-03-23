import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { trpc, trpcClient } from './lib/trpc'
import { AppLayout } from './components/layout/AppLayout'
import { RedirectIfAuthenticated, RequireAuth } from './components/auth/AuthGuard'
import { Dashboard } from './pages/Dashboard'
import { ProductsList } from './pages/products/ProductsList'
import { ProductCreate } from './pages/products/ProductCreate'
import { ProductEdit } from './pages/products/ProductEdit'
import { ManufacturersList } from './pages/manufacturers/ManufacturersList'
import { ManufacturerCreate } from './pages/manufacturers/ManufacturerCreate'
import { ManufacturerEdit } from './pages/manufacturers/ManufacturerEdit'
import { CategoriesList } from './pages/categories/CategoriesList'
import { CategoryCreate } from './pages/categories/CategoryCreate'
import { CategoryEdit } from './pages/categories/CategoryEdit'
import { ImportsList } from './pages/imports/ImportsList'
import { PlatformsList } from './pages/platforms/PlatformsList'
import { PlatformCreate } from './pages/platforms/PlatformCreate'
import { PlatformEdit } from './pages/platforms/PlatformEdit'
import { IntegrationsList } from './pages/integrations/IntegrationsList'
import { IntegrationCreate } from './pages/integrations/IntegrationCreate'
import { IntegrationEdit } from './pages/integrations/IntegrationEdit'
import { CommercialHubsList } from './pages/commercial-hubs/CommercialHubsList'
import { CommercialHubCreate } from './pages/commercial-hubs/CommercialHubCreate'
import { CommercialHubEdit } from './pages/commercial-hubs/CommercialHubEdit'
import { CompatibilityPage } from './pages/compatibility/CompatibilityPage'
import { ExportsPage } from './pages/exports/ExportsPage'
import { UsersPage } from './pages/users/UsersPage'
import { Login } from './pages/Login'
import { Toaster } from 'sonner'

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            retry: 1,
          },
        },
      }),
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename="/admin">
          <Routes>
            <Route element={<RedirectIfAuthenticated />}>
              <Route path="login" element={<Login />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<ProductsList />} />
                <Route path="products/new" element={<ProductCreate />} />
                <Route path="products/:id/edit" element={<ProductEdit />} />
                <Route path="compatibility" element={<CompatibilityPage />} />
                <Route path="platforms" element={<PlatformsList />} />
                <Route path="platforms/new" element={<PlatformCreate />} />
                <Route path="platforms/:id/edit" element={<PlatformEdit />} />
                <Route path="integrations" element={<IntegrationsList />} />
                <Route path="integrations/new" element={<IntegrationCreate />} />
                <Route path="integrations/:id/edit" element={<IntegrationEdit />} />
                <Route path="commercial-hubs" element={<CommercialHubsList />} />
                <Route path="commercial-hubs/new" element={<CommercialHubCreate />} />
                <Route path="commercial-hubs/:id/edit" element={<CommercialHubEdit />} />
                <Route path="manufacturers" element={<ManufacturersList />} />
                <Route path="manufacturers/new" element={<ManufacturerCreate />} />
                <Route path="manufacturers/:id/edit" element={<ManufacturerEdit />} />
                <Route path="categories" element={<CategoriesList />} />
                <Route path="categories/new" element={<CategoryCreate />} />
                <Route path="categories/:id/edit" element={<CategoryEdit />} />
                <Route path="hubs" element={<Navigate to="/commercial-hubs" replace />} />
                <Route path="hubs/new" element={<Navigate to="/commercial-hubs/new" replace />} />
                <Route
                  path="hubs/:id/edit"
                  element={<Navigate to="/commercial-hubs" replace />}
                />
                <Route path="imports" element={<ImportsList />} />
                <Route path="exports" element={<ExportsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="settings" element={<Navigate to="/exports" replace />} />
              </Route>
            </Route>
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  )
}

export default App
