import { useState } from 'react';

// Read-only when `onChange` is omitted; otherwise an accessible radio-style picker.
export default function StarRating({ value = 0, onChange, size = 'h-5 w-5' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || Math.round(value);

  return (
    <span
      className="inline-flex items-center gap-0.5"
      role={onChange ? 'radiogroup' : 'img'}
      aria-label={onChange ? 'Rating' : `${Number(value).toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <svg viewBox="0 0 20 20" className={`${size} ${n <= shown ? 'fill-auction' : 'fill-line'}`} aria-hidden="true">
            <path d="M10 1.8l2.5 5.3 5.7.8-4.1 4 1 5.7L10 14.8 4.9 17.6l1-5.7-4.1-4 5.7-.8L10 1.8z" />
          </svg>
        );
        if (!onChange) return <span key={n}>{star}</span>;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="rounded p-0.5"
          >
            {star}
          </button>
        );
      })}
    </span>
  );
}
