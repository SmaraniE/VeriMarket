// Shows the item's authenticity-check outcome. `status` is Pending | Verified | Rejected.
const STYLES = {
  Verified: 'bg-verify-soft text-verify-dark',
  Pending: 'bg-auction-soft text-auction',
  Rejected: 'bg-alert-soft text-alert',
};
const LABELS = {
  Verified: 'Verified authentic',
  Pending: 'Verification pending',
  Rejected: 'Failed verification',
};

export default function VerifiedBadge({ status = 'Pending', compact = false }) {
  return (
    <span className={`chip gap-1 ${STYLES[status]}`} title={LABELS[status]}>
      {status === 'Verified' && (
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
          <path d="M10 1.5l2.2 1.6 2.7-.1.9 2.6 2.2 1.6-.8 2.6.8 2.6-2.2 1.6-.9 2.6-2.7-.1L10 18.5l-2.2-1.6-2.7.1-.9-2.6-2.2-1.6.8-2.6-.8-2.6 2.2-1.6.9-2.6 2.7.1L10 1.5zm-1.2 11.2l4.6-4.6-1-1-3.6 3.6-1.6-1.6-1 1 2.6 2.6z" />
        </svg>
      )}
      {compact && status === 'Verified' ? 'Verified' : LABELS[status]}
    </span>
  );
}
