import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';

const SEED_PRODUCTS = [
  // Fashion / Shoes
  {
    title: 'Nike Air Force 1 \'07 Triple White',
    description: 'Iconic sneaker in pristine triple white colorway. Clean silhouette with genuine leather upper and Nike Air cushioning.',
    category: 'Fashion',
    brand: 'Nike',
    condition: 'new',
    serialNumber: 'CW2288-111',
    images: ['/uploads/seeds/af1.jpg'],
    listingType: 'fixed',
    price: 110,
    quantity: 5,
    isVerified: true,
    verificationStatus: 'Verified',
  },
  {
    title: 'Air Jordan 1 Retro High OG Chicago Lost & Found',
    description: 'The definitive Chicago colorway with vintage aesthetics and cracked leather collar accents. Includes original retro box.',
    category: 'Fashion',
    brand: 'Jordan',
    condition: 'new',
    serialNumber: 'DZ5485-612',
    images: ['/uploads/seeds/jordan1.jpg'],
    listingType: 'auction',
    startPrice: 220,
    durationHours: 48,
    isVerified: true,
    verificationStatus: 'Verified',
  },
  {
    title: 'Adidas Ultraboost Light Core Black',
    description: 'Lightest Ultraboost yet with 30% lighter Boost material. Superb comfort for running and lifestyle wear.',
    category: 'Fashion',
    brand: 'Adidas',
    condition: 'like-new',
    serialNumber: 'HQ6351',
    images: ['/uploads/seeds/ultraboost.jpg'],
    listingType: 'fixed',
    price: 135,
    quantity: 3,
    isVerified: false,
    verificationStatus: 'Pending',
  },
  {
    title: 'Nike Dunk Low Retro Panda Black White',
    description: 'Classic monochrome everyday staple. Barely worn twice, kept in smoke-free sneaker display crate.',
    category: 'Fashion',
    brand: 'Nike',
    condition: 'like-new',
    serialNumber: 'DD1391-100',
    images: ['/uploads/seeds/dunk.jpg'],
    listingType: 'auction',
    startPrice: 85,
    durationHours: 36,
    isVerified: true,
    verificationStatus: 'Verified',
  },
  {
    title: 'Adidas Yeezy Boost 350 V2 Zebra',
    description: 'Primeknit upper in striking zebra pattern with signature red SPLY-350 accent stripe and translucent Boost sole.',
    category: 'Fashion',
    brand: 'Yeezy',
    condition: 'good',
    serialNumber: 'CP9654',
    images: ['/uploads/seeds/yeezy.jpg'],
    listingType: 'fixed',
    price: 240,
    quantity: 1,
    isVerified: true,
    verificationStatus: 'Verified',
  },

  // Electronics
  {
    title: 'Apple iPhone 15 Pro Max 256GB Natural Titanium',
    description: 'Flawless condition with 100% battery health. Grade 5 titanium frame, Action button, USB-C 3.0, and A17 Pro chip.',
    category: 'Electronics',
    brand: 'Apple',
    condition: 'like-new',
    serialNumber: 'F2LXYZ98Q1',
    images: ['/uploads/seeds/iphone15.jpg'],
    listingType: 'fixed',
    price: 999,
    quantity: 2,
    isVerified: true,
    verificationStatus: 'Verified',
  },
  {
    title: 'Sony WH-1000XM4 Wireless Noise Cancelling Headphones',
    description: 'Industry-leading noise cancellation with dual noise sensor technology. 30 hours battery life with quick charge.',
    category: 'Electronics',
    brand: 'Sony',
    condition: 'good',
    serialNumber: 'SN-WHXM4-4829',
    images: ['/uploads/seeds/sony.jpg'],
    listingType: 'auction',
    startPrice: 150,
    durationHours: 24,
    isVerified: true,
    verificationStatus: 'Verified',
  },
  {
    title: 'Keychron Q1 Pro Wireless Custom Mechanical Keyboard',
    description: 'Full CNC machined aluminum body, hot-swappable Keychron K Pro Banana tactile switches, South-facing RGB.',
    category: 'Electronics',
    brand: 'Keychron',
    condition: 'new',
    serialNumber: 'Q1P-ISO-192',
    images: ['/uploads/seeds/keyboard.jpg'],
    listingType: 'fixed',
    price: 195,
    quantity: 4,
    isVerified: false,
    verificationStatus: 'Pending',
  },
  {
    title: 'Apple MacBook Pro 16-inch M3 Pro (18GB / 512GB Space Black)',
    description: 'Blazing fast Apple silicon workstation laptop with Liquid Retina XDR 120Hz ProMotion display. Cycle count: 14.',
    category: 'Electronics',
    brand: 'Apple',
    condition: 'like-new',
    serialNumber: 'C02H183KP9',
    images: ['/uploads/seeds/macbook.jpg'],
    listingType: 'auction',
    startPrice: 1850,
    durationHours: 72,
    isVerified: true,
    verificationStatus: 'Verified',
  },
  {
    title: 'Bose QuietComfort Ultra Wireless Noise Cancelling Headphones',
    description: 'World-class active noise cancellation with CustomTune audio and spatial audio immersion mode. Includes travel case.',
    category: 'Electronics',
    brand: 'Bose',
    condition: 'new',
    serialNumber: 'QC-ULTRA-991',
    images: ['/uploads/seeds/bose.jpg'],
    listingType: 'fixed',
    price: 379,
    quantity: 3,
    isVerified: true,
    verificationStatus: 'Verified',
  },
  {
    title: 'Apple iPad Pro 12.9-inch M2 Liquid Retina XDR 128GB Space Gray',
    description: 'Stunning mini-LED display with Apple Pencil hover support and Thunderbolt connectivity. Clean glass, no scratches.',
    category: 'Electronics',
    brand: 'Apple',
    condition: 'good',
    serialNumber: 'DLXQP192M2',
    images: ['/uploads/seeds/ipad.jpg'],
    listingType: 'fixed',
    price: 749,
    quantity: 2,
    isVerified: false,
    verificationStatus: 'Pending',
  },
  {
    title: 'Canon EOS R6 Mark II Mirrorless Camera Body',
    description: '24.2MP full-frame CMOS sensor with up to 40 fps electronic shutter, 4K60p 10-bit internal video, and dual SD slots.',
    category: 'Electronics',
    brand: 'Canon',
    condition: 'like-new',
    serialNumber: 'CN-R6M2-8821',
    images: ['/uploads/seeds/canon.jpg'],
    listingType: 'auction',
    startPrice: 1600,
    durationHours: 60,
    isVerified: true,
    verificationStatus: 'Verified',
  },

  // Collectibles & Games
  {
    title: 'Sony PlayStation 5 Console Disc Edition (Slim Model)',
    description: 'Ultra-high speed SSD, ray tracing graphics, haptic feedback DualSense controller. Brand new in sealed factory retail box.',
    category: 'Toys & Games',
    brand: 'Sony PlayStation',
    condition: 'new',
    serialNumber: 'CFI-2000A01',
    images: ['/uploads/seeds/ps5.jpg'],
    listingType: 'fixed',
    price: 499,
    quantity: 4,
    isVerified: true,
    verificationStatus: 'Verified',
  },
  {
    title: '1999 Pokémon Base Set 1st Edition Shadowless Charizard 4/102 Holo Rare',
    description: 'The holy grail of vintage Pokémon TCG. Clean holo foil with sharp borders and vibrant colors. Kept in magnetic case.',
    category: 'Collectibles',
    brand: 'Wizards of the Coast',
    condition: 'good',
    serialNumber: 'PSA-CERT-904128',
    images: ['/uploads/seeds/pokemon.jpg'],
    listingType: 'auction',
    startPrice: 2800,
    durationHours: 48,
    isVerified: true,
    verificationStatus: 'Verified',
  },
  {
    title: 'Nintendo Switch OLED Model Mario Red Edition',
    description: 'Vibrant 7-inch OLED screen, wide adjustable stand, enhanced audio, and distinct Mario silhouette detailing.',
    category: 'Toys & Games',
    brand: 'Nintendo',
    condition: 'new',
    serialNumber: 'XAW1098231',
    images: ['/uploads/seeds/switch.jpg'],
    listingType: 'fixed',
    price: 320,
    quantity: 5,
    isVerified: true,
    verificationStatus: 'Verified',
  },
  {
    title: 'LEGO Star Wars Ultimate Collector Series Millennium Falcon 75192',
    description: 'Massive 7,541 piece collector set. Complete with all minifigures, original manual, and numbered polybags.',
    category: 'Collectibles',
    brand: 'LEGO',
    condition: 'new',
    serialNumber: 'LEGO-75192-UCS',
    images: ['/uploads/seeds/lego.jpg'],
    listingType: 'auction',
    startPrice: 650,
    durationHours: 96,
    isVerified: true,
    verificationStatus: 'Verified',
  },
  {
    title: 'Valve Steam Deck OLED 512GB Handheld Gaming PC',
    description: '90Hz HDR OLED display, improved battery runtime, and premium anti-glare etched glass. Includes original case & charger.',
    category: 'Toys & Games',
    brand: 'Valve',
    condition: 'like-new',
    serialNumber: 'FX-OLED-512',
    images: ['/uploads/seeds/steamdeck.jpg'],
    listingType: 'fixed',
    price: 490,
    quantity: 2,
    isVerified: false,
    verificationStatus: 'Pending',
  },

  // Watches & Luxury
  {
    title: 'Rolex Submariner Date 41mm Oystersteel 126610LN',
    description: 'Iconic diving watch with black Cerachrom bezel and caliber 3235 automatic movement. Full set with box and guarantee card.',
    category: 'Watches & Jewelry',
    brand: 'Rolex',
    condition: 'like-new',
    serialNumber: 'R88V4910',
    images: ['/uploads/seeds/rolex.jpg'],
    listingType: 'auction',
    startPrice: 10500,
    durationHours: 72,
    isVerified: true,
    verificationStatus: 'Verified',
  },
  {
    title: 'Omega Speedmaster Professional Moonwatch Co-Axial Master Chronometer',
    description: 'The legendary Moonwatch with hesalite crystal and manual-wind Calibre 3861. Authenticated with Omega pictogram card.',
    category: 'Watches & Jewelry',
    brand: 'Omega',
    condition: 'like-new',
    serialNumber: '310.30.42.50.01.001',
    images: ['/uploads/seeds/omega.jpg'],
    listingType: 'fixed',
    price: 5800,
    quantity: 1,
    isVerified: true,
    verificationStatus: 'Verified',
  },
  {
    title: 'Cartier Santos de Cartier Large Model Steel WSSA0018',
    description: 'Classic square case with visible bezel screws, quick-switch interchangeable steel bracelet, and silver opaline dial.',
    category: 'Watches & Jewelry',
    brand: 'Cartier',
    condition: 'like-new',
    serialNumber: '4072-81923',
    images: ['/uploads/seeds/cartier.jpg'],
    listingType: 'fixed',
    price: 6400,
    quantity: 1,
    isVerified: true,
    verificationStatus: 'Verified',
  },
];

