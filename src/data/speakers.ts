/**
 * View model for the Acoustic Waveform & Desk Stage storefront on /speaker.
 *
 * Projects catalogue products into the bespoke interactive speaker showcase.
 */
export interface SpeakerProduct {
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
  speakerType: 'bookshelf' | 'soundbar';
  powerWatts: number;
  frequencyResponse: string;
  driverConfiguration: string;
  connectivity: string[];
}
