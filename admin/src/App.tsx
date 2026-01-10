import { BrowserRouter, Routes, Route } from 'react-router';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { ProductsList } from './pages/products/ProductsList';
import { ProductCreate } from './pages/products/ProductCreate';
import { ProductEdit } from './pages/products/ProductEdit';
import { ManufacturersList } from './pages/manufacturers/ManufacturersList';
import { ManufacturerCreate } from './pages/manufacturers/ManufacturerCreate';
import { ManufacturerEdit } from './pages/manufacturers/ManufacturerEdit';

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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App