export const seedDatabase = async (force = false) => {
  try {
    const productCount = await Product.countDocuments();
    if (productCount > 0 && !force) {
      // Check if products have SVG images and need migration to real JPGs
      const sample = await Product.findOne({ 'images.0': /\.svg$/ });
      if (!sample) {
        console.log(`Database already has ${productCount} listings with real images.`);
        return;
      }
      console.log('Migrating existing database listings from SVG placeholders to authentic product photos...');
      await Product.deleteMany({});
    } else if (force) {
      await Product.deleteMany({});
    }

    console.log('Seeding initial marketplace listings with real authentic images...');

    // Ensure a seller user exists
    let seller = await User.findOne({ email: 'seller@verimarket.test' });
    if (!seller) {
      seller = await User.create({
        name: 'VeriMarket Verified Seller',
        email: 'seller@verimarket.test',
        password: 'Password123!',
        role: 'user',
        rating: 4.9,
        ratingCount: 38,
      });
    }

    const now = Date.now();

    for (const item of SEED_PRODUCTS) {
      const isAuction = item.listingType === 'auction';
      const hours = item.durationHours || 48;
      const endListingTime = isAuction ? new Date(now + hours * 60 * 60 * 1000) : undefined;
      const startPrice = isAuction ? item.startPrice : undefined;
      const currentBid = isAuction ? item.startPrice : 0;
      const price = !isAuction ? item.price : undefined;

      await Product.create({
        seller: seller._id,
        title: item.title,
        description: item.description,
        category: item.category,
        brand: item.brand,
        condition: item.condition,
        serialNumber: item.serialNumber,
        images: item.images,
        listingType: item.listingType,
        price,
        quantity: item.quantity || 1,
        startPrice,
        currentBid,
        startListingTime: new Date(now - 3600 * 1000), // started 1 hr ago
        endListingTime,
        displayPrice: isAuction ? currentBid : price,
        isVerified: item.isVerified,
        verificationStatus: item.verificationStatus,
        status: 'active',
        bidCount: isAuction ? 2 : 0,
      });
    }

    console.log(`Successfully seeded ${SEED_PRODUCTS.length} realistic marketplace products!`);
  } catch (err) {
    console.error('Data seeding error:', err.message);
  }
};
