import { BrowserRouter, Routes, Route } from 'react-router';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { ProductsList } from './pages/products/ProductsList';
import { ProductCreate } from './pages/products/ProductCreate';
import { ProductEdit } from './pages/products/ProductEdit';
import { ManufacturersList } from './pages/manufacturers/ManufacturersList';
import { ManufacturerCreate } from './pages/manufacturers/ManufacturerCreate';
import { ManufacturerEdit } from './pages/manufacturers/ManufacturerEdit';
import { CategoriesList } from './pages/categories/CategoriesList';
import { CategoryCreate } from './pages/categories/CategoryCreate';
import { CategoryEdit } from './pages/categories/CategoryEdit';
import { HubsList } from './pages/hubs/HubsList';
import { HubCreate } from './pages/hubs/HubCreate';
import { HubEdit } from './pages/hubs/HubEdit';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductsList />} />
          <Route path="products/new" element={<ProductCreate />} />
          <Route path="products/:id/edit" element={<ProductEdit />} />
          <Route path="manufacturers" element={<ManufacturersList />} />
          <Route path="manufacturers/new" element={<ManufacturerCreate />} />
          <Route path="manufacturers/:id/edit" element={<ManufacturerEdit />} />
          <Route path="categories" element={<CategoriesList />} />
          <Route path="categories/new" element={<CategoryCreate />} />
          <Route path="categories/:id/edit" element={<CategoryEdit />} />
          <Route path="hubs" element={<HubsList />} />
          <Route path="hubs/new" element={<HubCreate />} />
          <Route path="hubs/:id/edit" element={<HubEdit />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App
