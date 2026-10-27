import Product from '../models/Product.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { isValidId, maskName, round2 } from './helpers.js';

export class BidError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// A bid placed inside this window pushes the end time back (anti-sniping)
const SNIPE_WINDOW_MS = 2 * 60 * 1000;

// Standard step sizes, scaled to the current price
export const bidIncrement = (amount) => {
  if (amount < 1) return 0.05;
  if (amount < 5) return 0.25;
  if (amount < 25) return 0.5;
  if (amount < 100) return 1;
  if (amount < 250) return 2.5;
  if (amount < 500) return 5;
  if (amount < 1000) return 10;
  if (amount < 2500) return 25;
  if (amount < 5000) return 50;
  return 100;
};

export const minimumNextBid = (p) =>
  p.bidCount === 0 ? p.startPrice : round2(p.currentBid + bidIncrement(p.currentBid));

// Everything a browser may know about an auction. Never includes reserve or proxy maximums.
export const buildAuctionState = (p, leaderName) => ({
  productId: String(p._id),
  currentBid: p.currentBid,
  bidCount: p.bidCount,
  highestBidder: p.highestBidder ? String(p.highestBidder) : null,
  highestBidderName: leaderName ? maskName(leaderName) : null,
  hasReserve: p.hasReserve,
  reserveMet: p.reserveMet,
  minNextBid: minimumNextBid(p),
  increment: bidIncrement(p.currentBid),
  endListingTime: p.endListingTime,
  status: p.status,
  serverTime: Date.now(),
});

/**
 * Proxy bidding.
 *
 * Each bidder submits the MOST they will pay. The visible price only moves as far as needed
 * to stay ahead of the runner-up's maximum, in standard increments:
 *   - new maximum beats the leader's  -> bidder leads at (old max + increment), capped at new max
 *   - new maximum is below the leader's -> leader keeps the lead at (new max + increment), capped at leader's max
 *   - equal maximums -> the earlier bidder keeps the lead
 *
 * Writes use compare-and-swap on `bidCount`, so two simultaneous bids can never both succeed
 * against the same auction state; the loser re-reads and recalculates (no replica set required).
 */
export const placeProxyBid = async ({ productId, bidderId, maxAmount }) => {
  if (!isValidId(productId)) throw new BidError('Auction not found', 404);
  const max = round2(maxAmount);
  if (!Number.isFinite(max) || max <= 0) throw new BidError('Enter a valid bid amount');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const product = await Product.findById(productId).select('+reservePrice +highestMaxBid');
    if (!product || product.listingType !== 'auction') throw new BidError('Auction not found', 404);

    const now = new Date();
    if (product.status !== 'active' || product.endListingTime <= now) throw new BidError('This auction has ended', 409);
    if (product.verificationStatus === 'Rejected') throw new BidError('This listing failed verification', 409);
    if (String(product.seller) === String(bidderId)) throw new BidError('You cannot bid on your own listing', 403);

    const isLeader = product.highestBidder && String(product.highestBidder) === String(bidderId);
    const minBid = minimumNextBid(product);

    let { currentBid, highestBidder, highestMaxBid, endListingTime } = product;
    let outbidUserId = null;
    const records = []; // bids to persist, in chronological order

    if (isLeader) {
      if (max <= highestMaxBid) {
        throw new BidError(`Your maximum is already ${highestMaxBid.toFixed(2)}. Enter a higher amount to raise it.`);
      }
      highestMaxBid = max;
      records.push({ bidder: bidderId, amount: currentBid, maxAmount: max, isAutoBid: false });
    } else {
      if (max < minBid) throw new BidError(`Your bid must be at least ${minBid.toFixed(2)}`);

      if (product.bidCount === 0 || !highestBidder) {
        currentBid = product.startPrice;
        highestBidder = bidderId;
        highestMaxBid = max;
        records.push({ bidder: bidderId, amount: currentBid, maxAmount: max, isAutoBid: false });
      } else {
        const prevLeader = highestBidder;
        const prevMax = highestMaxBid;

        if (max > prevMax) {
          const price = Math.min(max, round2(prevMax + bidIncrement(prevMax)));
          records.push({ bidder: prevLeader, amount: prevMax, maxAmount: prevMax, isAutoBid: true });
          records.push({ bidder: bidderId, amount: price, maxAmount: max, isAutoBid: false });
          currentBid = price;
          highestBidder = bidderId;
          highestMaxBid = max;
          outbidUserId = prevLeader;
        } else {
          const price = max === prevMax ? prevMax : Math.min(prevMax, round2(max + bidIncrement(max)));
          records.push({ bidder: bidderId, amount: max, maxAmount: max, isAutoBid: false });
          records.push({ bidder: prevLeader, amount: price, maxAmount: prevMax, isAutoBid: true });
          currentBid = price;
          outbidUserId = bidderId;
        }
      }
    }

    // Reserve: once the leader's maximum covers it, the price rises to the reserve and it is "met"
    if (product.hasReserve && highestMaxBid >= product.reservePrice && currentBid < product.reservePrice) {
      currentBid = product.reservePrice;
    }
    const reserveMet = !product.hasReserve || currentBid >= product.reservePrice;

    // Anti-sniping
    let extended = false;
    if (endListingTime.getTime() - now.getTime() < SNIPE_WINDOW_MS) {
      endListingTime = new Date(endListingTime.getTime() + SNIPE_WINDOW_MS);
      extended = true;
    }

    const updated = await Product.findOneAndUpdate(
      { _id: product._id, status: 'active', bidCount: product.bidCount, endListingTime: { $gt: now } },
      {
        $set: {
          currentBid,
          displayPrice: currentBid,
          highestBidder,
          highestMaxBid,
          reserveMet,
          endListingTime,
          bidCount: product.bidCount + records.length,
        },
      },
      { new: true }
    );
    if (!updated) continue; // someone else bid first - re-read and recalculate

    const involved = [...new Set([String(highestBidder), ...records.map((r) => String(r.bidder))])];
    const users = await User.find({ _id: { $in: involved } }).select('name');
    const names = Object.fromEntries(users.map((u) => [String(u._id), u.name]));

    await Bid.insertMany(
      records.map((r, i) => ({
        product: updated._id,
        bidder: r.bidder,
        amount: r.amount,
        maxAmount: r.maxAmount,
        isAutoBid: r.isAutoBid,
        createdAt: new Date(now.getTime() + i),
      }))
    );

    return {
      state: { ...buildAuctionState(updated, names[String(updated.highestBidder)]), extended },
      newBids: records
        .map((r, i) => ({
          amount: r.amount,
          bidder: maskName(names[String(r.bidder)]),
          isAutoBid: r.isAutoBid,
          createdAt: new Date(now.getTime() + i),
        }))
        .reverse(), // newest first, matching the history list
      leaderId: String(updated.highestBidder),
      outbidUserId: outbidUserId ? String(outbidUserId) : null,
      title: updated.title,
      yourMax: max,
    };
  }

  throw new BidError('This auction is very busy right now. Please try again.', 409);
};

