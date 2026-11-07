'use client';

import type { Category } from '@/lib/catalog/types';

interface BrandCount {
  name: string;
  count: number;
}

interface ProductHierarchyFilterProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  categoryCounts: Record<string, number>;
  totalProductsCount: number;
  availableBrands: BrandCount[];
  activeBrand: string;
  onSelectBrand: (brand: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function ProductHierarchyFilter({
  categories,
  activeCategoryId,
  onSelectCategory,
  categoryCounts,
  totalProductsCount,
  availableBrands,
  activeBrand,
  onSelectBrand,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  hasActiveFilters,
  onClearFilters,
}: ProductHierarchyFilterProps) {
  const selectedCategory = categories.find((c) => c.id === activeCategoryId);
  const totalBrandsCount = availableBrands.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="admin-hierarchy-controls">
      {/* Visual Breadcrumb Navigation */}
      <nav className="admin-breadcrumb-nav" aria-label="Đường dẫn phân cấp">
        <div className="admin-breadcrumb-path">
          <button
            type="button"
            className={`admin-breadcrumb-link ${activeCategoryId === 'all' && activeBrand === 'all' ? 'active' : ''}`}
            onClick={() => {
              onSelectCategory('all');
              onSelectBrand('all');
            }}
          >
            <svg
              className="admin-breadcrumb-home-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Tất cả danh mục ({totalProductsCount})</span>
          </button>

          {selectedCategory ? (
            <>
              <span className="admin-breadcrumb-sep" aria-hidden="true">/</span>
              <button
                type="button"
                className={`admin-breadcrumb-link ${activeBrand === 'all' ? 'active' : ''}`}
                onClick={() => onSelectBrand('all')}
              >
                <span>{selectedCategory.name}</span>
                <span className="admin-breadcrumb-count">({categoryCounts[selectedCategory.id] ?? 0})</span>
              </button>
            </>
          ) : null}

          {activeBrand !== 'all' ? (
            <>
              <span className="admin-breadcrumb-sep" aria-hidden="true">/</span>
              <span className="admin-breadcrumb-current">Hãng: {activeBrand}</span>
            </>
          ) : null}
        </div>

        {hasActiveFilters ? (
          <button
            type="button"
            className="admin-clear-link"
            onClick={onClearFilters}
            title="Đặt lại toàn bộ bộ lọc về mặc định"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Đặt lại bộ lọc</span>
          </button>
        ) : null}
      </nav>

      {/* Tầng 1: Category Segmented Pills */}
      <div className="admin-hierarchy-level" role="region" aria-label="TẦNG 1: DANH MỤC SẢN PHẨM">
        <div className="admin-hierarchy-label-row">
          <div className="admin-hierarchy-label">
            <span className="admin-step-badge">1</span>
            <span>TẦNG 1: DANH MỤC SẢN PHẨM</span>
          </div>
          <span className="admin-hierarchy-hint">
            {activeCategoryId === 'all'
              ? 'Tất cả các ngành hàng trong kho'
              : `Đang lọc: ${selectedCategory?.name}`}
          </span>
        </div>
        <div className="admin-pills-list" role="tablist" aria-label="Danh mục">
          <button
            type="button"
            role="tab"
            aria-selected={activeCategoryId === 'all'}
            className={`admin-pill-button ${activeCategoryId === 'all' ? 'active' : ''}`}
            onClick={() => onSelectCategory('all')}
          >
            <span>Tất cả danh mục</span>
            <span className="admin-pill-count">{totalProductsCount}</span>
          </button>
          {categories.map((category) => {
            const count = categoryCounts[category.id] ?? 0;
            const isActive = activeCategoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`admin-pill-button ${isActive ? 'active' : ''}`}
                onClick={() => onSelectCategory(category.id)}
              >
                <span>{category.name}</span>
                <span className="admin-pill-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tầng 2: Brand Selector Chips (động theo Danh mục) */}
      <div className="admin-hierarchy-level" role="region" aria-label="TẦNG 2: HÃNG CUNG CẤP / THƯƠNG HIỆU">
        <div className="admin-hierarchy-label-row">
          <div className="admin-hierarchy-label">
            <span className="admin-step-badge">2</span>
            <span>TẦNG 2: HÃNG CUNG CẤP / THƯƠNG HIỆU</span>
            {selectedCategory ? (
              <span className="admin-tag-badge">
                {selectedCategory.name}
              </span>
            ) : null}
          </div>
          <span className="admin-hierarchy-hint">
            {activeCategoryId === 'all'
              ? 'Tất cả các hãng trong hệ thống'
              : `Các thương hiệu cung ứng ${selectedCategory?.name}`}
          </span>
        </div>
        <div className="admin-chips-list" role="group" aria-label="Hãng cung cấp">
          <button
            type="button"
            className={`admin-chip-button ${activeBrand === 'all' ? 'active' : ''}`}
            onClick={() => onSelectBrand('all')}
          >
            <span>Tất cả hãng</span>
            <span className="admin-chip-count">{totalBrandsCount}</span>
          </button>
          {availableBrands.map((brand) => {
            const isActive = activeBrand === brand.name;
            return (
              <button
                key={brand.name}
                type="button"
                className={`admin-chip-button ${isActive ? 'active' : ''}`}
                onClick={() => onSelectBrand(brand.name)}
              >
                <span>{brand.name}</span>
                <span className="admin-chip-count">{brand.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar: Search & Status Filter */}
      <div className="admin-toolbar-row">
        <div className="admin-search-wrap">
          <svg
            className="admin-search-icon"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 4 4" />
          </svg>
          <input
            type="search"
            className="admin-search-input"
            placeholder="Tìm theo tên sản phẩm, mã SKU, thương hiệu, slug..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Tìm kiếm sản phẩm"
          />
          {searchQuery ? (
            <button
              type="button"
              className="admin-search-clear-btn"
              onClick={() => onSearchChange('')}
              aria-label="Xoá tìm kiếm"
            >
              ✕
            </button>
          ) : null}
        </div>

        <div className="admin-toolbar-actions">
          <div className="admin-select-wrapper">
            <select
              id="admin-status-filter"
              className="admin-filter-select"
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Lọc theo trạng thái"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang bán (Active)</option>
              <option value="draft">Bản nháp (Draft)</option>
              <option value="archived">Đã lưu trữ (Archived)</option>
            </select>
            <svg
              className="admin-select-chevron"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
