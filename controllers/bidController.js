import mongoose from 'mongoose';
import Bid from '../models/Bid.js';
import Product from '../models/Product.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { broadcastBid, placeProxyBid } from '../utils/auctionEngine.js';
import { isValidId, maskName } from '../utils/helpers.js';

// POST /api/bids/:productId  { maxAmount }   (REST fallback; the UI normally bids over the socket)
export const placeBid = asyncHandler(async (req, res) => {
  const result = await placeProxyBid({
    productId: req.params.productId,
    bidderId: req.user._id,
    maxAmount: Number(req.body.maxAmount),
  });
  broadcastBid(req.app.get('io'), result);
  res.status(201).json({
    ok: true,
    isLeading: result.leaderId === String(req.user._id),
    currentBid: result.state.currentBid,
    yourMax: result.yourMax,
    extended: result.state.extended,
    state: result.state,
    newBids: result.newBids,
  });
});

// GET /api/bids/product/:productId  - public bid history, bidders anonymised
export const getProductBids = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.productId)) throw new HttpError('Auction not found', 404);
  const bids = await Bid.find({ product: req.params.productId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('bidder', 'name');
  res.json(
    bids.map((b) => ({
      amount: b.amount,
      bidder: maskName(b.bidder?.name),
      isAutoBid: b.isAutoBid,
      createdAt: b.createdAt,
    }))
  );
});

// GET /api/bids/mine  - one row per auction the user has bid on
export const getMyBids = asyncHandler(async (req, res) => {
  const rows = await Bid.aggregate([
    { $match: { bidder: new mongoose.Types.ObjectId(req.user._id) } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$product',
        myMax: { $max: '$maxAmount' },
        myLastBid: { $first: '$amount' },
        lastBidAt: { $first: '$createdAt' },
        bids: { $sum: 1 },
      },
    },
    { $sort: { lastBidAt: -1 } },
  ]);

  const products = await Product.find({ _id: { $in: rows.map((r) => r._id) } }).select(
    'title images listingType currentBid bidCount endListingTime status highestBidder winner finalPrice isVerified verificationStatus'
  );
  const byId = Object.fromEntries(products.map((p) => [String(p._id), p]));
  const me = String(req.user._id);

  const out = rows
    .filter((r) => byId[String(r._id)])
    .map((r) => {
      const p = byId[String(r._id)];
      let state;
      if (p.status === 'active') state = String(p.highestBidder) === me ? 'winning' : 'outbid';
      else if (p.status === 'sold') state = String(p.winner) === me ? 'won' : 'lost';
      else state = 'ended';
      return { product: p, myMax: r.myMax, myLastBid: r.myLastBid, lastBidAt: r.lastBidAt, bids: r.bids, state };
    });

  res.json(out);
});
