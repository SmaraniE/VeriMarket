import mongoose from 'mongoose';

const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    // Snapshot so history survives later listing edits
    title: { type: String, required: true },
    image: String,
    isVerifiedItem: { type: Boolean, default: false },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    total: { type: Number, required: true },
    source: { type: String, enum: ['fixed', 'auction'], required: true },
    status: {
      type: String,
      enum: ['pending_payment', 'paid', 'shipped', 'delivered', 'cancelled'],
      default: 'pending_payment',
    },
    shippingAddress: {
      fullName: String,
      line1: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      phone: String,
    },
    payment: { method: String, reference: String, paidAt: Date },
    trackingNumber: String,
    shippedAt: Date,
    deliveredAt: Date,
    isReviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
