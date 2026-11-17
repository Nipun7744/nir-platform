'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

export function AnimatedCounter({ value, durationMs = 1200 }: { value: number; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  // No negative margin: this often sits near the fold on initial load (right below a tall
  // hero), so shrinking the trigger zone risks it never firing for users who don't scroll.
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    let frame: number;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, durationMs]);

  // Screen readers get the final value straight away (the animation starts at 0 and only runs once
  // the number scrolls into view, so a screen reader reading ahead would otherwise hear "0").
  // The animated digits are visual only. No visual change (WCAG 1.3.1 / 4.1.2, 2026-11-17).
  return (
    <span className="tabular-nums">
      <span ref={ref} aria-hidden="true">
        {display.toLocaleString()}
      </span>
      <span className="sr-only">{value.toLocaleString()}</span>
    </span>
  );
}
