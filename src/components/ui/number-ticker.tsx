import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

interface NumberTickerProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimalPlaces?: number;
}

export function NumberTicker({
  value,
  duration = 2,
  className = '',
  prefix = '',
  suffix = '',
  decimalPlaces = 0,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const [displayed, setDisplayed] = useState(reduced ? value : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isInView) return;

    if (reduced) {
      setDisplayed(value);
      return;
    }

    let startTime: number | null = null;

    const tick = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(value * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isInView, value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayed.toFixed(decimalPlaces)}
      {suffix}
    </span>
  );
}
