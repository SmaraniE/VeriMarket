import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ProductCard from '../components/ProductCard';
import { fetchProducts } from '../store/productSlice';
import { CATEGORIES, CONDITIONS } from '../utils/constants';
import api from '../utils/api';

const TRUST_POINTS = [
  {
    icon: (
      <svg className="h-6 w-6 text-verify" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Expert Verified Authentic',
    desc: 'Every item with our green badge undergoes physical or document inspection before delivery.',
  },
  {
    icon: (
      <svg className="h-6 w-6 text-auction" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Live Real-Time Auctions',
    desc: 'Dynamic real-time bidding with anti-sniping protection and instant outbid alerts.',
  },
  {
    icon: (
      <svg className="h-6 w-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Secure Razorpay Payments',
    desc: 'Funds are securely escrowed and released only after delivery confirmation.',
  },
];

export default function Home() {
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();
  const { list } = useSelector((s) => s.products);
  const clockOffset = useSelector((s) => s.products.clockOffset);
  const key = params.toString();
  const page = Number(params.get('page')) || 1;

  const [trending, setTrending] = useState([]);
  const catalogRef = useRef(null);
  const filtersRef = useRef(null);

  useEffect(() => {
    dispatch(fetchProducts({ ...Object.fromEntries(new URLSearchParams(key)), limit: 12 }));
  }, [key, dispatch]);

  // Automated Focus Shift: scroll to catalog feed whenever a search query is present
  useEffect(() => {
    if (params.get('q')) {
      const timer = setTimeout(() => {
        catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [params]);

  // If no items match, fetch trending items as a smart fallback so layout never feels broken
  useEffect(() => {
    if (list.status === 'succeeded' && list.items.length === 0) {
      api.get('/products?limit=4&sort=most_bids')
        .then(({ data }) => setTrending(data.products || []))
        .catch(() => {});
    }
  }, [list.status, list.items.length]);

  const scrollToCatalog = () => {
    setTimeout(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const update = (name, value, autoScroll = false) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== 'page') next.delete('page');
    setParams(next);
    if (autoScroll) {
      scrollToCatalog();
    }
  };

  const handleExploreAuctions = () => {
    const next = new URLSearchParams(params);
    next.set('listingType', 'auction');
    next.delete('page');
    setParams(next);
    scrollToCatalog();
  };

  const handleVerifiedOnlyToggle = () => {
    const next = new URLSearchParams(params);
    const currentlyVerified = params.get('verified') === 'true';
    if (currentlyVerified) {
      next.delete('verified');
    } else {
      next.set('verified', 'true');
    }
    next.delete('page');
    setParams(next);
    scrollToCatalog();
  };

  const hasFilters = ['q', 'category', 'listingType', 'condition', 'verified', 'sort'].some((k) => params.get(k));

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-slate-900 to-ink p-8 text-white shadow-xl sm:p-12">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-verify/30 bg-verify/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Verified Authentic Marketplace
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Buy & bid on items verified before they ship.
          </h1>
          <p className="text-lg text-slate-300">
            Discover verified rare sneakers, luxury watches, electronics, and vintage collectibles. Look for the green badge to guarantee 100% authenticity.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleExploreAuctions}
              className="rounded-xl bg-auction px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-auction/90 hover:shadow-auction/25"
            >
              Explore Live Auctions
            </button>
            <button
              onClick={handleVerifiedOnlyToggle}
              className={`rounded-xl border px-6 py-3 font-semibold backdrop-blur transition-all ${
                params.get('verified') === 'true'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                  : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Verified Items Only {params.get('verified') === 'true' ? '✓' : ''}
            </button>
          </div>
        </div>

        {/* Decorative Grid Pattern */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-96 w-96 rounded-full bg-verify/10 blur-3xl pointer-events-none" />
      </section>

      {/* Trust Value Propositions */}
      <section className="grid gap-6 sm:grid-cols-3">
        {TRUST_POINTS.map((pt, i) => (
          <div key={i} className="flex gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="shrink-0">{pt.icon}</div>
            <div>
              <h4 className="font-semibold text-ink">{pt.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-mute">{pt.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Discovery Filters Bar */}
      <section id="filters-section" ref={filtersRef} aria-label="Filters" className="rounded-2xl border border-line bg-white p-5 shadow-sm scroll-mt-20">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label text-xs uppercase tracking-wider text-mute" htmlFor="f-type">
              Format
            </label>
            <select
              id="f-type"
              className="input text-sm"
              value={params.get('listingType') || ''}
              onChange={(e) => update('listingType', e.target.value, true)}
            >
              <option value="">All Formats</option>
              <option value="auction">Live Auctions</option>
              <option value="fixed">Buy It Now</option>
            </select>
          </div>

          <div>
            <label className="label text-xs uppercase tracking-wider text-mute" htmlFor="f-cat">
              Category
            </label>
            <select
              id="f-cat"
              className="input text-sm"
              value={params.get('category') || ''}
              onChange={(e) => update('category', e.target.value, true)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-xs uppercase tracking-wider text-mute" htmlFor="f-cond">
              Condition
            </label>
            <select
              id="f-cond"
              className="input text-sm"
              value={params.get('condition') || ''}
              onChange={(e) => update('condition', e.target.value, true)}
            >
              <option value="">Any Condition</option>
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-xs uppercase tracking-wider text-mute" htmlFor="f-sort">
              Sort By
            </label>
            <select
              id="f-sort"
              className="input text-sm"
              value={params.get('sort') || 'newest'}
              onChange={(e) => update('sort', e.target.value === 'newest' ? '' : e.target.value, true)}
            >
              <option value="newest">Newest Additions</option>
              <option value="ending_soon">Ending Soonest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="most_bids">Most Bids Placed</option>
            </select>
          </div>

          <label className="flex items-center gap-2 pb-2.5 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-verify"
              checked={params.get('verified') === 'true'}
              onChange={(e) => update('verified', e.target.checked ? 'true' : '', true)}
            />
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <svg className="h-4 w-4 fill-verify" viewBox="0 0 24 24">
                <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3zm-1.2 13.2l5.4-5.4-1.4-1.4-4 4-1.8-1.8-1.4 1.4 3.2 3.2z" />
              </svg>
              Verified only
            </span>
          </label>

          {hasFilters && (
            <button
              type="button"
              className="btn-outline btn-sm mb-1.5 ml-auto text-xs"
              onClick={() => setParams({})}
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {/* Discovery Catalog Feed */}
      <section id="catalog-feed" ref={catalogRef} aria-live="polite" className="space-y-6 scroll-mt-20">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            {params.get('q') ? `Search results for "${params.get('q')}"` : 'Explore Listings'}
          </h2>
          <span className="text-sm text-mute">
            {list.total} {list.total === 1 ? 'item available' : 'items available'}
          </span>
        </div>

        {list.error && <p role="alert" className="rounded-xl bg-alert-soft px-4 py-3 text-alert">{list.error}</p>}

        {list.status === 'loading' && list.items.length === 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-line/40" />
            ))}
          </div>
        ) : list.items.length === 0 ? (
          <div className="space-y-10">
            {/* Descriptive Empty State */}
            <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-line/40 text-mute">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-bold text-ink">No matching listings found</h3>
              <p className="mt-1 text-sm text-mute">
                We couldn't find anything matching your exact criteria. Try adjusting filters or browse trending items below.
              </p>
              <button
                onClick={() => setParams({})}
                className="btn-outline btn-sm mt-5"
              >
                Reset All Filters
              </button>
            </div>

            {/* Smart Search Fallback: Trending Items */}
            {trending.length > 0 && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
                    <span className="text-auction">🔥</span> Trending & Popular Auctions
                  </h3>
                  <span className="text-xs text-mute uppercase font-semibold">Recommended for you</span>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {trending.map((p) => (
                    <ProductCard key={p._id} product={p} offset={clockOffset} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-4 ${list.status === 'loading' ? 'opacity-60 transition-opacity' : ''}`}>
            {list.items.map((p) => (
              <ProductCard key={p._id} product={p} offset={clockOffset} />
            ))}
          </div>
        )}

        {/* Pagination Navigation */}
        {list.pages > 1 && (
          <nav className="mt-12 flex items-center justify-center gap-4" aria-label="Pagination">
            <button
              className="btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => update('page', String(page - 1))}
            >
              Previous
            </button>
            <span className="text-sm font-medium text-mute">
              Page {list.page} of {list.pages}
            </span>
            <button
              className="btn-outline btn-sm"
              disabled={page >= list.pages}
              onClick={() => update('page', String(page + 1))}
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
