// Type definitions for E-commerce 3D

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  modelUrl: string;
  thumbnailUrl: string;
  category: string;
  availableColors: string[];
  availableMaterials: string[];
  inStock: boolean;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  selectedColor: string;
  selectedMaterial: string;
}

export interface CheckoutFormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  notes?: string;
}

export * from './order';

