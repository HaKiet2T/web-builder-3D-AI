export interface MonitorProduct {
  id: string;
  name: string;
  image: string;
  category: string;
  specs: string[];
  sourceUrl: string;
}

export const monitors: MonitorProduct[] = [
  {
    id: 'rog-strix-oled-xg27aqwmg',
    name: 'ROG Strix OLED XG27AQWMG',
    image: '/products/asus/ROG%20Strix%20OLED%20XG27AQWMG.png',
    category: 'Màn hình OLED',
    specs: ['26,5 inch · WOLED Tandem', 'QHD · 2560 × 1440', '280 Hz', '0,03 ms GTG'],
    sourceUrl: 'https://rog.asus.com/us/monitors/27-to-31-5-inches/rog-strix-oled-xg27aqwmg/spec/',
  },
  {
    id: 'rog-strix-xg259cms',
    name: 'ROG Strix XG259CMS',
    image: '/products/asus/ROG%20Strix%20XG259CMS.png',
    category: 'Màn hình esports',
    specs: ['24,5 inch · Fast IPS', 'Full HD · 1920 × 1080', '310 Hz OC', '1 ms GTG'],
    sourceUrl: 'https://rog.asus.com/us/monitors/23-to-24-5-inches/rog-strix-xg259cms/spec/?config=90LM0A40-B013B0',
  },
  {
    id: 'rog-strix-xg259qn',
    name: 'ROG Strix XG259QN',
    image: '/products/asus/ROG%20Strix%20XG259QN.png',
    category: 'Màn hình esports',
    specs: ['24,5 inch · IPS', 'Full HD · 1920 × 1080', 'Tối đa 380 Hz', '1 ms GTG · 0,3 ms tối thiểu'],
    sourceUrl: 'https://rog.asus.com/monitors/23-to-24-5-inches/rog-strix-xg259qn/spec/',
  },
  {
    id: 'rog-strix-xg259qns',
    name: 'ROG Strix XG259QNS',
    image: '/products/asus/ROG%20Strix%20XG259QNS.png',
    category: 'Màn hình esports',
    specs: ['24,5 inch · IPS', 'Full HD · 1920 × 1080', 'Tối đa 380 Hz', '1 ms GTG · 0,3 ms tối thiểu'],
    sourceUrl: 'https://rog.asus.com/us/monitors/23-to-24-5-inches/rog-strix-xg259qns/spec/',
  },
  {
    id: 'rog-strix-xg259qnsr-ace',
    name: 'ROG Strix XG259QNSR Ace',
    image: '/products/asus/ROG%20Strix%20XG259QNSR%20Ace.png',
    category: 'Màn hình esports',
    specs: ['24,5 inch · IPS', 'Full HD · 1920 × 1080', 'Tối đa 420 Hz', '1 ms GTG · 0,3 ms tối thiểu'],
    sourceUrl: 'https://rog.asus.com/me-en/monitors/23-to-24-5-inches/rog-strix-xg259qnsr-ace/spec/',
  },
  {
    id: 'rog-swift-pro-pg248qp',
    name: 'ROG Swift Pro PG248QP',
    image: '/products/asus/ROG%20Swift%20Pro%20PG248QP.png',
    category: 'Màn hình esports',
    specs: ['24,1 inch · Esports TN', 'Full HD · 1920 × 1080', '540 Hz OC', '0,2 ms GTG'],
    sourceUrl: 'https://rog.asus.com/uk/monitors/23-to-24-5-inches/rog-swift-pro-pg248qp/spec/?config=90LM08T0-B01370',
  },
];
