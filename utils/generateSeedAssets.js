import fs from 'fs';
import path from 'path';

const sampleSvg = (title, color) => `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
  <defs>
    <linearGradient id="grad-${color.replace('#', '')}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color}" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>
  <rect width="600" height="450" fill="url(#grad-${color.replace('#', '')})" />
  <rect x="24" y="24" width="552" height="402" rx="16" fill="none" stroke="white" stroke-width="2" stroke-opacity="0.25" />
  <circle cx="300" cy="180" r="60" fill="white" fill-opacity="0.1" />
  <path d="M285 180 L295 190 L315 170" fill="none" stroke="#10b981" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
  <text x="300" y="275" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="20" font-weight="700">${title}</text>
  <text x="300" y="310" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="500">VERIFIED AUTHENTIC MARKETPLACE ASSET</text>
</svg>`;

const items = [
  ['af1.svg', 'Nike Air Force 1 07 Triple White', '#1e293b'],
  ['jordan1.svg', 'Air Jordan 1 Retro High OG Chicago', '#991b1b'],
  ['ultraboost.svg', 'Adidas Ultraboost Light Core Black', '#0369a1'],
  ['dunk.svg', 'Nike Dunk Low Retro Panda', '#18181b'],
  ['iphone15.svg', 'Apple iPhone 15 Pro Max 256GB Titanium', '#334155'],
  ['sony.svg', 'Sony WH-1000XM4 Noise Canceling Headphones', '#27272a'],
  ['keyboard.svg', 'Keychron Q1 Pro Wireless Mechanical Keyboard', '#0f766e'],
  ['macbook.svg', 'Apple MacBook Pro 16 M3 Pro 18GB/512GB', '#475569'],
  ['ps5.svg', 'Sony PlayStation 5 Console Disc Edition', '#1d4ed8'],
  ['pokemon.svg', '1st Edition Shadowless Charizard Holo Rare', '#c2410c'],
  ['switch.svg', 'Nintendo Switch OLED Model Mario Red', '#b91c1c'],
  ['lego.svg', 'LEGO Star Wars Millennium Falcon Collector Edition', '#3f3f46'],
  ['rolex.svg', 'Rolex Submariner Date 41mm Oystersteel 126610LN', '#065f46'],
  ['omega.svg', 'Omega Speedmaster Professional Moonwatch Co-Axial', '#1e1b4b'],
  ['cartier.svg', 'Cartier Santos de Cartier Large Model Steel', '#701a75'],
  ['bose.svg', 'Bose QuietComfort Ultra Wireless Headphones', '#0284c7'],
  ['ipad.svg', 'Apple iPad Pro 12.9 M2 Liquid Retina 128GB', '#4338ca'],
  ['yeezy.svg', 'Adidas Yeezy Boost 350 V2 Zebra', '#1c1917'],
  ['canon.svg', 'Canon EOS R6 Mark II Mirrorless Camera', '#374151'],
  ['steamdeck.svg', 'Valve Steam Deck OLED 512GB Handheld', '#312e81'],
];

const targetDir = path.resolve('uploads', 'seeds');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

for (const [file, title, color] of items) {
  fs.writeFileSync(path.join(targetDir, file), sampleSvg(title, color), 'utf8');
}
console.log(`Successfully generated ${items.length} mock seed assets in uploads/seeds!`);
