/**
 * View model for the ring gallery on /monitor.
 *
 * The gallery was built against this compact shape before the shared catalogue
 * existed. The product data itself now lives in `lib/catalog`; this type is only
 * the projection the gallery renders, produced by `lib/catalog/monitor-adapter`.
 */
export interface MonitorProduct {
  id: string;
  name: string;
  image: string;
  category: string;
  specs: string[];
  sourceUrl: string;
}