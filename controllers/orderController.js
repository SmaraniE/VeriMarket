import crypto from 'crypto';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { isValidId, maskName, round2 } from '../utils/helpers.js';

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return null;
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

const ADDRESS_FIELDS = ['fullName', 'line1', 'city', 'state', 'postalCode', 'country', 'phone'];

const readAddress = (a = {}) => {
  const missing = ADDRESS_FIELDS.filter((f) => !String(a[f] || '').trim());
  if (missing.length) throw new HttpError(`Missing shipping details: ${missing.join(', ')}`);
  return Object.fromEntries(ADDRESS_FIELDS.map((f) => [f, String(a[f]).trim()]));
};

// Stand-in for a real gateway (Stripe, Razorpay...). Swap this for a PaymentIntent / charge call.
const simulatePayment = async (method) => ({
  method: method || 'card',
  reference: `SIM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
  paidAt: new Date(),
});

// GET /api/orders/razorpay/key  - Exposes public key ID to frontend
export const getRazorpayKey = asyncHandler(async (req, res) => {
  res.json({
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
  });
});

// POST /api/orders/razorpay/create-order  { items, shippingAddress }
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress } = req.body;
  if (!Array.isArray(items) || items.length === 0) throw new HttpError('Your cart is empty');
  const address = readAddress(shippingAddress);

  let totalAmount = 0;
  const validatedItems = [];

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!isValidId(item.productId) || !Number.isInteger(qty) || qty < 1) throw new HttpError('Invalid cart item');

    const product = await Product.findOne({
      _id: item.productId,
      listingType: 'fixed',
      status: 'active',
      quantity: { $gte: qty },
      verificationStatus: { $ne: 'Rejected' },
    });

    if (!product) {
      const existing = await Product.findById(item.productId).select('title seller');
      if (existing && String(existing.seller) === String(req.user._id)) throw new HttpError('You cannot buy your own listing', 403);
      throw new HttpError(`"${existing?.title || 'An item'}" is no longer available in that quantity`, 409);
    }

    if (String(product.seller) === String(req.user._id)) {
      throw new HttpError('You cannot buy your own listing', 403);
    }

    totalAmount += product.price * qty;
    validatedItems.push({ product, quantity: qty });
  }

  const razorpay = getRazorpayInstance();
  const amountInPaise = Math.round(round2(totalAmount) * 100);
  const receipt = `rcpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  let rzpOrderId = `order_${Date.now()}`;
  let currency = 'INR';

  if (razorpay) {
    try {
      const rzpOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          buyerId: String(req.user._id),
          buyerEmail: req.user.email,
        },
      });
      rzpOrderId = rzpOrder.id;
      currency = rzpOrder.currency;
    } catch (err) {
      console.error('Razorpay order creation failed, falling back to mock order id:', err.message);
    }
  }

  res.json({
    orderId: rzpOrderId,
    amount: amountInPaise,
    currency,
    displayAmount: round2(totalAmount),
    shippingAddress: address,
  });
});

// POST /api/orders/razorpay/verify  { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, shippingAddress }
export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, shippingAddress } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id) {
    throw new HttpError('Missing Razorpay payment credentials', 400);
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (keySecret && razorpay_signature) {
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new HttpError('Invalid Razorpay signature verification failed', 400);
    }
  }

  const address = readAddress(shippingAddress);
  const reserved = [];
  const createdOrders = [];

  try {
    for (const item of items) {
      const qty = Number(item.quantity);
      if (!isValidId(item.productId) || !Number.isInteger(qty) || qty < 1) throw new HttpError('Invalid cart item');

      const product = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          listingType: 'fixed',
          status: 'active',
          quantity: { $gte: qty },
          seller: { $ne: req.user._id },
          verificationStatus: { $ne: 'Rejected' },
        },
        { $inc: { quantity: -qty } },
        { new: true }
      );

      if (!product) {
        throw new HttpError('An item in your cart is no longer available in the requested quantity', 409);
      }

      reserved.push({ id: product._id, qty });
      if (product.quantity === 0) {
        await Product.updateOne({ _id: product._id }, { $set: { status: 'sold' } });
      }

      createdOrders.push({
        buyer: req.user._id,
        seller: product.seller,
        product: product._id,
        title: product.title,
        image: product.images[0],
        isVerifiedItem: product.isVerified,
        price: product.price,
        quantity: qty,
        total: round2(product.price * qty),
        source: 'fixed',
        status: 'paid',
        shippingAddress: address,
        payment: {
          method: 'razorpay',
          reference: `${razorpay_payment_id} (${razorpay_order_id})`,
          paidAt: new Date(),
        },
      });
    }

    const savedOrders = await Order.insertMany(createdOrders);
    res.status(201).json(savedOrders);
  } catch (err) {
    await Promise.all(
      reserved.map((r) => Product.updateOne({ _id: r.id }, { $inc: { quantity: r.qty }, $set: { status: 'active' } }))
    );
    throw err;
  }
});

