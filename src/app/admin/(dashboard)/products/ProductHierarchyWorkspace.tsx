'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { Category } from '@/lib/catalog/types';
import type { AdminProduct } from '@/lib/catalog/dal';
import { ProductHierarchyFilter } from '@/app/admin/(dashboard)/products/ProductHierarchyFilter';
import { ProductTable } from '@/app/admin/(dashboard)/products/ProductTable';
import { ProductEditDrawer } from '@/app/admin/(dashboard)/products/ProductEditDrawer';

interface ProductHierarchyWorkspaceProps {
  products: AdminProduct[];
  categories: Category[];
  savedMessage: string | null;
  initialCategory?: string;
  initialBrand?: string;
}

interface DrawerState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  productId?: string;
  activeTab: 'details' | 'media';
}

export function ProductHierarchyWorkspace({
  products,
  categories,
  savedMessage,
  initialCategory = 'all',
  initialBrand = 'all',
}: ProductHierarchyWorkspaceProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(initialCategory);
  const [activeBrand, setActiveBrand] = useState<string>(initialBrand);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [, startTransition] = useTransition();

  const [drawer, setDrawer] = useState<DrawerState>({
    isOpen: false,
    mode: 'create',
    activeTab: 'details',
  });

  // Keep browser URL query params synchronized with active filters without full page reload
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    let changed = false;

    if (activeCategoryId !== 'all') {
      if (url.searchParams.get('category') !== activeCategoryId) {
        url.searchParams.set('category', activeCategoryId);
        changed = true;
      }
    } else if (url.searchParams.has('category')) {
      url.searchParams.delete('category');
      changed = true;
    }

    if (activeBrand !== 'all') {
      if (url.searchParams.get('brand') !== activeBrand) {
        url.searchParams.set('brand', activeBrand);
        changed = true;
      }
    } else if (url.searchParams.has('brand')) {
      url.searchParams.delete('brand');
      changed = true;
    }

    if (changed) {
      window.history.replaceState(null, '', url.toString());
    }
  }, [activeCategoryId, activeBrand]);

  // Calculate category counts and statistics
  const categoryStats = useMemo(() => {
    const map = new Map<
      string,
      { count: number; stock: number; brands: Set<string>; activeCount: number }
    >();

    for (const cat of categories) {
      map.set(cat.id, { count: 0, stock: 0, brands: new Set(), activeCount: 0 });
    }

    for (const product of products) {
      const stat = map.get(product.categoryId);
      if (stat) {
        stat.count += 1;
        if (product.status === 'active') stat.activeCount += 1;
        if (product.brand?.trim()) stat.brands.add(product.brand.trim());
        stat.stock += product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
      }
    }

    return map;
  }, [products, categories]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [id, stat] of categoryStats.entries()) {
      counts[id] = stat.count;
    }
    return counts;
  }, [categoryStats]);

  // Dynamic brands list based on selected category
  const availableBrands = useMemo(() => {
    const productsInScope =
      activeCategoryId === 'all'
        ? products
        : products.filter((p) => p.categoryId === activeCategoryId);

    const brandMap = new Map<string, number>();
    for (const product of productsInScope) {
      const brand = product.brand?.trim();
      if (brand) {
        brandMap.set(brand, (brandMap.get(brand) || 0) + 1);
      }
    }

    return Array.from(brandMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products, activeCategoryId]);

  // Main filtered products list
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      // 1. Category filter
      if (activeCategoryId !== 'all' && product.categoryId !== activeCategoryId) {
        return false;
      }

      // 2. Brand filter
      if (activeBrand !== 'all' && product.brand !== activeBrand) {
        return false;
      }

      // 3. Status filter
      if (statusFilter !== 'all' && product.status !== statusFilter) {
        return false;
      }

      // 4. Search query (matches name, slug, brand, or SKU)
      if (query) {
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesSlug = product.slug.toLowerCase().includes(query);
        const matchesBrand = product.brand.toLowerCase().includes(query);
        const matchesSku = product.variants.some((v) =>
          v.sku.toLowerCase().includes(query) || v.name.toLowerCase().includes(query),
        );
        if (!matchesName && !matchesSlug && !matchesBrand && !matchesSku) {
          return false;
        }
      }

      return true;
    });
  }, [products, activeCategoryId, activeBrand, statusFilter, searchQuery]);

  const hasActiveFilters =
    activeCategoryId !== 'all' ||
    activeBrand !== 'all' ||
    statusFilter !== 'all' ||
    searchQuery.trim().length > 0;

  function handleSelectCategory(catId: string) {
    startTransition(() => {
      setActiveCategoryId(catId);
      setActiveBrand('all');
    });
  }

  function handleSelectBrand(brand: string) {
    startTransition(() => {
      setActiveBrand(brand);
    });
  }

  function handleClearFilters() {
    startTransition(() => {
      setActiveCategoryId('all');
      setActiveBrand('all');
      setStatusFilter('all');
      setSearchQuery('');
    });
  }

  function handleOpenCreate() {
    setDrawer({
      isOpen: true,
      mode: 'create',
      productId: undefined,
      activeTab: 'details',
    });
  }

  function handleOpenEdit(product: AdminProduct) {
    setDrawer({
      isOpen: true,
      mode: 'edit',
      productId: product.id,
      activeTab: 'details',
    });
  }

  function handleOpenMedia(product: AdminProduct) {
    setDrawer({
      isOpen: true,
      mode: 'edit',
      productId: product.id,
      activeTab: 'media',
    });
  }

  function handleCloseDrawer() {
    setDrawer((current) => ({ ...current, isOpen: false }));
  }

  const activeProduct = products.find((p) => p.id === drawer.productId);

  // Overall statistics
  const activeCount = useMemo(
    () => products.filter((p) => p.status === 'active').length,
    [products],
  );
  const draftCount = useMemo(
    () => products.filter((p) => p.status === 'draft').length,
    [products],
  );
  const totalStockCount = useMemo(
    () =>
      products.reduce(
        (sum, p) => sum + p.variants.reduce((vSum, v) => vSum + v.stockQuantity, 0),
        0,
      ),
    [products],
  );

  return (
    <div className="admin-hierarchy-workspace">
      {savedMessage ? (
        <div className="admin-success-banner" role="status">
          <span>{savedMessage}</span>
        </div>
      ) : null}

      {/* Primary KPI bar & Action */}
      <div className="admin-stats-bar">
        <div className="admin-stats-group">
          <div className="admin-stat-item">
            <span className="admin-stat-label">Tổng sản phẩm:</span>
            <span className="admin-stat-value">{products.length}</span>
          </div>
          <div className="admin-stat-item">
            <span className="admin-stat-label">Đang bán:</span>
            <span className="admin-stat-value admin-stat-active">{activeCount}</span>
          </div>
          <div className="admin-stat-item">
            <span className="admin-stat-label">Bản nháp / Lưu trữ:</span>
            <span className="admin-stat-value admin-stat-muted">{draftCount}</span>
          </div>
          <div className="admin-stat-item">
            <span className="admin-stat-label">Tổng tồn kho:</span>
            <span className="admin-stat-value">{totalStockCount.toLocaleString('vi-VN')}</span>
          </div>
        </div>

        <button
          type="button"
          className="admin-button admin-button-primary"
          onClick={handleOpenCreate}
        >
          + Thêm sản phẩm mới
        </button>
      </div>

      {/* Cascading Controls: Category Pills -> Brand Chips -> Search/Filter */}
      <ProductHierarchyFilter
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={handleSelectCategory}
        categoryCounts={categoryCounts}
        totalProductsCount={products.length}
        availableBrands={availableBrands}
        activeBrand={activeBrand}
        onSelectBrand={handleSelectBrand}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Product Data Table - Always visible, immediately responsive to filters */}
      <ProductTable
        products={filteredProducts}
        categories={categories}
        totalCount={products.length}
        onEditProduct={handleOpenEdit}
        onOpenMedia={handleOpenMedia}
        onAddNewProduct={handleOpenCreate}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Slide-over Drawer for Create / Edit */}
      <ProductEditDrawer
        isOpen={drawer.isOpen}
        mode={drawer.mode}
        product={activeProduct}
        categories={categories}
        defaultCategoryId={activeCategoryId !== 'all' ? activeCategoryId : undefined}
        defaultBrand={activeBrand !== 'all' ? activeBrand : undefined}
        activeTab={drawer.activeTab}
        onTabChange={(tab) => setDrawer((curr) => ({ ...curr, activeTab: tab }))}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
