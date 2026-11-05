import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const productsPage = readFileSync('src/app/admin/(dashboard)/products/page.tsx', 'utf8');
const dashboardPage = readFileSync('src/app/admin/(dashboard)/page.tsx', 'utf8');
const productForm = readFileSync('src/app/admin/(dashboard)/AdminProductForm.tsx', 'utf8');
const adminLayout = readFileSync('src/app/admin/(dashboard)/layout.tsx', 'utf8');

describe('admin navigation and product editing experience', () => {
  it('streams product data below a route-local Suspense boundary', () => {
    assert.match(productsPage, /<Suspense[\s\S]*<AdminProductsContent/);
    assert.doesNotMatch(productsPage, /export default async function AdminProductsPage/);
  });

  it('streams dashboard metrics below a route-local Suspense boundary', () => {
    assert.match(dashboardPage, /<Suspense[\s\S]*<AdminDashboardContent/);
    assert.doesNotMatch(dashboardPage, /export default async function AdminDashboardPage/);
  });

  it('edits variants through labeled fields instead of a raw JSON textarea', () => {
    assert.match(productForm, /type="hidden" name="variants"/);
    assert.match(productForm, /Thêm biến thể/);
    assert.match(productForm, /Xoá biến thể/);
    assert.doesNotMatch(productForm, /<textarea name="variants"/);
  });

  it('verifies admin session before flushing response headers to ensure clean HTTP 307 redirect', () => {
    assert.match(adminLayout, /export default async function AdminLayout/);
    assert.doesNotMatch(adminLayout, /export default function AdminLayout[\s\S]*<Suspense/);
  });
});
