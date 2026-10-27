import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import AuctionTimer from './AuctionTimer';
import VerifiedBadge from './VerifiedBadge';
import { conditionLabel, money } from '../utils/format';
import { FALLBACK_IMAGE } from '../utils/constants';
import { addItem } from '../store/cartSlice';
import { pushToast } from '../store/uiSlice';

export default function ProductCard({ product, offset = 0 }) {
  const dispatch = useDispatch();
  const isAuction = product.listingType === 'auction';

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(
      addItem({
        productId: product._id,
        title: product.title,
        price: product.price,
        image: product.images?.[0],
        maxQty: product.quantity,
        isVerified: product.isVerified,
      })
    );
    dispatch(pushToast({ type: 'good', text: `Added "${product.title}" to cart!` }));
  };

  return (
    <Link
      to={`/product/${product._id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-line/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-ink/20 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-line/20">
        <img
          src={product.images?.[0] || FALLBACK_IMAGE}
          alt={product.title}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Format Badge */}
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide shadow-sm backdrop-blur-md ${
            isAuction ? 'bg-auction text-white' : 'bg-ink text-white'
          }`}
        >
          {isAuction ? (
            <>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Live Auction
            </>
          ) : (
            'Buy It Now'
          )}
        </span>

        {/* Quick Add to Cart button on card hover for fixed items */}
        {!isAuction && product.quantity > 0 && (
          <button
            type="button"
            onClick={handleQuickAdd}
            title="Add to cart"
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink opacity-0 shadow-md transition-all duration-200 hover:bg-verify hover:text-white group-hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Brand / Condition */}
        <div className="flex items-center justify-between text-xs text-mute">
          <span className="font-medium uppercase tracking-wider">{product.brand || product.category}</span>
          <span>{conditionLabel(product.condition)}</span>
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-ink transition-colors group-hover:text-verify">
          {product.title}
        </h3>

        {/* Verification Status */}
        <div className="pt-0.5">
          <VerifiedBadge status={product.verificationStatus} compact />
        </div>

        {/* Pricing / Timer Section */}
        <div className="mt-auto border-t border-line/40 pt-3">
          {isAuction ? (
            <div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-mute">Current Bid</span>
                  <p className="font-display text-xl font-bold tracking-tight text-ink">
                    {money(product.currentBid || product.startPrice)}
                  </p>
                </div>
                <span className="rounded-full bg-auction/10 px-2 py-0.5 text-xs font-semibold text-auction">
                  {product.bidCount || 0} {(product.bidCount || 0) === 1 ? 'bid' : 'bids'}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-mute">
                <span className="flex items-center gap-1 text-auction font-medium">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <AuctionTimer endTime={product.endListingTime} offset={offset} compact />
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-mute">Price</span>
                <p className="font-display text-xl font-bold tracking-tight text-ink">{money(product.price)}</p>
              </div>
              <span className="text-xs text-mute">
                {product.quantity > 1 ? `${product.quantity} in stock` : 'Only 1 left'}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
