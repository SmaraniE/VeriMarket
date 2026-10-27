import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, changePassword } from '../store/authSlice';
import { loadDashboard } from '../store/dashboardSlice';
import { pushToast } from '../store/uiSlice';
import AuctionTimer from '../components/AuctionTimer';
import StarRating from '../components/StarRating';
import VerifiedBadge from '../components/VerifiedBadge';
import api, { errMsg } from '../utils/api';
import { money, shortDate } from '../utils/format';
import { FALLBACK_IMAGE } from '../utils/constants';

/* ─── helpers ───────────────────────────────────────────────── */
const Chip = ({ label, cls }) => (
  <span className={`chip ${cls}`}>{label}</span>
);

const ORDER_TONE = {
  pending_payment: ['Awaiting payment', 'bg-auction-soft text-auction'],
  paid:            ['Paid',             'bg-line text-ink'],
  shipped:         ['Shipped',          'bg-line text-ink'],
  delivered:       ['Delivered',        'bg-verify-soft text-verify-dark'],
  cancelled:       ['Cancelled',        'bg-alert-soft text-alert'],
};

const BID_TONE = {
  winning: ['Winning', 'bg-verify-soft text-verify-dark'],
  outbid:  ['Outbid',  'bg-alert-soft text-alert'],
  won:     ['Won',     'bg-verify-soft text-verify-dark'],
  lost:    ['Lost',    'bg-line text-mute'],
  ended:   ['Ended',   'bg-line text-mute'],
};

const TABS = [
  { id: 'account',   label: '👤 Account',    icon: '👤' },
  { id: 'purchases', label: '🛍️ Purchases',  icon: '🛍️' },
  { id: 'bids',      label: '🔨 Bid History', icon: '🔨' },
  { id: 'listings',  label: '📦 Listings',   icon: '📦' },
  { id: 'reviews',   label: '⭐ Reviews',    icon: '⭐' },
];

/* ─── avatar initials fallback ─────────────────────────────── */
function Avatar({ user, size = 'h-24 w-24', textSize = 'text-3xl' }) {
  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className={`${size} rounded-full object-cover ring-4 ring-white shadow-lg`}
        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
      />
    );
  }

  return (
    <div
      className={`${size} ${textSize} rounded-full bg-gradient-to-br from-verify to-verify-dark flex items-center justify-center font-bold text-white ring-4 ring-white shadow-lg`}
    >
      {initials}
    </div>
  );
}

