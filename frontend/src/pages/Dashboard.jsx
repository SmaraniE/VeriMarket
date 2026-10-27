import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AddressForm, { EMPTY_ADDRESS } from '../components/AddressForm';
import AuctionTimer from '../components/AuctionTimer';
import ListingForm from '../components/ListingForm';
import ProductCard from '../components/ProductCard';
import StarRating from '../components/StarRating';
import VerifiedBadge from '../components/VerifiedBadge';
import { toggleWatch } from '../store/authSlice';
import { loadDashboard } from '../store/dashboardSlice';
import { pushToast } from '../store/uiSlice';
import api, { errMsg } from '../utils/api';
import { getSocket } from '../utils/socket';
import { money, shortDate } from '../utils/format';
import { FALLBACK_IMAGE } from '../utils/constants';

const ORDER_TONE = {
  pending_payment: ['Awaiting payment', 'bg-auction-soft text-auction'],
  paid: ['Paid', 'bg-line text-ink'],
  shipped: ['Shipped', 'bg-line text-ink'],
  delivered: ['Delivered', 'bg-verify-soft text-verify-dark'],
  cancelled: ['Cancelled', 'bg-alert-soft text-alert'],
};
const BID_TONE = {
  winning: ['Winning', 'bg-verify-soft text-verify-dark'],
  outbid: ['Outbid', 'bg-alert-soft text-alert'],
  won: ['Won', 'bg-verify-soft text-verify-dark'],
  lost: ['Lost', 'bg-line text-mute'],
  ended: ['Ended', 'bg-line text-mute'],
};

const Chip = ({ tone }) => <span className={`chip ${tone[1]}`}>{tone[0]}</span>;
const Empty = ({ children }) => <p className="panel px-4 py-6 text-sm text-mute">{children}</p>;
const Section = ({ title, hint, children }) => (
  <section className="space-y-3">
    <div>
      <h2 className="text-xl font-bold">{title}</h2>
      {hint && <p className="text-sm text-mute">{hint}</p>}
    </div>
    {children}
  </section>
);

/* ---------------------------------------------------------------- Order row (buyer + seller) */
function PayForm({ order, onDone }) {
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [method, setMethod] = useState('card');
  return (
    <form
      className="mt-3 space-y-3 rounded-md bg-paper p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onDone(() => api.put(`/orders/${order._id}/pay`, { shippingAddress: address, paymentMethod: method }), 'Payment received.');
      }}
    >
      <AddressForm value={address} onChange={setAddress} idPrefix={`pay-${order._id}`} />
      <div>
        <label className="label" htmlFor={`pm-${order._id}`}>Payment method</label>
        <select id={`pm-${order._id}`} className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="card">Credit / debit card</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="wallet">Wallet</option>
        </select>
      </div>
      <button className="btn-primary">Pay {money(order.total)}</button>
    </form>
  );
}

function ReviewForm({ order, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  return (
    <form
      className="mt-3 space-y-3 rounded-md bg-paper p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) return;
        onDone(() => api.post(`/orders/${order._id}/review`, { rating, comment }), 'Thanks. Your review is live.');
      }}
    >
      <div>
        <p className="label">How was the seller?</p>
        <StarRating value={rating} onChange={setRating} size="h-7 w-7" />
      </div>
      <div>
        <label className="label" htmlFor={`rv-${order._id}`}>Your review (optional)</label>
        <textarea id={`rv-${order._id}`} className="input min-h-20" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Was the item as described? How was shipping?" />
      </div>
      <button className="btn-primary" disabled={!rating}>Submit review</button>
    </form>
  );
}

function ShipForm({ order, onDone }) {
  const [tracking, setTracking] = useState('');
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onDone(() => api.put(`/orders/${order._id}/ship`, { trackingNumber: tracking }), 'Marked as shipped.');
      }}
    >
      <div className="min-w-48 flex-1">
        <label className="label" htmlFor={`tr-${order._id}`}>Tracking number</label>
        <input id={`tr-${order._id}`} className="input" value={tracking} onChange={(e) => setTracking(e.target.value)} required />
      </div>
      <button className="btn-primary">Mark as shipped</button>
    </form>
  );
}

