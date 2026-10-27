import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AuctionTimer from '../components/AuctionTimer';
import StarRating from '../components/StarRating';
import VerifiedBadge from '../components/VerifiedBadge';
import { addItem } from '../store/cartSlice';
import { toggleWatch } from '../store/authSlice';
import { applyAuctionEnded, applyLiveUpdate, clearCurrent, fetchBids, fetchProduct } from '../store/productSlice';
import { pushToast } from '../store/uiSlice';
import api, { errMsg } from '../utils/api';
import { getSocket } from '../utils/socket';
import { conditionLabel, dateTime, imageUrl, money, shortDate } from '../utils/format';
import { FALLBACK_IMAGE } from '../utils/constants';

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const FEEDBACK_TONE = {
  good: 'bg-verify-soft text-verify-dark',
  warn: 'bg-auction-soft text-auction',
  bad: 'bg-alert-soft text-alert',
};

/* ------------------------------------------------------------------ Auction bid panel */
function BidPanel({ product, user, expired, live }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [hasBid, setHasBid] = useState(false); // did this viewer bid during this visit?

  const min = product.minNextBid;
  const isLeading = user && product.highestBidder === user._id;

  // Keep the field at or above the live minimum as other people bid
  useEffect(() => {
    setAmount((prev) => (prev === '' || Number(prev) < min ? String(min) : prev));
  }, [min]);

  const finish = (res) => {
    setBusy(false);
    if (!res.ok) return setFeedback({ type: 'bad', text: res.message });
    setHasBid(true);
    const extra = res.extended ? ' The clock was extended by 2 minutes.' : '';
    if (res.isLeading) {
      setFeedback({ type: 'good', text: `You are the highest bidder at ${money(res.currentBid)}. Your maximum of ${money(res.yourMax)} is kept private.${extra}` });
    } else {
      setFeedback({ type: 'warn', text: `Outbid right away: another bidder's maximum is higher. The price is now ${money(res.currentBid)}. Try a higher maximum.${extra}` });
    }
    return undefined;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login', { state: { from: `/product/${product._id}` } });
    setBusy(true);
    setFeedback(null);
    const payload = { productId: product._id, maxAmount: Number(amount) };
    const socket = getSocket();

    if (socket.connected) {
      // Primary path: websocket. The server replies with an ack and broadcasts bid_update to the room.
      socket.timeout(8000).emit('place_bid', payload, (err, res) => {
        if (err) finish({ ok: false, message: 'The server did not respond. Check your connection and try again.' });
        else finish(res);
      });
    } else {
      // Fallback: REST, applying the returned state ourselves because we are not in the room
      try {
        const { data } = await api.post(`/bids/${product._id}`, { maxAmount: payload.maxAmount });
        dispatch(applyLiveUpdate({ ...data.state, newBids: data.newBids }));
        finish(data);
      } catch (err) {
        finish({ ok: false, message: errMsg(err) });
      }
    }
    return undefined;
  };

  const steps = [min, round2(min + product.increment * 2), round2(min + product.increment * 5)];

  return (
    <form onSubmit={submit} className="space-y-3">
      {isLeading && (
        <p className="rounded-md bg-verify-soft px-3 py-2 text-sm font-medium text-verify-dark">You are the highest bidder.</p>
      )}
      {user && hasBid && !isLeading && (
        <p className="rounded-md bg-auction-soft px-3 py-2 text-sm font-medium text-auction">You have been outbid.</p>
      )}

      <div>
        <label htmlFor="bid-amount" className="label">
          Your maximum bid <span className="font-normal text-mute">(minimum {money(min)})</span>
        </label>
        <input
          id="bid-amount"
          type="number"
          inputMode="decimal"
          min={min}
          step="0.01"
          className="input text-lg font-semibold"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={expired || busy}
          required
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <button key={s} type="button" className="btn-outline btn-sm" onClick={() => setAmount(String(s))} disabled={expired}>
            {money(s)}
          </button>
        ))}
      </div>

      <button className="btn-auction w-full py-3 text-base" disabled={busy || expired}>
        {expired ? 'Auction closing...' : busy ? 'Placing bid...' : user ? 'Place bid' : 'Log in to bid'}
      </button>

      <p className="text-xs text-mute">
        Enter the most you would pay. We bid for you in steps of {money(product.increment)} and only as high as needed to stay in front.
        {!live && ' Live updates are reconnecting; your bid will still go through.'}
      </p>

      {feedback && (
        <p role="status" className={`rounded-md px-3 py-2 text-sm ${FEEDBACK_TONE[feedback.type]}`}>{feedback.text}</p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ Page */
export default function ProductDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current: product, currentStatus, currentError, clockOffset, bids } = useSelector((s) => s.products);
  const user = useSelector((s) => s.auth.user);

  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [live, setLive] = useState(false);
  const [expired, setExpired] = useState(false);
  const [feedback, setFeedback] = useState({ seller: null, reviews: [] });

  // Load the listing (and reload if the viewer logs in, so sellers can see private fields)
  useEffect(() => {
    dispatch(fetchProduct(id));
  }, [id, user?._id, dispatch]);

  useEffect(() => {
    dispatch(fetchBids(id));
    setActiveImg(0);
    setQty(1);
    return () => {
      dispatch(clearCurrent());
    };
  }, [id, dispatch]);

  const isAuction = product?.listingType === 'auction';
  const endTime = product?.endListingTime;

  // A late-bid extension re-opens a countdown that had hit zero
  useEffect(() => {
    setExpired(false);
  }, [endTime]);

  // ---- Real-time auction wiring ------------------------------------------------------------
  useEffect(() => {
    if (!isAuction) return undefined;
    const socket = getSocket();

    const join = () =>
      socket.emit('join_auction', id, (res) => {
        if (res?.ok) {
          dispatch(applyLiveUpdate(res.state)); // instant resync after (re)connecting
          setLive(true);
        }
      });
    const onUpdate = (data) => {
      if (data.productId !== id) return;
      dispatch(applyLiveUpdate(data));
      if (data.extended) dispatch(pushToast({ type: 'info', text: 'A late bid added 2 minutes to the clock.' }));
    };
    const onEnded = (data) => {
      if (data.productId === id) dispatch(applyAuctionEnded(data));
    };
    const onDisconnect = () => setLive(false);

    socket.on('connect', join);
    socket.on('disconnect', onDisconnect);
    socket.on('bid_update', onUpdate);
    socket.on('auction_ended', onEnded);
    if (socket.connected) join();

    return () => {
      socket.emit('leave_auction', id);
      socket.off('connect', join);
      socket.off('disconnect', onDisconnect);
      socket.off('bid_update', onUpdate);
      socket.off('auction_ended', onEnded);
      setLive(false);
    };
  }, [isAuction, id, dispatch]);

  // The server closes auctions on a 5 second sweep; re-read the final result shortly after the clock hits zero
  const onExpire = useCallback(() => {
    setExpired(true);
    setTimeout(() => dispatch(fetchProduct(id)), 6000);
  }, [dispatch, id]);

  // Seller feedback
  const sellerId = product?.seller?._id;
  useEffect(() => {
    if (!sellerId) return;
    api
      .get(`/orders/seller/${sellerId}/reviews`)
      .then(({ data }) => setFeedback(data))
      .catch(() => setFeedback({ seller: null, reviews: [] }));
  }, [sellerId]);

  if (currentStatus === 'loading' && !product) {
    return <div className="mx-auto h-96 max-w-5xl animate-pulse rounded-lg bg-line/60" />;
  }
  if (currentError || !product) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="text-3xl font-bold">Listing unavailable</h1>
        <p className="mt-2 text-mute">{currentError || 'This listing could not be found.'}</p>
        <Link to="/" className="btn-primary mt-6">Back to the marketplace</Link>
      </div>
    );
  }

  const isSeller = user && String(product.seller?._id) === String(user._id);
  const isActive = product.status === 'active';
  const watching = user?.watchlist?.includes(product._id);
  const images = product.images?.length ? product.images.map(imageUrl) : [FALLBACK_IMAGE];
  const youWon = user && product.winner && String(product.winner) === String(user._id);

  const addToCart = (goToCart) => {
    dispatch(
      addItem({
        productId: product._id,
        title: product.title,
        image: imageUrl(product.images?.[0]),
        price: product.price,
        maxQty: product.quantity,
        quantity: qty,
      })
    );
    if (goToCart) navigate('/cart');
    else dispatch(pushToast({ type: 'good', text: 'Added to your cart.' }));
  };

  const watch = () => {
    if (!user) return navigate('/login', { state: { from: `/product/${product._id}` } });
    return dispatch(toggleWatch(product._id));
  };

  return (
    <div className="space-y-10">
      <nav className="text-sm text-mute" aria-label="Breadcrumb">
        <Link to="/" className="hover:underline">Marketplace</Link> / <Link to={`/?category=${encodeURIComponent(product.category)}`} className="hover:underline">{product.category}</Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* ------------------------------ Gallery */}
        <section aria-label="Photos">
          <div className="aspect-[4/3] overflow-hidden rounded-lg border border-line bg-white">
            <img
              src={images[activeImg] || FALLBACK_IMAGE}
              alt={product.title}
              className="h-full w-full object-contain"
              onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
            />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === activeImg}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded border-2 ${i === activeImg ? 'border-verify' : 'border-line'}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ------------------------------ Buy box */}
        <section className="space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <VerifiedBadge status={product.verificationStatus} />
              <span className="chip bg-line/70 text-ink">{conditionLabel(product.condition)}</span>
              <span className={`chip ${isAuction ? 'bg-auction-soft text-auction' : 'bg-ink text-white'}`}>{isAuction ? 'Auction' : 'Buy it now'}</span>
            </div>
            <h1 className="text-3xl font-bold leading-tight">{product.title}</h1>
          </div>

          {isAuction ? (
            /* ================= AUCTION LAYOUT ================= */
            <div className="panel space-y-4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-mute">{product.bidCount === 0 ? 'Starting bid' : 'Current bid'}</p>
                  <p className="font-display text-4xl font-bold tabular-nums" aria-live="polite">{money(product.currentBid)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-mute">{isActive ? 'Time left' : 'Status'}</p>
                  {isActive ? (
                    <AuctionTimer endTime={product.endListingTime} offset={clockOffset} onExpire={onExpire} />
                  ) : (
                    <p className="text-xl font-bold">{product.status === 'sold' ? 'Sold' : 'Ended'}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-mute">
                <span>{product.bidCount} {product.bidCount === 1 ? 'bid' : 'bids'}</span>
                {product.highestBidderName && <span>Leading: {product.highestBidderName}</span>}
                <span className={product.hasReserve ? (product.reserveMet ? 'font-medium text-verify' : 'font-medium text-auction') : ''}>
                  {product.hasReserve ? (product.reserveMet ? 'Reserve met' : 'Reserve not met') : 'No reserve'}
                </span>
                {isActive && (
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${live ? 'bg-verify' : 'bg-line'}`} aria-hidden="true" />
                    {live ? 'Live' : 'Connecting'}
                  </span>
                )}
              </div>

              {isActive && !isSeller && <BidPanel product={product} user={user} expired={expired} live={live} />}
              {isActive && isSeller && (
                <p className="rounded-md bg-line/60 px-3 py-2 text-sm">
                  This is your listing. You can watch the bids arrive here.
                  {product.hasReserve && <> Your reserve is {money(product.reservePrice)}.</>}
                </p>
              )}

              {!isActive && (
                <div className="rounded-md bg-line/60 px-3 py-3 text-sm">
                  {product.status === 'sold' ? (
                    youWon ? (
                      <p>You won this auction for <strong>{money(product.finalPrice ?? product.currentBid)}</strong>. <Link to="/dashboard" className="font-semibold text-verify underline">Pay from your dashboard</Link> to complete the purchase.</p>
                    ) : (
                      <p>Sold for <strong>{money(product.finalPrice ?? product.currentBid)}</strong>{product.winnerName ? ` to ${product.winnerName}` : ''}.</p>
                    )
                  ) : (
                    <p>This auction ended without a sale{product.bidCount > 0 && !product.reserveMet ? ' because the reserve was not met' : ''}.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ================= BUY IT NOW LAYOUT ================= */
            <div className="panel space-y-4 p-5">
              <div>
                <p className="text-sm text-mute">Price</p>
                <p className="font-display text-4xl font-bold">{money(product.price)}</p>
              </div>

              {isActive && product.quantity > 0 ? (
                <>
                  <p className="text-sm text-mute">{product.quantity === 1 ? 'Only 1 available' : `${product.quantity} available`}</p>
                  {isSeller ? (
                    <p className="rounded-md bg-line/60 px-3 py-2 text-sm">This is your listing.</p>
                  ) : (
                    <>
                      {product.quantity > 1 && (
                        <div className="flex items-center gap-3">
                          <label htmlFor="qty" className="text-sm font-medium">Quantity</label>
                          <input
                            id="qty"
                            type="number"
                            min="1"
                            max={product.quantity}
                            value={qty}
                            onChange={(e) => setQty(Math.max(1, Math.min(product.quantity, Number(e.target.value) || 1)))}
                            className="input w-24"
                          />
                        </div>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button type="button" className="btn-primary py-3 text-base" onClick={() => addToCart(true)}>Buy it now</button>
                        <button type="button" className="btn-outline py-3 text-base" onClick={() => addToCart(false)}>Add to cart</button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="rounded-md bg-line/60 px-3 py-2 text-sm font-medium">This item is no longer available.</p>
              )}
            </div>
          )}

          {!isSeller && (
            <button type="button" className="btn-outline w-full" onClick={watch} aria-pressed={Boolean(watching)}>
              {watching ? 'Watching. Click to remove' : 'Add to watchlist'}
            </button>
          )}

          {/* Seller */}
          <div className="panel flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm text-mute">Sold by</p>
              <p className="font-semibold">{product.seller?.name}</p>
            </div>
            <div className="text-right">
              {product.seller?.rating?.count > 0 ? (
                <>
                  <StarRating value={product.seller.rating.average} size="h-4 w-4" />
                  <p className="text-xs text-mute">{product.seller.rating.average.toFixed(1)} from {product.seller.rating.count} {product.seller.rating.count === 1 ? 'review' : 'reviews'}</p>
                </>
              ) : (
                <p className="text-sm text-mute">No reviews yet</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ------------------------------ Verification, details, history, feedback */}
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-8">
          <section aria-labelledby="verif-h" className={`rounded-lg border p-5 ${product.verificationStatus === 'Verified' ? 'border-verify/40 bg-verify-soft/50' : 'border-line bg-white'}`}>
            <h2 id="verif-h" className="text-xl font-bold">Authenticity check</h2>
            <div className="mt-2"><VerifiedBadge status={product.verificationStatus} /></div>
            <p className="mt-3 text-sm">
              {product.verificationStatus === 'Verified' &&
                `A VeriMarket reviewer checked the seller's proof${product.verifiedAt ? ` on ${shortDate(product.verifiedAt)}` : ''} and confirmed this item is genuine.`}
              {product.verificationStatus === 'Pending' &&
                'The seller has submitted proof and a reviewer has not looked at it yet. The badge appears once the item is approved.'}
              {product.verificationStatus === 'Rejected' &&
                'This listing did not pass review and is hidden from search. Only you and our reviewers can see this page.'}
            </p>
            {product.verificationNotes && <p className="mt-2 text-sm text-mute">Reviewer note: {product.verificationNotes}</p>}
            {product.verificationDocs?.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {product.verificationDocs.map((d, i) => (
                  <li key={d}><a href={d} target="_blank" rel="noreferrer" className="font-medium text-verify underline">Proof document {i + 1}</a></li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="desc-h">
            <h2 id="desc-h" className="text-xl font-bold">About this item</h2>
            <p className="mt-2 max-w-prose whitespace-pre-line leading-relaxed">{product.description}</p>
            <dl className="mt-4 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              <dt className="text-mute">Condition</dt><dd>{conditionLabel(product.condition)}</dd>
              {product.brand && (<><dt className="text-mute">Brand</dt><dd>{product.brand}</dd></>)}
              <dt className="text-mute">Category</dt><dd>{product.category}</dd>
              {product.serialNumber && (<><dt className="text-mute">Serial / model</dt><dd>{product.serialNumber}</dd></>)}
              <dt className="text-mute">Listed</dt><dd>{shortDate(product.createdAt)}</dd>
            </dl>
          </section>
        </div>

        <div className="space-y-8">
          {isAuction && (
            <section aria-labelledby="hist-h">
              <h2 id="hist-h" className="text-xl font-bold">Bid history</h2>
              {bids.length === 0 ? (
                <p className="mt-2 text-sm text-mute">No bids yet. The first bid sets the opening price.</p>
              ) : (
                <div className="panel mt-3 max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white text-left text-mute">
                      <tr><th className="px-3 py-2 font-medium">Bidder</th><th className="px-3 py-2 font-medium">Bid</th><th className="px-3 py-2 font-medium">When</th></tr>
                    </thead>
                    <tbody>
                      {bids.map((b, i) => (
                        <tr key={`${b.createdAt}-${i}`} className="border-t border-line">
                          <td className="px-3 py-2">{b.bidder}{b.isAutoBid && <span className="ml-1 text-xs text-mute">(auto)</span>}</td>
                          <td className="px-3 py-2 font-semibold tabular-nums">{money(b.amount)}</td>
                          <td className="px-3 py-2 text-mute">{dateTime(b.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <section aria-labelledby="fb-h">
            <h2 id="fb-h" className="text-xl font-bold">Seller feedback</h2>
            {feedback.reviews.length === 0 ? (
              <p className="mt-2 text-sm text-mute">Buyers can leave a review after their order is delivered.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {feedback.reviews.slice(0, 5).map((r) => (
                  <li key={r._id} className="panel p-4">
                    <div className="flex items-center justify-between">
                      <StarRating value={r.rating} size="h-4 w-4" />
                      <span className="text-xs text-mute">{shortDate(r.createdAt)}</span>
                    </div>
                    {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                    <p className="mt-1 text-xs text-mute">{r.reviewer} on "{r.productTitle}"</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
