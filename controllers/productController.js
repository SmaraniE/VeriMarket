import Product, { CATEGORIES, CONDITIONS } from '../models/Product.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { bidIncrement, minimumNextBid } from '../utils/auctionEngine.js';
import { escapeRegex, isValidId, maskName, toList } from '../utils/helpers.js';

const MIN_AUCTION_MS = 5 * 60 * 1000;
const MAX_AUCTION_MS = 30 * 24 * 60 * 60 * 1000;

const SORTS = {
  newest: { createdAt: -1 },
  ending_soon: { endListingTime: 1 },
  price_asc: { displayPrice: 1 },
  price_desc: { displayPrice: -1 },
  most_bids: { bidCount: -1 },
};

// GET /api/products  - public browse + search
export const getProducts = asyncHandler(async (req, res) => {
  const { q, category, listingType, condition, verified, minPrice, maxPrice, sort = 'newest' } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 48);

  const filter = { status: 'active', verificationStatus: { $ne: 'Rejected' } };
  if (q && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ title: rx }, { brand: rx }, { description: rx }];
  }
  if (CATEGORIES.includes(category)) filter.category = category;
  if (CONDITIONS.includes(condition)) filter.condition = condition;
  if (['fixed', 'auction'].includes(listingType)) filter.listingType = listingType;
  if (verified === 'true') filter.verificationStatus = 'Verified';
  if (minPrice || maxPrice) {
    filter.displayPrice = {};
    if (minPrice) filter.displayPrice.$gte = Number(minPrice);
    if (maxPrice) filter.displayPrice.$lte = Number(maxPrice);
  }
  if (sort === 'ending_soon') {
    filter.listingType = 'auction';
    filter.endListingTime = { $gt: new Date() };
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('seller', 'name rating'),
    Product.countDocuments(filter),
  ]);

  res.json({ products: items, page, pages: Math.max(Math.ceil(total / limit), 1), total });
});

// GET /api/products/:id
export const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) throw new HttpError('Product not found', 404);

  const product = await Product.findById(id)
    .populate('seller', 'name rating createdAt')
    .populate('highestBidder', 'name');
  if (!product) throw new HttpError('Product not found', 404);

  const viewerIsSeller = req.user && String(product.seller._id) === String(req.user._id);
  const viewerIsAdmin = req.user?.role === 'admin';
  const privileged = viewerIsSeller || viewerIsAdmin;
  if (product.verificationStatus === 'Rejected' && !privileged) throw new HttpError('Product not found', 404);

  Product.updateOne({ _id: id }, { $inc: { views: 1 } }).exec();

  const out = product.toJSON();
  out.highestBidderName = product.highestBidder ? maskName(product.highestBidder.name) : null;
  out.highestBidder = product.highestBidder ? String(product.highestBidder._id) : null;
  out.minNextBid = product.listingType === 'auction' ? minimumNextBid(product) : null;
  out.increment = product.listingType === 'auction' ? bidIncrement(product.currentBid) : null;
  out.serverTime = Date.now(); // lets the client correct its clock for the countdown

  if (privileged) {
    const full = await Product.findById(id).select('+reservePrice');
    out.reservePrice = full.reservePrice;
  } else {
    delete out.verificationDocs;
  }
  res.json(out);
});

const readAuctionEnd = (body) => {
  let end;
  if (body.endListingTime) end = new Date(body.endListingTime);
  else if (body.durationHours) end = new Date(Date.now() + Number(body.durationHours) * 3600 * 1000);
  if (!end || Number.isNaN(end.getTime())) throw new HttpError('Choose how long the auction should run');
  const span = end.getTime() - Date.now();
  if (span < MIN_AUCTION_MS - 30000) throw new HttpError('An auction must run for at least 5 minutes');
  if (span > MAX_AUCTION_MS) throw new HttpError('An auction can run for at most 30 days');
  return end;
};