function OrderRow({ order, role, act }) {
  const [open, setOpen] = useState(null); // 'pay' | 'review'
  const who = role === 'buyer' ? `Seller: ${order.seller?.name || ''}` : `Buyer: ${order.buyer?.name || ''}`;
  const a = order.shippingAddress;

  return (
    <li className="p-4">
      <div className="flex gap-4">
        <img src={order.image || FALLBACK_IMAGE} alt="" className="h-16 w-20 rounded object-cover" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/product/${order.product}`} className="font-semibold hover:underline">{order.title}</Link>
            <Chip tone={ORDER_TONE[order.status]} />
            {order.isVerifiedItem && <VerifiedBadge status="Verified" compact />}
          </div>
          <p className="text-sm text-mute">
            {who}. {order.quantity > 1 ? `${order.quantity} x ${money(order.price)}. ` : ''}Ordered {shortDate(order.createdAt)} via {order.source === 'auction' ? 'auction' : 'Buy it now'}.
          </p>
          {order.trackingNumber && <p className="text-sm text-mute">Tracking: {order.trackingNumber}</p>}
          {role === 'seller' && a?.line1 && order.status !== 'pending_payment' && (
            <p className="text-sm text-mute">Ship to {a.fullName}, {a.line1}, {a.city}, {a.state} {a.postalCode}, {a.country}. {a.phone}</p>
          )}
        </div>
        <p className="font-display text-lg font-bold">{money(order.total)}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {role === 'buyer' && order.status === 'pending_payment' && (
          <button type="button" className="btn-auction btn-sm" onClick={() => setOpen(open === 'pay' ? null : 'pay')}>Pay now</button>
        )}
        {role === 'buyer' && order.status === 'shipped' && (
          <button type="button" className="btn-primary btn-sm" onClick={() => act(() => api.put(`/orders/${order._id}/deliver`), 'Delivery confirmed.')}>I received it</button>
        )}
        {role === 'buyer' && order.status === 'delivered' && !order.isReviewed && (
          <button type="button" className="btn-outline btn-sm" onClick={() => setOpen(open === 'review' ? null : 'review')}>Rate this seller</button>
        )}
        {role === 'buyer' && order.isReviewed && <span className="text-sm text-mute">You reviewed this order.</span>}
        {role === 'seller' && order.status === 'pending_payment' && <span className="text-sm text-mute">Waiting for the buyer to pay.</span>}
      </div>

      {open === 'pay' && <PayForm order={order} onDone={act} />}
      {open === 'review' && <ReviewForm order={order} onDone={act} />}
      {role === 'seller' && order.status === 'paid' && <ShipForm order={order} onDone={act} />}
    </li>
  );
}

/* ---------------------------------------------------------------- Buying tab */
function BuyingTab({ d, act, dispatch }) {
  const toPay = d.orders.filter((o) => o.status === 'pending_payment');
  return (
    <div className="space-y-10">
      {toPay.length > 0 && (
        <p className="rounded-md bg-auction-soft px-4 py-3 text-sm font-medium text-auction">
          You have {toPay.length} won {toPay.length === 1 ? 'auction' : 'auctions'} waiting for payment. Open "Pay now" on the order below.
        </p>
      )}

      <Section title="My bids" hint="Your private maximum is shown only to you.">
        {d.bids.length === 0 ? (
          <Empty>You have not bid on anything yet. <Link to="/?listingType=auction" className="font-semibold text-verify underline">Browse live auctions</Link>.</Empty>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-mute">
                <tr>
                  <th className="px-4 py-2 font-medium">Item</th>
                  <th className="px-4 py-2 font-medium">Your max</th>
                  <th className="px-4 py-2 font-medium">Current bid</th>
                  <th className="px-4 py-2 font-medium">Time left</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.bids.map((b) => (
                  <tr key={b.product._id} className="border-t border-line">
                    <td className="px-4 py-3"><Link to={`/product/${b.product._id}`} className="font-medium hover:underline">{b.product.title}</Link></td>
                    <td className="px-4 py-3 tabular-nums">{money(b.myMax)}</td>
                    <td className="px-4 py-3 tabular-nums">{money(b.product.status === 'sold' ? b.product.finalPrice : b.product.currentBid)}</td>
                    <td className="px-4 py-3">{b.product.status === 'active' ? <AuctionTimer endTime={b.product.endListingTime} compact /> : <span className="text-mute">Closed</span>}</td>
                    <td className="px-4 py-3"><Chip tone={BID_TONE[b.state]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Purchases">
        {d.orders.length === 0 ? (
          <Empty>No purchases yet. Orders from checkout and won auctions appear here.</Empty>
        ) : (
          <ul className="panel divide-y divide-line">
            {d.orders.map((o) => <OrderRow key={o._id} order={o} role="buyer" act={act} />)}
          </ul>
        )}
      </Section>

      <Section title="Watchlist">
        {d.watchlist.length === 0 ? (
          <Empty>Tap "Add to watchlist" on any listing to keep an eye on it.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {d.watchlist.map((p) => (
              <div key={p._id} className="space-y-2">
                <ProductCard product={p} />
                <button
                  type="button"
                  className="btn-outline btn-sm w-full"
                  onClick={async () => {
                    await dispatch(toggleWatch(p._id));
                    dispatch(loadDashboard());
                  }}
                >
                  Remove from watchlist
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ---------------------------------------------------------------- Selling tab */
function SellingTab({ d, act, reload }) {
  const [creating, setCreating] = useState(false);
  const toShip = d.sales.filter((o) => o.status === 'paid').length;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mute">
          {d.listings.filter((l) => l.status === 'active').length} active listings. {toShip > 0 ? `${toShip} ${toShip === 1 ? 'order' : 'orders'} to ship.` : 'Nothing waiting to ship.'}
        </p>
        <button type="button" className="btn-primary" onClick={() => setCreating((v) => !v)}>{creating ? 'Close form' : 'Create listing'}</button>
      </div>

      {creating && (
        <ListingForm
          onCreated={() => {
            setCreating(false);
            reload();
          }}
        />
      )}

      <Section title="Orders to fulfil">
        {d.sales.length === 0 ? (
          <Empty>Orders appear here as soon as someone buys or wins one of your items.</Empty>
        ) : (
          <ul className="panel divide-y divide-line">
            {d.sales.map((o) => <OrderRow key={o._id} order={o} role="seller" act={act} />)}
          </ul>
        )}
      </Section>

      <Section title="My listings">
        {d.listings.length === 0 ? (
          <Empty>You have not listed anything yet. Create a listing to start selling.</Empty>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-mute">
                <tr>
                  <th className="px-4 py-2 font-medium">Item</th>
                  <th className="px-4 py-2 font-medium">Format</th>
                  <th className="px-4 py-2 font-medium">Price / bid</th>
                  <th className="px-4 py-2 font-medium">Verification</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {d.listings.map((l) => (
                  <tr key={l._id} className="border-t border-line align-top">
                    <td className="px-4 py-3">
                      <Link to={`/product/${l._id}`} className="font-medium hover:underline">{l.title}</Link>
                    </td>
                    <td className="px-4 py-3">
                      {l.listingType === 'auction' ? (
                        <>
                          Auction
                          {l.status === 'active' && <div><AuctionTimer endTime={l.endListingTime} compact /></div>}
                        </>
                      ) : (
                        `Buy it now, ${l.quantity} left`
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {l.listingType === 'auction' ? `${money(l.currentBid)} (${l.bidCount} bids)` : money(l.price)}
                    </td>
                    <td className="px-4 py-3">
                      <VerifiedBadge status={l.verificationStatus} compact />
                      {l.verificationStatus === 'Rejected' && l.verificationNotes && <p className="mt-1 max-w-48 text-xs text-alert">{l.verificationNotes}</p>}
                    </td>
                    <td className="px-4 py-3 capitalize">{l.status}</td>
                    <td className="px-4 py-3 text-right">
                      {l.status === 'active' && !(l.listingType === 'auction' && l.bidCount > 0) && (
                        <button type="button" className="btn-danger btn-sm" onClick={() => act(() => api.delete(`/products/${l._id}`), 'Listing removed.')}>Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ---------------------------------------------------------------- Admin tab */
function PendingItem({ item, act }) {
  const [notes, setNotes] = useState('');
  const decide = (status) =>
    act(() => api.put(`/products/${item._id}/verification`, { status, notes }), status === 'Verified' ? 'Listing verified.' : 'Listing rejected.');

  return (
    <li className="flex flex-col gap-4 p-4 sm:flex-row">
      <img src={item.images?.[0] || FALLBACK_IMAGE} alt="" className="h-28 w-36 rounded object-cover" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} />
      <div className="flex-1 space-y-2">
        <Link to={`/product/${item._id}`} className="font-semibold hover:underline">{item.title}</Link>
        <p className="text-sm text-mute">
          {item.seller?.name} ({item.seller?.email}). {item.brand && `${item.brand}. `}{item.serialNumber ? `Serial: ${item.serialNumber}.` : 'No serial number given.'}
        </p>
        <p className="text-sm">
          Proof:{' '}
          {item.verificationDocs?.length
            ? item.verificationDocs.map((d, i) => (
                <a key={d} href={d} target="_blank" rel="noreferrer" className="mr-3 font-medium text-verify underline">Document {i + 1}</a>
              ))
            : <span className="text-alert">none supplied</span>}
        </p>
        <label className="sr-only" htmlFor={`vn-${item._id}`}>Reviewer notes</label>
        <textarea id={`vn-${item._id}`} className="input min-h-16" placeholder="Notes for the seller (required when rejecting)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex gap-2">
          <button type="button" className="btn-primary btn-sm" onClick={() => decide('Verified')}>Verify as authentic</button>
          <button type="button" className="btn-danger btn-sm" onClick={() => decide('Rejected')}>Reject</button>
        </div>
      </div>
    </li>
  );
}

function AdminTab({ d, act }) {
  return (
    <Section title="Verification queue" hint="Oldest submissions first.">
      {d.pending.length === 0 ? (
        <Empty>The queue is clear. New listings appear here as sellers publish them.</Empty>
      ) : (
        <ul className="panel divide-y divide-line">
          {d.pending.map((p) => <PendingItem key={p._id} item={p} act={act} />)}
        </ul>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------- Page */
export default function Dashboard() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const d = useSelector((s) => s.dashboard);
  const [tab, setTab] = useState('buying');

  const reload = useCallback(() => dispatch(loadDashboard()), [dispatch]);
  useEffect(() => {
    reload();
  }, [reload]);

  // Keep "My bids" honest while the page is open
  useEffect(() => {
    const socket = getSocket();
    socket.on('outbid', reload);
    socket.on('auction_won', reload);
    return () => {
      socket.off('outbid', reload);
      socket.off('auction_won', reload);
    };
  }, [reload]);

  // Runs an API call, toasts the outcome, refreshes the data
  const act = useCallback(
    async (fn, successText) => {
      try {
        await fn();
        dispatch(pushToast({ type: 'good', text: successText }));
        reload();
      } catch (e) {
        dispatch(pushToast({ type: 'bad', text: errMsg(e) }));
      }
    },
    [dispatch, reload]
  );

  const tabs = [
    ['buying', 'Buying'],
    ['selling', 'Selling'],
    ...(user.role === 'admin' ? [['admin', `Verification queue${d.pending.length ? ` (${d.pending.length})` : ''}`]] : []),
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Hi, {user.name.split(' ')[0]}</h1>
          <p className="text-mute">
            {user.rating?.count > 0 ? (
              <span className="inline-flex items-center gap-2">
                Your seller rating <StarRating value={user.rating.average} size="h-4 w-4" /> {user.rating.average.toFixed(1)} ({user.rating.count})
              </span>
            ) : (
              'Your buying and selling in one place.'
            )}
          </p>
        </div>
      </header>

      <div role="tablist" aria-label="Dashboard sections" className="flex gap-1 border-b border-line">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === key ? 'border-verify text-verify' : 'border-transparent text-mute hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {d.error && <p role="alert" className="rounded-md bg-alert-soft px-3 py-2 text-alert">{d.error}</p>}
      {d.status === 'loading' && d.listings.length === 0 && d.orders.length === 0 ? (
        <div className="h-48 animate-pulse rounded-lg bg-line/60" />
      ) : (
        <div role="tabpanel">
          {tab === 'buying' && <BuyingTab d={d} act={act} dispatch={dispatch} />}
          {tab === 'selling' && <SellingTab d={d} act={act} reload={reload} />}
          {tab === 'admin' && user.role === 'admin' && <AdminTab d={d} act={act} />}
        </div>
      )}
    </div>
  );
}
