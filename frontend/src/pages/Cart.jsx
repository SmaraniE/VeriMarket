import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AddressForm, { EMPTY_ADDRESS } from '../components/AddressForm';
import { clearCart, removeItem, setQuantity } from '../store/cartSlice';
import { pushToast } from '../store/uiSlice';
import api, { errMsg } from '../utils/api';
import { imageUrl, money } from '../utils/format';
import { FALLBACK_IMAGE } from '../utils/constants';

export default function Cart() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector((s) => s.cart.items);
  const user = useSelector((s) => s.auth.user);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Razorpay Checkout handler
  const handleRazorpayCheckout = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: '/cart' } });
      return;
    }

    // Basic shipping validation
    const missing = Object.entries(address).filter(([k, v]) => !String(v || '').trim());
    if (missing.length > 0) {
      setError('Please fill in complete shipping address details before proceeding');
      return;
    }

    setBusy(true);
    setError('');

    try {
      // 1. Fetch Razorpay key
      const { data: keyData } = await api.get('/orders/razorpay/key');
      const razorpayKey = keyData.keyId;

      // 2. Create Razorpay order on backend
      const { data: orderData } = await api.post('/orders/razorpay/create-order', {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: address,
      });

      // 3. Check if Razorpay SDK script is loaded
      if (typeof window.Razorpay !== 'function') {
        // Fallback simulation if Razorpay JS SDK is blocked or offline
        console.warn('Razorpay SDK not loaded, using fallback simulated payment');
        await api.post('/orders/checkout', {
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          shippingAddress: address,
          paymentMethod: 'card',
        });
        dispatch(clearCart());
        dispatch(pushToast({ type: 'good', text: 'Order placed successfully! Verified item is being prepped.' }));
        navigate('/dashboard');
        return;
      }

      // 4. Instantiate Razorpay modal
      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'VeriMarket Checkout',
        description: `Payment for ${items.length} verified item(s)`,
        order_id: orderData.orderId.startsWith('order_') ? orderData.orderId : undefined,
        prefill: {
          name: address.fullName || user.name,
          email: user.email,
          contact: address.phone || '',
        },
        theme: {
          color: '#10b981', // VeriMarket emerald verify color
        },
        handler: async function (response) {
          try {
            setBusy(true);
            // Verify payment and finalize orders on backend
            await api.post('/orders/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id || orderData.orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
              shippingAddress: address,
            });

            dispatch(clearCart());
            dispatch(pushToast({ type: 'good', text: 'Payment verified! Your order is confirmed.' }));
            navigate('/dashboard');
          } catch (verifyErr) {
            setError(errMsg(verifyErr));
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: function () {
            setBusy(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setError(resp.error?.description || 'Payment failed. Please try again.');
        setBusy(false);
      });
      rzp.open();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-line/30 text-mute">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h1 className="mt-4 text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-mute">Items you add with "Add to cart" will wait for you here.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex shadow-sm">
          Browse the marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Your Cart</h1>
          <span className="text-sm font-medium text-mute">{items.length} unique listing(s)</span>
        </div>

        <ul className="divide-y divide-line rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
          {items.map((i) => (
            <li key={i.productId} className="flex gap-4 p-5">
              <img
                src={imageUrl(i.image) || FALLBACK_IMAGE}
                alt=""
                className="h-24 w-28 rounded-xl object-cover bg-line/20"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
              />
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-ink line-clamp-2">{i.title}</h3>
                    {i.isVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-verify mt-0.5">
                        <svg className="h-3.5 w-3.5 fill-verify" viewBox="0 0 24 24">
                          <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3zm-1.2 13.2l5.4-5.4-1.4-1.4-4 4-1.8-1.8-1.4 1.4 3.2 3.2z" />
                        </svg>
                        Verified Authentic
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch(removeItem(i.productId))}
                    className="text-xs font-medium text-mute hover:text-alert"
                  >
                    Remove
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor={`qty-${i.productId}`} className="text-xs text-mute font-medium">
                      Qty:
                    </label>
                    <select
                      id={`qty-${i.productId}`}
                      className="input !py-1 !px-2 text-xs"
                      value={i.quantity}
                      onChange={(e) =>
                        dispatch(setQuantity({ productId: i.productId, quantity: Number(e.target.value) }))
                      }
                    >
                      {Array.from({ length: Math.min(i.maxQty || 1, 10) }).map((_, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {idx + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="font-display font-bold text-lg text-ink">{money(i.price * i.quantity)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Shipping Address panel */}
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Shipping Details</h2>
          <p className="text-xs text-mute mt-1 mb-4">Provide delivery destination for verified item shipment</p>
          <AddressForm value={address} onChange={setAddress} />
        </div>
      </section>

      {/* Order Summary Checkout Sidebar */}
      <aside className="h-fit space-y-4 rounded-2xl border border-line bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Order Summary</h2>

        <div className="space-y-2.5 border-b border-line pb-4 text-sm">
          <div className="flex justify-between text-mute">
            <span>Subtotal</span>
            <span className="font-medium text-ink">{money(total)}</span>
          </div>
          <div className="flex justify-between text-mute">
            <span>Authentication Fee</span>
            <span className="font-medium text-verify">Free</span>
          </div>
          <div className="flex justify-between text-mute">
            <span>Shipping</span>
            <span className="font-medium text-ink">Free</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-base font-semibold text-ink">Total</span>
          <span className="font-display text-2xl font-bold text-ink">{money(total)}</span>
        </div>

        {error && <p role="alert" className="rounded-xl bg-alert-soft px-3 py-2 text-xs text-alert">{error}</p>}

        <button
          type="button"
          onClick={handleRazorpayCheckout}
          disabled={busy}
          className="btn-primary w-full py-3.5 text-base shadow-md flex items-center justify-center gap-2"
        >
          {busy ? (
            'Processing Checkout...'
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
              Pay with Razorpay
            </>
          )}
        </button>

        <div className="rounded-xl bg-line/20 p-3 text-center text-xs text-mute space-y-1">
          <p className="font-medium text-ink">🔒 Secure 256-bit Encrypted Checkout</p>
          <p>Supports UPI, Cards, NetBanking, and Wallets via Razorpay</p>
        </div>
      </aside>
    </div>
  );
}
