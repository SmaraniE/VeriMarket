import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // The price this bid put on the board
  amount: { type: Number, required: true, min: 0 },
  // The bidder's private proxy ceiling
  maxAmount: { type: Number, required: true, min: 0, select: false },
  // true when the system placed it on the bidder's behalf to defend their maximum
  isAutoBid: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

bidSchema.index({ product: 1, createdAt: -1 });
bidSchema.index({ bidder: 1, createdAt: -1 });

export default mongoose.model('Bid', bidSchema);
