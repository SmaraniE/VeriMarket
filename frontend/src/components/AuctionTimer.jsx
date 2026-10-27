import { useEffect, useRef, useState } from 'react';

const pad = (n) => String(n).padStart(2, '0');

/**
 * Live countdown.
 *  endTime  - ISO string / Date from the server
 *  offset   - serverNow - clientNow in ms (from the product slice) so every viewer sees the same clock
 *  onExpire - fired once when the countdown reaches zero
 */
export default function AuctionTimer({ endTime, offset = 0, onExpire, compact = false }) {
  const end = new Date(endTime).getTime();
  const remaining = () => end - (Date.now() + offset);

  const [left, setLeft] = useState(remaining);
  const fired = useRef(false);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    fired.current = false; // a bid in the last 2 minutes extends the end time, so re-arm
    setLeft(remaining());
    const timer = setInterval(() => {
      const ms = remaining();
      setLeft(ms);
      if (ms <= 0) {
        clearInterval(timer);
        if (!fired.current) {
          fired.current = true;
          expireRef.current?.();
        }
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, offset]);

  if (left <= 0) {
    return <span className={`font-semibold text-mute ${compact ? 'text-xs' : 'text-lg'}`}>Auction ended</span>;
  }

  const total = Math.floor(left / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const urgent = left < 5 * 60 * 1000;

  const text = d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${pad(m)}:${pad(s)}`;

  return (
    <span
      role="timer"
      aria-label={`Time left: ${d} days ${h} hours ${m} minutes ${s} seconds`}
      className={`font-display font-bold tabular-nums ${urgent ? 'text-alert' : 'text-auction'} ${compact ? 'text-sm' : 'text-3xl'}`}
    >
      {text}
    </span>
  );
}
