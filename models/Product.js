import mongoose from 'mongoose';

const { Schema } = mongoose;

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
export const CONDITIONS = ['new', 'like-new', 'good', 'acceptable'];

const productSchema = new Schema(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 140 },
    description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 5000 },
    category: { type: String, enum: CATEGORIES, required: [true, 'Category is required'] },
    brand: { type: String, trim: true, maxlength: 80, default: '' },
    condition: { type: String, enum: CONDITIONS, required: [true, 'Condition is required'] },
    serialNumber: { type: String, trim: true, maxlength: 80, default: '' },
    images: {
      type: [String],
      validate: [(v) => v.length >= 1 && v.length <= 8, 'Add between 1 and 8 image URLs'],
    },

    // ---- Listing format -------------------------------------------------
    listingType: { type: String, enum: ['fixed', 'auction'], required: [true, 'Listing type is required'] },

    // Fixed price ("Buy It Now")
    price: {
      type: Number,
      min: [0.01, 'Price must be greater than 0'],
      required: [function requiredPrice() { return this.listingType === 'fixed'; }, 'Price is required'],
    },
    quantity: { type: Number, default: 1, min: 0 },

    // Auction
    startPrice: {
      type: Number,
      min: [0.01, 'Starting price must be greater than 0'],
      required: [function requiredStart() { return this.listingType === 'auction'; }, 'Starting price is required'],
    },
    reservePrice: { type: Number, min: 0, select: false }, // hidden from the public
    hasReserve: { type: Boolean, default: false },
    reserveMet: { type: Boolean, default: false },
    currentBid: { type: Number, default: 0 },
    highestBidder: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    highestMaxBid: { type: Number, default: 0, select: false }, // proxy bid ceiling, never public
    bidCount: { type: Number, default: 0 },
    startListingTime: { type: Date, default: Date.now },
    endListingTime: {
      type: Date,
      required: [function requiredEnd() { return this.listingType === 'auction'; }, 'End time is required'],
    },

    // Unified field for sorting / filtering by price across both formats
    displayPrice: { type: Number, default: 0, index: true },

    // ---- Trust & verification ------------------------------------------
    verificationStatus: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending', index: true },
    isVerified: { type: Boolean, default: false, index: true },
    verificationNotes: { type: String, default: '', maxlength: 1000 },
    verificationDocs: { type: [String], default: [] }, // receipts, certificates, serial photos
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,

    // ---- Lifecycle -------------------------------------------------------
    status: { type: String, enum: ['active', 'sold', 'ended', 'cancelled'], default: 'active', index: true },
    winner: { type: Schema.Types.ObjectId, ref: 'User' },
    finalPrice: Number,
    views: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        delete ret.id;
        return ret;
      },
    },
  }
);

productSchema.index({ status: 1, listingType: 1, endListingTime: 1 });
productSchema.index({ title: 'text', brand: 'text', description: 'text' });

productSchema.pre('validate', function normalise(next) {
  if (this.isNew || this.isModified('reservePrice')) {
    this.hasReserve = Number(this.reservePrice) > 0;
  }

  if (this.listingType === 'auction' && this.isNew) {
    if (this.hasReserve && this.reservePrice < this.startPrice) {
      this.invalidate('reservePrice', 'Reserve price cannot be lower than the starting price');
    }
    if (this.endListingTime && this.endListingTime <= this.startListingTime) {
      this.invalidate('endListingTime', 'End time must be in the future');
    }
    this.currentBid = this.startPrice;
    this.reserveMet = !this.hasReserve;
    this.quantity = 1;
  }

  if (this.isNew || this.isModified('price') || this.isModified('startPrice') || this.isModified('currentBid')) {
    this.displayPrice = this.listingType === 'fixed' ? this.price : Math.max(this.currentBid || 0, this.startPrice || 0);
  }

  if (this.isNew || this.isModified('verificationStatus')) {
    this.isVerified = this.verificationStatus === 'Verified';
  }
  next();
});

productSchema.virtual('hasEnded').get(function hasEnded() {
  return this.status !== 'active' || (this.listingType === 'auction' && this.endListingTime <= new Date());
});

export default mongoose.model('Product', productSchema);
