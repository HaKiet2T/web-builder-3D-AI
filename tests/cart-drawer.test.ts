import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeTotals, shippingFor, SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from '../src/lib/cart/pricing.ts';

describe('CartDrawer Slide-Over Popup & Resilient Storefront UI', () => {
  it('manages slide-over drawer open/close contract in useCartStore', () => {
    const storeContent = readFileSync('src/store/cart.ts', 'utf8');

    // Store interface definitions
    assert.match(storeContent, /isOpen:\s*boolean/);
    assert.match(storeContent, /openCart:\s*\(\)\s*=>\s*void/);
    assert.match(storeContent, /closeCart:\s*\(\)\s*=>\s*void/);
    assert.match(storeContent, /toggleCart:\s*\(\)\s*=>\s*void/);

    // Store action implementations
    assert.match(storeContent, /openCart:\s*\(\)\s*=>\s*set\(\{\s*isOpen:\s*true\s*\}\)/);
    assert.match(storeContent, /closeCart:\s*\(\)\s*=>\s*set\(\{\s*isOpen:\s*false\s*\}\)/);
    assert.match(storeContent, /toggleCart:\s*\(\)\s*=>\s*set\(\(state\)\s*=>\s*\(\{\s*isOpen:\s*!state\.isOpen\s*\}\)\)/);

    // Ensures isOpen is not leaked into localStorage partialize
    assert.match(storeContent, /partialize:\s*\(state\)\s*=>\s*\(\{\s*items:\s*state\.items\s*\}\)/);
  });

  it('calculates shipping fee and free shipping thresholds consistently', () => {
    assert.equal(FREE_SHIPPING_THRESHOLD, 2_000_000);

    // Under free threshold
    const lowValueItems = [
      {
        productId: 'prd-1',
        variantId: 'var-1',
        name: 'Item 1',
        variantName: 'Black',
        imageUrl: null,
        unitPrice: 300_000,
        quantity: 1,
        stockStatus: 'in-stock' as const,
      },
    ];
    const lowValueTotals = computeTotals(lowValueItems);
    assert.equal(lowValueTotals.shippingTotal, SHIPPING_FEE);
    assert.equal(shippingFor(lowValueItems), SHIPPING_FEE);

    // Meets or exceeds free threshold (FREE_SHIPPING_THRESHOLD = 2,000,000 VND)
    const freeItems = [
      {
        productId: 'prd-nimbus',
        variantId: 'var-nimbus',
        name: 'Nimbus',
        variantName: 'Đen',
        imageUrl: null,
        unitPrice: 2_500_000,
        quantity: 1,
        stockStatus: 'in-stock' as const,
      },
    ];
    const freeTotals = computeTotals(freeItems);
    assert.equal(freeTotals.shippingTotal, 0);
    assert.equal(shippingFor(freeItems), 0);
  });

  it('validates CartDrawer component structure and UI requirements', () => {
    const fileContent = readFileSync('src/components/cart/CartDrawer.tsx', 'utf8');

    // Drawer header
    assert.match(fileContent, /Giỏ hàng/);
    assert.match(fileContent, /Xoá tất cả/);

    // Free shipping progress indicator
    assert.match(fileContent, /Bạn được hưởng ưu đãi vận chuyển miễn phí/);
    assert.match(fileContent, /FREE_SHIPPING_THRESHOLD/);

    // Item controls
    assert.match(fileContent, /Loại bỏ/);

    // Footer actions
    assert.match(fileContent, /Tổng cộng/);
    assert.match(fileContent, /Nhập mã giảm giá khác/);
    assert.match(fileContent, /Thanh toán/);
    assert.match(fileContent, /LockIcon/);
  });

  it('integrates CartDrawer globally in layout and SiteHeader trigger', () => {
    const layoutContent = readFileSync('src/app/layout.tsx', 'utf8');
    const headerContent = readFileSync('src/components/layout/SiteHeader.tsx', 'utf8');
    const formContent = readFileSync('src/components/cart/AddToCartForm.tsx', 'utf8');

    // Layout mounts CartDrawer
    assert.match(layoutContent, /<CartDrawer \/>/);

    // Header toggles drawer on click (open on first click, close on second click)
    assert.match(headerContent, /toggleCart/);
    assert.match(headerContent, /onClick=\{toggleCart\}/);
    assert.match(headerContent, /totalCartCount/);

    // AddToCartForm triggers drawer
    assert.match(formContent, /openCart\(\)/);
  });

  it('synchronizes CartDrawer theme and applies soft rounded corners', () => {
    const fileContent = readFileSync('src/components/cart/CartDrawer.tsx', 'utf8');
    const globalsCss = readFileSync('src/app/globals.css', 'utf8');

    // Theme synchronization
    assert.match(fileContent, /useTheme/);
    assert.match(fileContent, /data-theme=\{theme\}/);
    assert.match(globalsCss, /@custom-variant dark \(&:where\(\[data-theme=dark\]/);

    // Rounded soft edges
    assert.match(fileContent, /sm:rounded-l-\[28px\]/);
    assert.match(fileContent, /rounded-2xl/);
    assert.match(fileContent, /rounded-full/);
  });

  it('guarantees unique keys for checkout issues preventing undefined-undefined error', () => {
    const checkoutContent = readFileSync('src/components/cart/CheckoutForm.tsx', 'utf8');
    const checkoutRoute = readFileSync('src/app/api/checkout/route.ts', 'utf8');

    // CheckoutForm should never produce undefined-undefined keys
    assert.doesNotMatch(checkoutContent, /key=\{\`\$\{issue\.code\}-\$\{issue\.variantId\}\`\}/);
    assert.match(checkoutContent, /issueKey/);
    assert.match(checkoutContent, /getFieldLabel/);

    // API checkout returns validation_error code
    assert.match(checkoutRoute, /code:\s*['"]validation_error['"]/);
  });

  it('guarantees resilient handling in account DAL without throwing server console errors', () => {
    const accountDal = readFileSync('src/lib/account/dal.ts', 'utf8');
    const ordersDal = readFileSync('src/lib/orders/dal.ts', 'utf8');

    // Should NOT use console.error for missing tables/columns
    assert.doesNotMatch(accountDal, /console\.error\('\[listUserAddresses\]/);
    assert.doesNotMatch(accountDal, /console\.error\('\[listUserNotifications\]/);
    assert.doesNotMatch(ordersDal, /console\.error\('\[listUserOrders\]/);

    // Uses console.warn for graceful schema degradation
    assert.match(accountDal, /console\.warn\('\[listUserAddresses\]/);
    assert.match(accountDal, /console\.warn\('\[listUserNotifications\]/);
    assert.match(ordersDal, /console\.warn\('\[listUserOrders\]/);
  });
});
