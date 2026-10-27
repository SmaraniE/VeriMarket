export const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Watches & Jewelry',
  'Collectibles',
  'Home & Garden',
  'Sports',
  'Toys & Games',
  'Books & Media',
  'Other',
];

export const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like-new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'acceptable', label: 'Acceptable' },
];

// value is hours; the first option is a short run so you can watch an auction close while testing
export const DURATIONS = [
  { value: 0.1, label: '6 minutes (demo)' },
  { value: 24, label: '1 day' },
  { value: 72, label: '3 days' },
  { value: 120, label: '5 days' },
  { value: 168, label: '7 days' },
  { value: 240, label: '10 days' },
];

export const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#E7ECE8"/><text x="50%" y="50%" fill="#5B6A63" font-family="sans-serif" font-size="16" text-anchor="middle">No image</text></svg>'
  );
