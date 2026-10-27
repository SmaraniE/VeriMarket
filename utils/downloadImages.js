import fs from 'fs';
import path from 'path';

// Curated high quality authentic product photo URLs for every item
const IMAGE_SOURCES = {
  'af1.jpg': 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80', // AF1 white sneakers
  'jordan1.jpg': 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80', // Air Jordan retro
  'ultraboost.jpg': 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&auto=format&fit=crop&q=80', // Adidas running shoe
  'dunk.jpg': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80', // Red/Black sneaker
  'yeezy.jpg': 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=800&auto=format&fit=crop&q=80', // Yeezy zebra style
  'iphone15.jpg': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80', // iPhone 15 Pro titanium
  'sony.jpg': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80', // Sony headphones
  'keyboard.jpg': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80', // Custom mechanical keyboard
  'macbook.jpg': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80', // Apple MacBook Pro
  'bose.jpg': 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80', // Bose wireless headphones
  'ipad.jpg': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80', // iPad Pro
  'canon.jpg': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80', // Canon camera
  'ps5.jpg': 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80', // PlayStation 5 console
  'pokemon.jpg': 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&auto=format&fit=crop&q=80', // Pokemon card collectibles
  'switch.jpg': 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800&auto=format&fit=crop&q=80', // Nintendo Switch console
  'lego.jpg': 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=800&auto=format&fit=crop&q=80', // Star wars lego set
  'steamdeck.jpg': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', // Handheld gaming PC
  'rolex.jpg': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80', // Luxury Rolex Submariner steel watch
  'omega.jpg': 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80', // Luxury chronograph watch
  'cartier.jpg': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80', // Luxury square watch
};

const seedsDir = path.resolve('uploads', 'seeds');
if (!fs.existsSync(seedsDir)) {
  fs.mkdirSync(seedsDir, { recursive: true });
}

export const downloadRealSeedImages = async () => {
  console.log('Downloading real authentic product photos into uploads/seeds...');
  for (const [filename, url] of Object.entries(IMAGE_SOURCES)) {
    const dest = path.join(seedsDir, filename);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      fs.writeFileSync(dest, Buffer.from(arrayBuffer));
      console.log(`✓ Downloaded ${filename}`);
    } catch (err) {
      console.error(`Failed to download ${filename} from ${url}:`, err.message);
    }
  }
  console.log('Finished downloading all product images!');
};

if (process.argv[1]?.endsWith('downloadImages.js')) {
  downloadRealSeedImages().catch(console.error);
}
