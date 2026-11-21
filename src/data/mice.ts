/**
 * View model for the ring gallery on /mouse.
 *
 * Modeled after `MonitorProduct` to project catalogue products onto
 * the interactive 2D orbit ring storefront on /mouse.
 */
export interface MouseProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  image: string;
  category: string;
  summary: string;
  price: number;
  compareAtPrice?: number | null;
  specs: string[];
  sourceUrl: string;
}
