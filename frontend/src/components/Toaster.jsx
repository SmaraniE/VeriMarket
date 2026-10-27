import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { removeToast } from '../store/uiSlice';

const TONES = {
  good: 'border-verify bg-verify-soft text-verify-dark',
  warn: 'border-auction bg-auction-soft text-auction',
  bad: 'border-alert bg-alert-soft text-alert',
  info: 'border-line bg-white text-ink',
};

export default function Toaster() {
  const toasts = useSelector((s) => s.ui.toasts);
  const dispatch = useDispatch();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-lg ${TONES[t.type]}`}
        >
          <p className="flex-1">
            {t.text}{' '}
            {t.link && (
              <Link to={t.link} className="font-semibold underline" onClick={() => dispatch(removeToast(t.id))}>
                View item
              </Link>
            )}
          </p>
          <button type="button" aria-label="Dismiss" className="text-lg leading-none" onClick={() => dispatch(removeToast(t.id))}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