// POST /api/products
export const createProduct = asyncHandler(async (req, res) => {
  const b = req.body;
  const data = {
    seller: req.user._id,
    title: b.title,
    description: b.description,
    category: b.category,
    brand: b.brand,
    condition: b.condition,
    serialNumber: b.serialNumber,
    images: toList(b.images),
    verificationDocs: toList(b.verificationDocs),
    listingType: b.listingType,
  };

  if (b.listingType === 'fixed') {
    data.price = Number(b.price);
    data.quantity = Number(b.quantity || 1);
    if (!Number.isInteger(data.quantity) || data.quantity < 1) throw new HttpError('Quantity must be a whole number of 1 or more');
  } else if (b.listingType === 'auction') {
    data.startPrice = Number(b.startPrice);
    if (b.reservePrice !== undefined && b.reservePrice !== '' && b.reservePrice !== null) {
      data.reservePrice = Number(b.reservePrice);
    }
    data.endListingTime = readAuctionEnd(b);
  } else {
    throw new HttpError('Listing type must be "fixed" or "auction"');
  }

  const product = await Product.create(data); // always starts as verificationStatus: Pending
  res.status(201).json(product);
});

// PUT /api/products/:id
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select('+reservePrice');
  if (!product) throw new HttpError('Product not found', 404);
  const isOwner = String(product.seller) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw new HttpError('You can only edit your own listings', 403);
  if (product.status !== 'active') throw new HttpError('Only active listings can be edited', 409);

  const b = req.body;
  const trustFields = ['title', 'brand', 'condition', 'serialNumber'];
  let trustChanged = false;

  ['title', 'description', 'category', 'brand', 'condition', 'serialNumber'].forEach((f) => {
    if (b[f] !== undefined && b[f] !== product[f]) {
      if (trustFields.includes(f)) trustChanged = true;
      product[f] = b[f];
    }
  });
  if (b.images !== undefined) {
    product.images = toList(b.images);
    trustChanged = true;
  }
  if (b.verificationDocs !== undefined) product.verificationDocs = toList(b.verificationDocs);

  if (product.listingType === 'fixed') {
    if (b.price !== undefined) product.price = Number(b.price);
    if (b.quantity !== undefined) product.quantity = Number(b.quantity);
  } else if (product.bidCount === 0) {
    if (b.startPrice !== undefined) {
      product.startPrice = Number(b.startPrice);
      product.currentBid = product.startPrice;
    }
    if (b.reservePrice !== undefined) product.reservePrice = b.reservePrice === '' ? 0 : Number(b.reservePrice);
    if (b.endListingTime || b.durationHours) product.endListingTime = readAuctionEnd(b);
    product.reserveMet = !(Number(product.reservePrice) > 0);
  } else if (b.startPrice !== undefined || b.reservePrice !== undefined || b.endListingTime || b.durationHours) {
    throw new HttpError('Pricing and timing cannot change once an auction has received bids', 409);
  }

  // Changing what the item is invalidates an earlier authenticity check
  if (trustChanged && product.verificationStatus !== 'Pending' && !(req.user.role === 'admin' && !isOwner)) {
    product.verificationStatus = 'Pending';
    product.verificationNotes = 'Listing details changed after review; re-verification required.';
  }

  await product.save();
  res.json(product);
});

// DELETE /api/products/:id  - soft cancel
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError('Product not found', 404);
  const isOwner = String(product.seller) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw new HttpError('You can only remove your own listings', 403);
  if (product.listingType === 'auction' && product.bidCount > 0 && product.status === 'active') {
    throw new HttpError('An auction with bids cannot be cancelled', 409);
  }
  if (product.status !== 'active') throw new HttpError('This listing is already closed', 409);

  product.status = 'cancelled';
  await product.save();
  res.json({ message: 'Listing removed' });
});

// GET /api/products/mine/listings
export const getMyListings = asyncHandler(async (req, res) => {
  const items = await Product.find({ seller: req.user._id }).sort({ createdAt: -1 });
  res.json(items);
});

// GET /api/products/admin/pending
export const getPendingVerification = asyncHandler(async (req, res) => {
  const items = await Product.find({ verificationStatus: 'Pending', status: 'active' })
    .sort({ createdAt: 1 })
    .populate('seller', 'name email rating');
  res.json(items);
});

// PUT /api/products/:id/verification   (admin)
export const setVerification = asyncHandler(async (req, res) => {
  const { status, notes = '' } = req.body;
  if (!['Verified', 'Rejected', 'Pending'].includes(status)) throw new HttpError('Status must be Verified, Rejected or Pending');
  if (status === 'Rejected' && !notes.trim()) throw new HttpError('Add a short reason so the seller knows what to fix');

  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError('Product not found', 404);

  product.verificationStatus = status;
  product.verificationNotes = notes;
  product.verifiedBy = req.user._id;
  product.verifiedAt = status === 'Pending' ? undefined : new Date();
  await product.save();
  res.json(product);
});