// Push a bid result to everyone watching the auction, and notify whoever just lost the lead
export const broadcastBid = (io, result) => {
  io.to(`auction:${result.state.productId}`).emit('bid_update', { ...result.state, newBids: result.newBids });
  if (result.outbidUserId) {
    io.to(`user:${result.outbidUserId}`).emit('outbid', {
      productId: result.state.productId,
      title: result.title,
      currentBid: result.state.currentBid,
    });
  }
};

// Called on an interval: closes finished auctions, creates the winner's order, notifies the room
export const finalizeEndedAuctions = async (io) => {
  const due = await Product.find({
    listingType: 'auction',
    status: 'active',
    endListingTime: { $lte: new Date() },
  });

  for (const p of due) {
    const sold = Boolean(p.highestBidder) && p.reserveMet;
    const update = sold
      ? { status: 'sold', winner: p.highestBidder, finalPrice: p.currentBid, quantity: 0 }
      : { status: 'ended' };

    // bidCount guard: if a last-second bid landed after we read the product, skip and retry next tick
    const done = await Product.findOneAndUpdate(
      { _id: p._id, status: 'active', bidCount: p.bidCount },
      { $set: update },
      { new: true }
    );
    if (!done) continue;

    let winnerName = null;
    if (sold) {
      const winner = await User.findById(p.highestBidder).select('name');
      winnerName = winner ? maskName(winner.name) : null;
      await Order.create({
        buyer: p.highestBidder,
        seller: p.seller,
        product: p._id,
        title: p.title,
        image: p.images[0],
        isVerifiedItem: p.isVerified,
        price: p.currentBid,
        quantity: 1,
        total: p.currentBid,
        source: 'auction',
        status: 'pending_payment',
      });
      io?.to(`user:${p.highestBidder}`).emit('auction_won', {
        productId: String(p._id),
        title: p.title,
        price: p.currentBid,
      });
    }

    io?.to(`auction:${p._id}`).emit('auction_ended', {
      productId: String(p._id),
      status: done.status,
      finalPrice: sold ? p.currentBid : null,
      winnerName,
      reserveMet: p.reserveMet,
    });
  }
  return due.length;
};
