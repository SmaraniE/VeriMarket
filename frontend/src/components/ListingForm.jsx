import { useState, useRef } from 'react';
import api, { errMsg } from '../utils/api';
import { CATEGORIES, CONDITIONS, DURATIONS } from '../utils/constants';

const INITIAL = {
  listingType: 'auction',
  title: '',
  description: '',
  category: CATEGORIES[0],
  brand: '',
  condition: 'good',
  serialNumber: '',
  price: '',
  quantity: 1,
  startPrice: '',
  reservePrice: '',
  durationHours: 24,
};

export default function ListingForm({ onCreated }) {
  const [form, setForm] = useState(INITIAL);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [docPreviews, setDocPreviews] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isAuction = form.listingType === 'auction';

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const combined = [...selectedImages, ...files].slice(0, 8);
    setSelectedImages(combined);

    const previews = combined.map((f) => URL.createObjectURL(f));
    setImagePreviews(previews);
  };

  const removeImage = (index) => {
    const updated = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(updated);
    setImagePreviews(updated.map((f) => URL.createObjectURL(f)));
  };

  const handleDocSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const combined = [...selectedDocs, ...files].slice(0, 4);
    setSelectedDocs(combined);
    setDocPreviews(combined.map((f) => f.name));
  };

  const removeDoc = (index) => {
    const updated = selectedDocs.filter((_, i) => i !== index);
    setSelectedDocs(updated);
    setDocPreviews(updated.map((f) => f.name));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (selectedImages.length === 0) {
      setError('Please select at least 1 photo for your listing');
      return;
    }

    setBusy(true);
    setError('');

    try {
      // 1. Upload images natively via multipart/form-data
      const imgFormData = new FormData();
      selectedImages.forEach((file) => imgFormData.append('images', file));
      const { data: imgData } = await api.post('/upload/images', imgFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // 2. Upload verification docs if present
      let docUrls = [];
      if (selectedDocs.length > 0) {
        const docFormData = new FormData();
        selectedDocs.forEach((file) => docFormData.append('images', file));
        const { data: docData } = await api.post('/upload/images', docFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        docUrls = docData.urls;
      }

      // 3. Create Product
      const body = {
        ...form,
        images: imgData.urls,
        verificationDocs: docUrls,
        durationHours: Number(form.durationHours),
      };

      if (isAuction) {
        delete body.price;
        delete body.quantity;
      } else {
        delete body.startPrice;
        delete body.reservePrice;
        delete body.durationHours;
      }

      await api.post('/products', body);
      setForm(INITIAL);
      setSelectedImages([]);
      setImagePreviews([]);
      setSelectedDocs([]);
      setDocPreviews([]);
      onCreated?.();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="panel space-y-6 p-6">
      <div>
        <h3 className="text-xl font-bold tracking-tight">Create a listing</h3>
        <p className="mt-1 text-sm text-mute">
          Every listing is reviewed by our authentication experts before getting the verified badge.
        </p>
      </div>

      <fieldset className="flex gap-3">
        <legend className="label mb-1.5">Format</legend>
        {[
          ['auction', 'Live Auction'],
          ['fixed', 'Buy It Now'],
        ].map(([value, label]) => (
          <label
            key={value}
            className={`flex-1 cursor-pointer rounded-lg border p-3 text-center text-sm font-semibold transition-all ${
              form.listingType === value
                ? 'border-verify bg-verify/5 text-verify-dark shadow-sm ring-1 ring-verify'
                : 'border-line hover:border-ink/30'
            }`}
          >
            <input
              type="radio"
              name="listingType"
              value={value}
              checked={form.listingType === value}
              onChange={set('listingType')}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </fieldset>

      {/* Native Photo Upload Section */}
      <div className="space-y-2">
        <label className="label">
          Product Photos <span className="font-normal text-mute">({selectedImages.length}/8 photos, PNG, JPG, WEBP)</span>
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-line/20 p-6 text-center transition-all hover:border-verify hover:bg-verify/5"
        >
          <svg className="h-10 w-10 text-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-2 text-sm font-medium text-ink">
            <span className="text-verify underline">Click to upload photos</span> or drag & drop
          </p>
          <p className="text-xs text-mute mt-1">High resolution clear angles receive priority verification</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        {/* Selected Photos Previews */}
        {imagePreviews.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {imagePreviews.map((src, idx) => (
              <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-white shadow-sm">
                <img src={src} alt="Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  title="Remove image"
                >
                  &times;
                </button>
                {idx === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Cover
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="lf-title">Listing Title</label>
          <input id="lf-title" className="input" placeholder="e.g. Nike Air Force 1 '07 - Size 10.5" value={form.title} onChange={set('title')} maxLength={140} required />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="lf-desc">Detailed Description</label>
          <textarea id="lf-desc" className="input min-h-24" placeholder="Detail condition, included accessories, purchase history..." value={form.description} onChange={set('description')} required />
        </div>
        <div>
          <label className="label" htmlFor="lf-cat">Category</label>
          <select id="lf-cat" className="input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="lf-cond">Condition</label>
          <select id="lf-cond" className="input" value={form.condition} onChange={set('condition')}>
            {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="lf-brand">Brand</label>
          <input id="lf-brand" className="input" placeholder="e.g. Nike, Apple, Sony" value={form.brand} onChange={set('brand')} />
        </div>
        <div>
          <label className="label" htmlFor="lf-serial">Serial / Model Number</label>
          <input id="lf-serial" className="input" placeholder="Helps verify authenticity" value={form.serialNumber} onChange={set('serialNumber')} />
        </div>

        {/* Verification Proof Uploads */}
        <div className="sm:col-span-2 space-y-1">
          <label className="label">Proof of Authenticity (Optional)</label>
          <p className="text-xs text-mute">Upload receipts, authenticity cards, or serial badge photos for faster verification.</p>
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="btn-outline btn-sm"
            >
              Attach Proof Photos
            </button>
            <input
              ref={docInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleDocSelect}
              className="hidden"
            />
            {docPreviews.map((name, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-line/40 px-2 py-1 rounded">
                {name.slice(0, 15)}...
                <button type="button" onClick={() => removeDoc(i)} className="text-mute hover:text-alert">&times;</button>
              </span>
            ))}
          </div>
        </div>

        {isAuction ? (
          <>
            <div>
              <label className="label" htmlFor="lf-start">Starting Bid ($)</label>
              <input id="lf-start" type="number" min="0.01" step="0.01" placeholder="25.00" className="input" value={form.startPrice} onChange={set('startPrice')} required />
            </div>
            <div>
              <label className="label" htmlFor="lf-reserve">Reserve Price ($) <span className="text-mute font-normal">(Optional)</span></label>
              <input id="lf-reserve" type="number" min="0" step="0.01" placeholder="Hidden from bidders" className="input" value={form.reservePrice} onChange={set('reservePrice')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="lf-dur">Auction Duration</label>
              <select id="lf-dur" className="input" value={form.durationHours} onChange={set('durationHours')}>
                {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="label" htmlFor="lf-price">Fixed Price ($)</label>
              <input id="lf-price" type="number" min="0.01" step="0.01" placeholder="99.00" className="input" value={form.price} onChange={set('price')} required />
            </div>
            <div>
              <label className="label" htmlFor="lf-qty">Stock Quantity</label>
              <input id="lf-qty" type="number" min="1" step="1" className="input" value={form.quantity} onChange={set('quantity')} required />
            </div>
          </>
        )}
      </div>

      {error && <p role="alert" className="rounded-md bg-alert-soft px-3 py-2 text-sm text-alert">{error}</p>}
      <button className="btn-primary w-full py-3 text-base shadow-md" disabled={busy}>
        {busy ? 'Uploading & Publishing...' : 'Publish Listing'}
      </button>
    </form>
  );
}