// POST /api/orders/checkout  { items:[{productId, quantity}], shippingAddress, paymentMethod }
export const checkout = asyncHandler(async (req, res) => {
  const { items, shippingAddress, paymentMethod } = req.body;
  if (!Array.isArray(items) || items.length === 0) throw new HttpError('Your cart is empty');
  const address = readAddress(shippingAddress);

  const reserved = []; // stock we have already taken, so we can roll back on failure
  const orders = [];

  try {
    for (const item of items) {
      const qty = Number(item.quantity);
      if (!isValidId(item.productId) || !Number.isInteger(qty) || qty < 1) throw new HttpError('Invalid cart item');

      // Atomic: only decrements if enough stock remains and the listing is still buyable
      const product = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          listingType: 'fixed',
          status: 'active',
          quantity: { $gte: qty },
          seller: { $ne: req.user._id },
          verificationStatus: { $ne: 'Rejected' },
        },
        { $inc: { quantity: -qty } },
        { new: true }
      );
      if (!product) {
        const existing = await Product.findById(item.productId).select('title seller');
        if (existing && String(existing.seller) === String(req.user._id)) throw new HttpError('You cannot buy your own listing', 403);
        throw new HttpError(`"${existing?.title || 'An item'}" is no longer available in that quantity`, 409);
      }
      reserved.push({ id: product._id, qty });
      if (product.quantity === 0) await Product.updateOne({ _id: product._id }, { $set: { status: 'sold' } });

      orders.push({
        buyer: req.user._id,
        seller: product.seller,
        product: product._id,
        title: product.title,
        image: product.images[0],
        isVerifiedItem: product.isVerified,
        price: product.price,
        quantity: qty,
        total: round2(product.price * qty),
        source: 'fixed',
        status: 'paid',
        shippingAddress: address,
        payment: await simulatePayment(paymentMethod),
      });
    }
    const created = await Order.insertMany(orders);
    res.status(201).json(created);
  } catch (err) {
    await Promise.all(
      reserved.map((r) => Product.updateOne({ _id: r.id }, { $inc: { quantity: r.qty }, $set: { status: 'active' } }))
    );
    throw err;
  }
});

// GET /api/orders/mine
export const getMyOrders = asyncHandler(async (req, res) => {
  res.json(await Order.find({ buyer: req.user._id }).sort({ createdAt: -1 }).populate('seller', 'name rating'));
});

// GET /api/orders/selling
export const getSellerOrders = asyncHandler(async (req, res) => {
  res.json(await Order.find({ seller: req.user._id }).sort({ createdAt: -1 }).populate('buyer', 'name'));
});

const loadOrder = async (id) => {
  if (!isValidId(id)) throw new HttpError('Order not found', 404);
  const order = await Order.findById(id);
  if (!order) throw new HttpError('Order not found', 404);
  return order;
};

// PUT /api/orders/:id/pay  { shippingAddress, paymentMethod }  - used for auction wins
export const payOrder = asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  if (String(order.buyer) !== String(req.user._id)) throw new HttpError('Not your order', 403);
  if (order.status !== 'pending_payment') throw new HttpError('This order has already been paid', 409);

  order.shippingAddress = readAddress(req.body.shippingAddress);
  order.payment = await simulatePayment(req.body.paymentMethod);
  order.status = 'paid';
  await order.save();
  res.json(order);
});

// PUT /api/orders/:id/ship  { trackingNumber }
export const shipOrder = asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  if (String(order.seller) !== String(req.user._id)) throw new HttpError('Not your order', 403);
  if (order.status !== 'paid') throw new HttpError('Only paid orders can be shipped', 409);

  order.status = 'shipped';
  order.trackingNumber = String(req.body.trackingNumber || '').trim();
  order.shippedAt = new Date();
  await order.save();
  res.json(order);
});

// PUT /api/orders/:id/deliver  - buyer confirms receipt, which unlocks the review
export const confirmDelivery = asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  if (String(order.buyer) !== String(req.user._id)) throw new HttpError('Not your order', 403);
  if (order.status !== 'shipped') throw new HttpError('This order has not shipped yet', 409);

  order.status = 'delivered';
  order.deliveredAt = new Date();
  await order.save();
  res.json(order);
});

// POST /api/orders/:id/review  { rating, comment }
export const createReview = asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.id);
  if (String(order.buyer) !== String(req.user._id)) throw new HttpError('Only the buyer can review this order', 403);
  if (order.status !== 'delivered') throw new HttpError('You can review once the order is delivered', 409);
  if (order.isReviewed) throw new HttpError('You have already reviewed this order', 409);

  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError('Rating must be 1 to 5 stars');

  const review = await Review.create({
    order: order._id,
    product: order.product,
    reviewer: req.user._id,
    seller: order.seller,
    rating,
    comment: req.body.comment,
  });

  const [agg] = await Review.aggregate([
    { $match: { seller: order.seller } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await User.updateOne(
    { _id: order.seller },
    { $set: { rating: { average: round2(agg.average), count: agg.count } } }
  );
  order.isReviewed = true;
  await order.save();

  res.status(201).json(review);
});

// GET /api/orders/seller/:sellerId/reviews  - public
export const getSellerReviews = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.sellerId)) throw new HttpError('Seller not found', 404);
  const seller = await User.findById(req.params.sellerId).select('name rating createdAt');
  if (!seller) throw new HttpError('Seller not found', 404);

  const reviews = await Review.find({ seller: seller._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('reviewer', 'name')
    .populate('product', 'title');
  res.json({
    seller,
    reviews: reviews.map((r) => ({
      _id: r._id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      reviewer: maskName(r.reviewer?.name),
      productTitle: r.product?.title,
    })),
  });
});