/* ─── Account tab ───────────────────────────────────────────── */
function AccountTab({ user, dispatch }) {
  const status = useSelector((s) => s.auth.status);
  const [form, setForm] = useState({
    name:     user.name     || '',
    email:    user.email    || '',
    avatar:   user.avatar   || '',
    bio:      user.bio      || '',
    phone:    user.phone    || '',
    location: user.location || '',
  });
  const [pw, setPw]         = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar || '');
  const fileRef = useRef();

  // sync when user object updates in redux
  useEffect(() => {
    setForm({
      name:     user.name     || '',
      email:    user.email    || '',
      avatar:   user.avatar   || '',
      bio:      user.bio      || '',
      phone:    user.phone    || '',
      location: user.location || '',
    });
    setAvatarPreview(user.avatar || '');
  }, [user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /* Simulate file → data-URL upload (no cloud storage needed for demo) */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      dispatch(pushToast({ type: 'bad', text: 'Image must be under 2 MB' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      setAvatarPreview(url);
      setForm((f) => ({ ...f, avatar: url }));
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const res = await dispatch(updateProfile(form));
    if (updateProfile.fulfilled.match(res)) {
      dispatch(pushToast({ type: 'good', text: 'Profile updated successfully!' }));
    } else {
      dispatch(pushToast({ type: 'bad', text: res.payload || 'Update failed' }));
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) {
      dispatch(pushToast({ type: 'bad', text: 'New passwords do not match' }));
      return;
    }
    if (pw.next.length < 6) {
      dispatch(pushToast({ type: 'bad', text: 'Password must be at least 6 characters' }));
      return;
    }
    setPwSaving(true);
    try {
      const res = await dispatch(changePassword({ currentPassword: pw.current, newPassword: pw.next }));
      if (changePassword.fulfilled.match(res)) {
        dispatch(pushToast({ type: 'good', text: 'Password changed successfully!' }));
        setPw({ current: '', next: '', confirm: '' });
      } else {
        dispatch(pushToast({ type: 'bad', text: res.payload || 'Password change failed' }));
      }
    } finally {
      setPwSaving(false);
    }
  };

  const busy = status === 'loading';

  return (
    <div className="space-y-8">

      {/* ── Avatar card ── */}
      <div className="profile-card">
        <h2 className="profile-section-title">Profile Photo</h2>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="h-24 w-24 rounded-full object-cover ring-4 ring-verify/20 shadow-lg"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-verify to-verify-dark flex items-center justify-center text-3xl font-bold text-white ring-4 ring-white shadow-lg">
                {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-verify text-white flex items-center justify-center shadow hover:bg-verify-dark transition-colors"
              title="Change photo"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
              </svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">{user.name}</p>
            <p className="text-xs text-mute mt-0.5">{user.email}</p>
            <p className="text-xs text-mute mt-1">Member since {shortDate(user.createdAt)}</p>
            {user.rating?.count > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <StarRating value={user.rating.average} size="h-4 w-4" />
                <span className="text-xs text-mute">{user.rating.average.toFixed(1)} ({user.rating.count} reviews)</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-48">
            <label className="label" htmlFor="avatar-url">Avatar URL</label>
            <input
              id="avatar-url"
              className="input"
              placeholder="https://example.com/photo.jpg"
              value={form.avatar}
              onChange={(e) => { set('avatar')(e); setAvatarPreview(e.target.value); }}
            />
            <p className="mt-1 text-xs text-mute">Paste a URL or upload a file using the camera button.</p>
          </div>
        </div>
      </div>

      {/* ── Personal details ── */}
      <form onSubmit={saveProfile} className="profile-card space-y-5">
        <h2 className="profile-section-title">Personal Details</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="p-name">Full name</label>
            <input id="p-name" className="input" value={form.name} onChange={set('name')} required maxLength={60} />
          </div>
          <div>
            <label className="label" htmlFor="p-email">Email address</label>
            <input id="p-email" type="email" className="input" value={form.email} onChange={set('email')} required />
          </div>
          <div>
            <label className="label" htmlFor="p-phone">Phone number</label>
            <input id="p-phone" type="tel" className="input" placeholder="+1 555 123 4567" value={form.phone} onChange={set('phone')} maxLength={30} />
          </div>
          <div>
            <label className="label" htmlFor="p-location">Location</label>
            <input id="p-location" className="input" placeholder="City, Country" value={form.location} onChange={set('location')} maxLength={100} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="p-bio">Bio <span className="font-normal text-mute">({form.bio.length}/500)</span></label>
          <textarea
            id="p-bio"
            className="input min-h-24"
            placeholder="Tell buyers a bit about yourself — what you sell, your expertise, your shipping speed..."
            value={form.bio}
            onChange={set('bio')}
            maxLength={500}
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {/* ── Change password ── */}
      <form onSubmit={savePassword} className="profile-card space-y-5">
        <h2 className="profile-section-title">Change Password</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="pw-current">Current password</label>
            <input id="pw-current" type="password" className="input" autoComplete="current-password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} required />
          </div>
          <div>
            <label className="label" htmlFor="pw-new">New password</label>
            <input id="pw-new" type="password" className="input" autoComplete="new-password" placeholder="At least 6 characters" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} required minLength={6} />
          </div>
          <div>
            <label className="label" htmlFor="pw-confirm">Confirm password</label>
            <input id="pw-confirm" type="password" className="input" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} required />
          </div>
        </div>
        <button type="submit" className="btn-outline" disabled={pwSaving}>
          {pwSaving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}

/* ─── Purchases tab ─────────────────────────────────────────── */
function PurchasesTab({ orders }) {
  if (orders.length === 0) {
    return (
      <div className="profile-empty">
        <span className="text-4xl">🛍️</span>
        <p className="mt-3 text-lg font-semibold text-ink">No purchases yet</p>
        <p className="mt-1 text-sm text-mute">Items you buy will appear here.</p>
        <Link to="/" className="btn-primary mt-4">Start shopping</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-mute">{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
      <ul className="panel divide-y divide-line">
        {orders.map((o) => {
          const [label, cls] = ORDER_TONE[o.status] || ['Unknown', 'bg-line text-mute'];
          return (
            <li key={o._id} className="flex gap-4 p-4 hover:bg-paper/60 transition-colors">
              <img
                src={o.image || FALLBACK_IMAGE}
                alt=""
                className="h-16 w-20 flex-none rounded-lg object-cover"
                onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-2">
                  <Link to={`/product/${o.product}`} className="font-semibold hover:underline text-ink line-clamp-1">{o.title}</Link>
                  <Chip label={label} cls={cls} />
                </div>
                <p className="mt-1 text-xs text-mute">Seller: {o.seller?.name || '—'} · Ordered {shortDate(o.createdAt)}</p>
                {o.trackingNumber && (
                  <p className="mt-0.5 text-xs text-mute">Tracking: <span className="font-medium text-ink">{o.trackingNumber}</span></p>
                )}
                {o.source === 'auction' && <span className="mt-1 inline-block text-xs text-auction font-medium">Won at auction</span>}
              </div>
              <p className="flex-none font-display text-lg font-bold text-ink">{money(o.total)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── Bids tab ──────────────────────────────────────────────── */
function BidsTab({ bids }) {
  if (bids.length === 0) {
    return (
      <div className="profile-empty">
        <span className="text-4xl">🔨</span>
        <p className="mt-3 text-lg font-semibold text-ink">No bids yet</p>
        <p className="mt-1 text-sm text-mute">Browse live auctions and place a bid to get started.</p>
        <Link to="/?listingType=auction" className="btn-primary mt-4">Browse auctions</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-mute">{bids.length} auction{bids.length !== 1 ? 's' : ''} bid on</p>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-mute">Item</th>
              <th className="px-4 py-3 font-semibold text-mute">Your max</th>
              <th className="px-4 py-3 font-semibold text-mute">Current bid</th>
              <th className="px-4 py-3 font-semibold text-mute">Time left</th>
              <th className="px-4 py-3 font-semibold text-mute">Status</th>
            </tr>
          </thead>
          <tbody>
            {bids.map((b) => {
              const [label, cls] = BID_TONE[b.state] || ['Unknown', 'bg-line text-mute'];
              return (
                <tr key={b.product._id} className="border-t border-line hover:bg-paper/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/product/${b.product._id}`} className="font-medium hover:underline text-ink">{b.product.title}</Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium">{money(b.myMax)}</td>
                  <td className="px-4 py-3 tabular-nums">{money(b.product.status === 'sold' ? b.product.finalPrice : b.product.currentBid)}</td>
                  <td className="px-4 py-3">
                    {b.product.status === 'active'
                      ? <AuctionTimer endTime={b.product.endListingTime} compact />
                      : <span className="text-mute">Closed</span>}
                  </td>
                  <td className="px-4 py-3"><Chip label={label} cls={cls} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Listings tab ──────────────────────────────────────────── */
function ListingsTab({ listings }) {
  const activeCount   = listings.filter((l) => l.status === 'active').length;
  const soldCount     = listings.filter((l) => l.status === 'sold').length;
  const auctionCount  = listings.filter((l) => l.listingType === 'auction').length;

  if (listings.length === 0) {
    return (
      <div className="profile-empty">
        <span className="text-4xl">📦</span>
        <p className="mt-3 text-lg font-semibold text-ink">No listings yet</p>
        <p className="mt-1 text-sm text-mute">Head to your dashboard to create a listing and start selling.</p>
        <Link to="/dashboard" className="btn-primary mt-4">Go to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        {[
          { label: 'Active',   value: activeCount,  bg: 'bg-verify-soft text-verify-dark' },
          { label: 'Sold',     value: soldCount,     bg: 'bg-line text-ink' },
          { label: 'Auctions', value: auctionCount,  bg: 'bg-auction-soft text-auction' },
        ].map(({ label, value, bg }) => (
          <div key={label} className={`rounded-xl px-4 py-3 text-center ${bg}`}>
            <p className="text-2xl font-bold font-display">{value}</p>
            <p className="text-xs font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-mute">Item</th>
              <th className="px-4 py-3 font-semibold text-mute">Format</th>
              <th className="px-4 py-3 font-semibold text-mute">Price / bid</th>
              <th className="px-4 py-3 font-semibold text-mute">Verification</th>
              <th className="px-4 py-3 font-semibold text-mute">Status</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l._id} className="border-t border-line hover:bg-paper/50 transition-colors align-top">
                <td className="px-4 py-3">
                  <Link to={`/product/${l._id}`} className="font-medium hover:underline text-ink line-clamp-2">{l.title}</Link>
                </td>
                <td className="px-4 py-3">
                  {l.listingType === 'auction'
                    ? <><span className="text-auction font-medium">Auction</span>{l.status === 'active' && <div className="mt-0.5"><AuctionTimer endTime={l.endListingTime} compact /></div>}</>
                    : 'Buy it now'}
                </td>
                <td className="px-4 py-3 tabular-nums font-medium">
                  {l.listingType === 'auction' ? `${money(l.currentBid)} (${l.bidCount} bids)` : money(l.price)}
                </td>
                <td className="px-4 py-3"><VerifiedBadge status={l.verificationStatus} compact /></td>
                <td className="px-4 py-3 capitalize">{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Reviews tab ───────────────────────────────────────────── */
function ReviewsTab({ user }) {
  const [reviews, setReviews] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) return;
    api.get(`/orders/seller/${user._id}/reviews`)
      .then(({ data }) => setReviews(data))
      .catch(() => setReviews({ reviews: [] }))
      .finally(() => setLoading(false));
  }, [user?._id]);

  if (loading) {
    return <div className="h-40 animate-pulse rounded-lg bg-line/40" />;
  }

  const { seller, reviews: list = [] } = reviews || {};

  if (list.length === 0) {
    return (
      <div className="profile-empty">
        <span className="text-4xl">⭐</span>
        <p className="mt-3 text-lg font-semibold text-ink">No reviews yet</p>
        <p className="mt-1 text-sm text-mute">Sell items and deliver great service to earn your first review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {seller && (
        <div className="profile-card flex items-center gap-6 flex-wrap">
          <div className="text-center">
            <p className="text-4xl font-bold font-display text-ink">{seller.rating?.average?.toFixed(1) || '—'}</p>
            <StarRating value={seller.rating?.average || 0} size="h-5 w-5" className="mt-1" />
            <p className="mt-1 text-xs text-mute">{seller.rating?.count || 0} reviews</p>
          </div>
          <div className="flex-1 min-w-40 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = list.filter((r) => r.rating === star).length;
              const pct   = list.length ? Math.round((count / list.length) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-right text-mute">{star}</span>
                  <svg viewBox="0 0 12 12" className="h-3 w-3 fill-auction"><path d="M6 1l1.5 3H11l-2.8 2 1.1 3.4L6 7.6 2.7 9.4 3.8 6 1 4h3.5z"/></svg>
                  <div className="flex-1 h-2 rounded-full bg-line overflow-hidden">
                    <div className="h-full rounded-full bg-auction" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-mute">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ul className="space-y-3">
        {list.map((r) => (
          <li key={r._id} className="profile-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{r.reviewer}</p>
                <StarRating value={r.rating} size="h-4 w-4" className="mt-0.5" />
              </div>
              <p className="text-xs text-mute flex-none">{shortDate(r.createdAt)}</p>
            </div>
            {r.comment && <p className="mt-2 text-sm text-ink/80 leading-relaxed">{r.comment}</p>}
            {r.productTitle && (
              <p className="mt-1.5 text-xs text-mute">For: <span className="text-ink font-medium">{r.productTitle}</span></p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function Profile() {
  const dispatch   = useDispatch();
  const user       = useSelector((s) => s.auth.user);
  const d          = useSelector((s) => s.dashboard);
  const [tab, setTab] = useState('account');

  const reload = useCallback(() => dispatch(loadDashboard()), [dispatch]);
  useEffect(() => { reload(); }, [reload]);

  if (!user) return null;

  return (
    <>
      <style>{`
        .profile-card {
          background: white;
          border: 1px solid #D9E0DA;
          border-radius: 12px;
          padding: 1.5rem;
        }
        .profile-section-title {
          font-size: 1rem;
          font-weight: 700;
          color: #14201C;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #D9E0DA;
        }
        .profile-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 1rem;
          text-align: center;
          background: white;
          border: 1px solid #D9E0DA;
          border-radius: 12px;
        }
        .profile-tab-btn {
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          border-bottom: 2px solid transparent;
          transition: color 0.15s, border-color 0.15s;
          white-space: nowrap;
          color: #5B6A63;
        }
        .profile-tab-btn:hover { color: #14201C; }
        .profile-tab-btn.active { border-bottom-color: #0A6B4B; color: #0A6B4B; }
      `}</style>

      <div className="min-h-screen bg-paper">

        {/* ── Hero banner ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-verify-dark via-verify to-[#1a9e72]">
          <div className="absolute inset-0 opacity-10"
               style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
          />
          <div className="relative mx-auto max-w-7xl px-4 py-10">
            <div className="flex items-end gap-6 flex-wrap">
              <div className="relative">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-20 w-20 rounded-full object-cover ring-4 ring-white/30 shadow-2xl"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm ring-4 ring-white/30 shadow-2xl flex items-center justify-center text-2xl font-bold text-white">
                    {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
                <p className="text-white/70 text-sm mt-0.5">{user.email}</p>
                {user.location && <p className="text-white/60 text-xs mt-0.5">📍 {user.location}</p>}
                <div className="mt-2 flex items-center gap-4 flex-wrap">
                  {user.rating?.count > 0 && (
                    <span className="flex items-center gap-1.5 text-sm text-white/90">
                      <StarRating value={user.rating.average} size="h-4 w-4" />
                      {user.rating.average.toFixed(1)} ({user.rating.count})
                    </span>
                  )}
                  <span className="text-xs text-white/60">Member since {shortDate(user.createdAt)}</span>
                  {user.role === 'admin' && (
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">Admin</span>
                  )}
                </div>
                {user.bio && <p className="mt-2 max-w-lg text-sm text-white/75 leading-relaxed">{user.bio}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="sticky top-16 z-30 border-b border-line bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex overflow-x-auto" role="tablist" aria-label="Profile sections">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  type="button"
                  className={`profile-tab-btn${tab === id ? ' active' : ''}`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="mx-auto max-w-7xl px-4 py-8">
          {d.status === 'loading' && d.orders.length === 0 && d.listings.length === 0 && tab !== 'account' ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-white border border-line" />
              ))}
            </div>
          ) : (
            <div role="tabpanel">
              {tab === 'account'   && <AccountTab   user={user}         dispatch={dispatch} />}
              {tab === 'purchases' && <PurchasesTab  orders={d.orders}                      />}
              {tab === 'bids'      && <BidsTab       bids={d.bids}                           />}
              {tab === 'listings'  && <ListingsTab   listings={d.listings}                  />}
              {tab === 'reviews'   && <ReviewsTab    user={user}                             />}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
