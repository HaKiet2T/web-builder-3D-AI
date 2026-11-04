import type { CategoryId, MediaKind, StockStatus } from '@/lib/catalog/types';
import type { OrderStatus, PaymentStatus } from '@/types/order';

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProductStatus = 'active' | 'draft' | 'archived';

export interface CategoryRow {
  [key: string]: unknown;
  id: CategoryId;
  slug: string;
  name: string;
  description: string;
  position: number;
}

export interface ProductRow {
  [key: string]: unknown;
  id: string;
  slug: string;
  name: string;
  category_id: CategoryId;
  summary: string;
  description: string;
  highlights: string[];
  brand: string;
  source_url: string | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface ProductVariantRow {
  [key: string]: unknown;
  id: string;
  product_id: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  compare_at_price: number | null;
  stock_status: StockStatus;
  stock_quantity: number;
  options: Json;
}

export interface ProductMediaRow {
  [key: string]: unknown;
  id: string;
  product_id: string;
  kind: MediaKind;
  url: string;
  storage_path: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  position: number;
}

export interface OrderRow {
  [key: string]: unknown;
  id: string;
  order_number: string;
  customer: Json;
  items: Json;
  fulfillments: Json;
  subtotal: number;
  shipping_total: number;
  discount_total: number;
  total_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  payment_transaction_id: string | null;
  is_split_shipment: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      categories: Table<CategoryRow>;
      products: Table<ProductRow>;
      product_variants: Table<ProductVariantRow>;
      product_media: Table<ProductMediaRow>;
      orders: Table<OrderRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
