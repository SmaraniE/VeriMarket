import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { pushToast } from '../store/uiSlice';
import { getSocket } from '../utils/socket';
import { money } from '../utils/format';

export default function Navbar() {
  const [q, setQ] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const cartCount = useSelector((s) => s.cart.items.reduce((n, i) => n + i.quantity, 0));

  // Close dropdown on click-outside
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Personal alerts arrive on the user's private socket room, on any page
  useEffect(() => {
    if (!user) return undefined;
    const socket = getSocket();
    const onOutbid = (d) =>
      dispatch(
        pushToast({
          type: 'warn',
          text: `You were outbid on "${d.title}". Current bid is ${money(d.currentBid)}.`,
          link: `/product/${d.productId}`,
        })
      );
    const onWon = (d) =>
      dispatch(
        pushToast({
          type: 'good',
          text: `You won "${d.title}" for ${money(d.price)}. Pay from your dashboard to complete the purchase.`,
          link: '/dashboard',
        })
      );
    socket.on('outbid', onOutbid);
    socket.on('auction_won', onWon);
    return () => {
      socket.off('outbid', onOutbid);
      socket.off('auction_won', onWon);
    };
  }, [user, dispatch]);

  const search = (e) => {
    e.preventDefault();
    const trimmed = q.trim();
    navigate(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/');
    // Programmatically align viewport down to catalog feed
    setTimeout(() => {
      const target = document.getElementById('catalog-feed') || document.getElementById('filters-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const link = ({ isActive }) => `rounded px-2 py-1 text-sm font-medium ${isActive ? 'text-verify' : 'text-ink hover:text-verify'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-verify" aria-hidden="true">
            <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3zm-1.2 13.2l5.4-5.4-1.4-1.4-4 4-1.8-1.8-1.4 1.4 3.2 3.2z" />
          </svg>
          VeriMarket
        </Link>

        <form onSubmit={search} className="order-3 w-full flex-1 sm:order-none sm:w-auto" role="search">
          <label htmlFor="nav-search" className="sr-only">
            Search items
          </label>
          <input
            id="nav-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search watches, cameras, sneakers..."
            className="input"
          />
        </form>

        <nav className="ml-auto flex items-center gap-2" aria-label="Main">
          {user && (
            <NavLink to="/dashboard" className={link}>
              Dashboard
            </NavLink>
          )}
          <button
            type="button"
            onClick={() => {
              if (!user) {
                navigate('/login', { state: { from: '/cart' } });
              } else {
                navigate('/cart');
              }
            }}
            className={link({ isActive: window.location.pathname === '/cart' })}
          >
            Cart{user && cartCount > 0 && <span className="ml-1 rounded-full bg-verify px-1.5 py-0.5 text-xs text-white">{cartCount}</span>}
          </button>
          {user ? (
            /* ── User avatar dropdown ── */
            <div className="relative" ref={dropRef}>
              <button
                id="user-menu-button"
                type="button"
                aria-haspopup="true"
                aria-expanded={dropOpen}
                onClick={() => setDropOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-sm font-medium hover:bg-paper transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-verify"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-verify/20"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-gradient-to-br from-verify to-verify-dark flex items-center justify-center text-xs font-bold text-white">
                    {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                )}
                <span className="hidden text-sm text-ink md:block max-w-24 truncate">{user.name.split(' ')[0]}</span>
                <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-mute transition-transform ${dropOpen ? 'rotate-180' : ''}`}>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
                </svg>
              </button>

              {dropOpen && (
                <div
                  id="user-dropdown-menu"
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-line bg-white shadow-xl z-50 overflow-hidden"
                  style={{ animation: 'dropIn 0.15s ease' }}
                >
                  <style>{`@keyframes dropIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }`}</style>
                  {/* Identity card */}
                  <div className="border-b border-line bg-paper px-4 py-3">
                    <p className="text-sm font-semibold text-ink truncate">{user.name}</p>
                    <p className="text-xs text-mute truncate">{user.email}</p>
                    {user.rating?.count > 0 && (
                      <p className="text-xs text-mute mt-0.5">
                        ⭐ {user.rating.average.toFixed(1)} seller rating
                      </p>
                    )}
                  </div>
                  {/* Links */}
                  <div className="py-1">
                    {[
                      { to: '/profile',   label: 'My Profile',   icon: '👤' },
                      { to: '/dashboard', label: 'Dashboard',    icon: '📊' },
                      { to: '/cart',      label: 'Cart',         icon: '🛒' },
                    ].map(({ to, label, icon }) => (
                      <Link
                        key={to}
                        to={to}
                        role="menuitem"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-paper transition-colors"
                        onClick={() => setDropOpen(false)}
                      >
                        <span>{icon}</span>
                        {label}
                      </Link>
                    ))}
                  </div>
                  {/* Logout */}
                  <div className="border-t border-line py-1">
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-alert hover:bg-alert-soft transition-colors"
                      onClick={() => {
                        dispatch(logout());
                        navigate('/');
                        setDropOpen(false);
                      }}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd"/>
                        <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-1.05a.75.75 0 10-1.06-1.06l-2.5 2.5a.75.75 0 000 1.06l2.5 2.5a.75.75 0 101.06-1.06l-1.047-1.05h9.546A.75.75 0 0019 10z" clipRule="evenodd"/>
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <NavLink to="/login" className={link}>
                Log in
              </NavLink>
              <Link to="/register" className="btn-primary btn-sm">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
