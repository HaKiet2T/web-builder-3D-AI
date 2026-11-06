import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const productsPage = readFileSync('src/app/admin/(dashboard)/products/page.tsx', 'utf8');
const dashboardPage = readFileSync('src/app/admin/(dashboard)/page.tsx', 'utf8');
const productForm = readFileSync('src/app/admin/(dashboard)/AdminProductForm.tsx', 'utf8');
const adminLayout = readFileSync('src/app/admin/(dashboard)/layout.tsx', 'utf8');
const workspaceComponent = readFileSync('src/app/admin/(dashboard)/products/ProductHierarchyWorkspace.tsx', 'utf8');
const filterComponent = readFileSync('src/app/admin/(dashboard)/products/ProductHierarchyFilter.tsx', 'utf8');
const tableComponent = readFileSync('src/app/admin/(dashboard)/products/ProductTable.tsx', 'utf8');
const drawerComponent = readFileSync('src/app/admin/(dashboard)/products/ProductEditDrawer.tsx', 'utf8');
const adminActions = readFileSync('src/app/admin/(dashboard)/actions.ts', 'utf8');
const imageProcessor = readFileSync('src/lib/catalog/image-processing.ts', 'utf8');
const bgScript = readFileSync('scripts/remove_background_and_standardize.py', 'utf8');
const globalStyles = readFileSync('src/app/globals.css', 'utf8');

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

  it('implements Direction 3: Cascading Category -> Brand -> Product hierarchy filter', () => {
    assert.match(workspaceComponent, /<ProductHierarchyFilter/);
    assert.match(filterComponent, /TẦNG 1: DANH MỤC SẢN PHẨM/);
    assert.match(filterComponent, /TẦNG 2: HÃNG CUNG CẤP \/ THƯƠNG HIỆU/);
    assert.match(filterComponent, /admin-pill-button/);
    assert.match(filterComponent, /admin-chip-button/);
  });

  it('renders products in a compact data table instead of nested details accordion', () => {
    assert.match(workspaceComponent, /<ProductTable/);
    assert.match(tableComponent, /<table className="admin-table"/);
    assert.match(tableComponent, /<th>Sản phẩm & SKU<\/th>/);
    assert.match(tableComponent, /<th>Danh mục & Hãng<\/th>/);
    assert.match(tableComponent, /<th>Giá bán từ<\/th>/);
    assert.match(tableComponent, /<th>Kho & Biến thể<\/th>/);
  });

  it('provides a slide-over panel drawer for creating and editing products', () => {
    assert.match(workspaceComponent, /<ProductEditDrawer/);
    assert.match(drawerComponent, /className="admin-drawer-panel"/);
    assert.match(drawerComponent, /className="admin-drawer-overlay"/);
    assert.match(drawerComponent, /handleKeyDown/);
    assert.match(drawerComponent, /'Escape'/);
    assert.match(drawerComponent, /<AdminProductForm/);
  });

  it('supports uploading multiple product images simultaneously without requiring alt text', () => {
    // Drawer form supports multiple files
    assert.match(drawerComponent, /name="files"/);
    assert.match(drawerComponent, /multiple/);
    assert.match(drawerComponent, /Mô tả ảnh \/ Tên ảnh \(alt text - không bắt buộc\)/);
    // Alt input should not be required
    assert.doesNotMatch(drawerComponent, /<input[\s\S]*name="alt"[\s\S]*required/);

    // Backend actions support multiple files and optional alt text
    assert.match(adminActions, /formData\.getAll\('files'\)/);
    assert.match(adminActions, /processProductImages/);
    assert.match(adminActions, /finalAlt = processedImages\.length > 1/);
  });

  it('routes uploaded product images through rembg background removal and 1:1 standardized canvas', () => {
    // Python worker script implements background removal and 1:1 aspect ratio
    assert.match(bgScript, /rembg/);
    assert.match(bgScript, /remove/);
    assert.match(bgScript, /target_dim/);
    assert.match(bgScript, /Image\.new\("RGBA", \(target_dim, target_dim\)/);
    assert.match(bgScript, /shadow_opacity/);

    // Image processor configures standardized 1200x1200 square canvas
    assert.match(adminActions, /targetDim:\s*1200/);
    assert.match(adminActions, /paddingRatio:\s*0\.82/);
  });

  it('optimizes background removal speed with smart pre-downscaling, ONNX thread tuning, multithreading, and hot daemon IPC', () => {
    // 1. Smart pre-downscaling: prevents processing oversized 12-48MP images
    assert.match(bgScript, /max_pre_dim/);
    assert.match(bgScript, /Image\.Resampling\.BILINEAR/);

    // 2. ONNX runtime thread pool optimization: prevents thread thrashing on high-core CPUs
    assert.match(bgScript, /sess_opts\.intra_op_num_threads/);
    assert.match(bgScript, /sess_opts\.inter_op_num_threads/);
    assert.match(bgScript, /ORT_ENABLE_ALL/);

    // 3. Fast PNG compression: eliminates expensive optimize=True brute-force passes
    assert.match(bgScript, /format="PNG", optimize=False, compress_level=4/);

    // 4. Concurrent batch execution with ThreadPoolExecutor
    assert.match(bgScript, /concurrent\.futures\.ThreadPoolExecutor/);
    assert.match(bgScript, /process_batch/);

    // 5. Resident hot daemon mode eliminating 3.5s-4.5s cold start import tax
    assert.match(bgScript, /run_daemon/);
    assert.match(bgScript, /--daemon/);
    assert.match(imageProcessor, /class RembgDaemonClient/);
    assert.match(imageProcessor, /ensureDaemon/);
    assert.match(imageProcessor, /processBatch/);
    assert.match(imageProcessor, /--daemon/);
  });

  it('renders pending image preview frames before background removal with close button to cancel', () => {
    // Media preview frame and status tag
    assert.match(drawerComponent, /className="admin-pending-preview-section"/);
    assert.match(drawerComponent, /className="admin-pending-frames-grid"/);
    assert.match(drawerComponent, /className="admin-pending-frame-card"/);
    assert.match(drawerComponent, /className="admin-pending-thumb-frame"/);
    assert.match(drawerComponent, /Chưa xóa phông/);

    // Close button (x) to delete image if user changes their mind
    assert.match(drawerComponent, /className="admin-pending-remove-btn"/);
    assert.match(drawerComponent, /handleRemovePending/);
    assert.match(drawerComponent, /Xóa ảnh.*nếu đổi ý/);
  });

  it('fixes filter UI/UX by suppressing native select arrow and positioning custom chevron in select-wrapper', () => {
    assert.match(filterComponent, /className="admin-select-wrapper"/);
    assert.match(filterComponent, /className="admin-filter-select"/);
    assert.match(filterComponent, /className="admin-select-chevron"/);

    // CSS rules verify wrapper and custom chevron positioning
    assert.match(globalStyles, /\.admin-select-wrapper\s*\{[\s\S]*position:\s*relative/);
    assert.match(globalStyles, /\.admin-filter-select\s*\{[\s\S]*appearance:\s*none/);
    assert.match(globalStyles, /\.admin-select-chevron\s*\{[\s\S]*position:\s*absolute/);
    assert.match(globalStyles, /\.admin-select-chevron\s*\{[\s\S]*pointer-events:\s*none/);
  });
});
