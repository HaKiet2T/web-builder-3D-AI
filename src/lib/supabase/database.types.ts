import type { CategoryId, MediaKind, StockStatus } from '@/lib/catalog/types';
import type { OrderStatus, PaymentStatus } from '@/types/order';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProductStatus = 'active' | 'draft' | 'archived';

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: CategoryId;
          slug: string;
          name: string;
          description: string;
          position: number;
        };
        Insert: {
          id: CategoryId;
          slug: string;
          name: string;
          description?: string;
          position?: number;
        };
        Update: {
          id?: CategoryId;
          slug?: string;
          name?: string;
          description?: string;
          position?: number;
        };
        Relationships: [];
      };
      products: {
        Row: {
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
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          category_id: CategoryId;
          summary?: string;
          description?: string;
          highlights?: string[];
          brand: string;
          source_url?: string | null;
          status?: ProductStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          category_id?: CategoryId;
          summary?: string;
          description?: string;
          highlights?: string[];
          brand?: string;
          source_url?: string | null;
          status?: ProductStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      product_variants: {
        Row: {
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
        };
        Insert: {
          id?: string;
          product_id: string;
          slug: string;
          name: string;
          sku: string;
          price: number;
          compare_at_price?: number | null;
          stock_status?: StockStatus;
          stock_quantity?: number;
          options?: Json;
        };
        Update: {
          id?: string;
          product_id?: string;
          slug?: string;
          name?: string;
          sku?: string;
          price?: number;
          compare_at_price?: number | null;
          stock_status?: StockStatus;
          stock_quantity?: number;
          options?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'product_variants_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      product_media: {
        Row: {
          id: string;
          product_id: string;
          kind: MediaKind;
          url: string;
          storage_path: string | null;
          alt: string;
          width: number | null;
          height: number | null;
          position: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          kind: MediaKind;
          url: string;
          storage_path?: string | null;
          alt?: string;
          width?: number | null;
          height?: number | null;
          position?: number;
        };
        Update: {
          id?: string;
          product_id?: string;
          kind?: MediaKind;
          url?: string;
          storage_path?: string | null;
          alt?: string;
          width?: number | null;
          height?: number | null;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'product_media_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
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
        };
        Insert: {
          id?: string;
          order_number: string;
          customer: Json;
          items: Json;
          fulfillments: Json;
          subtotal: number;
          shipping_total: number;
          discount_total?: number;
          total_amount: number;
          status: OrderStatus;
          payment_status: PaymentStatus;
          payment_method: string;
          payment_transaction_id?: string | null;
          is_split_shipment?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          customer?: Json;
          items?: Json;
          fulfillments?: Json;
          subtotal?: number;
          shipping_total?: number;
          discount_total?: number;
          total_amount?: number;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          payment_method?: string;
          payment_transaction_id?: string | null;
          is_split_shipment?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_store_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type CategoryRow = Tables<'categories'>;
export type ProductRow = Tables<'products'>;
export type ProductVariantRow = Tables<'product_variants'>;
export type ProductMediaRow = Tables<'product_media'>;
export type OrderRow = Tables<'orders'>;
