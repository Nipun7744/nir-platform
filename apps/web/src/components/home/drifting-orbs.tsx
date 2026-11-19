/**
 * Drifting green light for the landing page's light sections — hero and quick links (user request,
 * 2026-11-19). Soft radial orbs wander slowly on separate loops (`animate-orb-a/b/c` in
 * tailwind.config.ts), so the pattern rarely repeats.
 *
 * Usage: first child of a section with `relative isolate overflow-hidden`; the layer sits at -z-10
 * (above the section background, below all content). It's anchored to a centred 1440px box so the
 * orbs track the content on wide screens. Each section passes its own orb positions/colours.
 *
 * Contrast: green tint on white lowers text contrast — the 12px `#007A4E` text only keeps ≥ 4.5:1
 * under ~7% tint. Keep bright orbs out of text areas (or behind opaque/frosted cards), and use
 * `className` to fade the layer where text spans the full width (phones).
 *
 * Decorative (aria-hidden); hidden entirely under prefers-reduced-motion.
 */
export type Orb = {
  /** Position + size, e.g. `-right-24 top-[6%] w-[560px]`. */
  place: string;
  /** Orb colour as `r,g,b`. */
  rgb: string;
  /** Peak alpha at the centre. */
  alpha: number;
  anim: 'animate-orb-a' | 'animate-orb-b' | 'animate-orb-c';
};

export function DriftingOrbs({ orbs, className = '' }: { orbs: Orb[]; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-full max-w-[1440px] -translate-x-1/2 motion-reduce:hidden ${className}`}
    >
      {orbs.map((orb, i) => (
        <span
          key={i}
          className={`absolute aspect-square rounded-full ${orb.place} ${orb.anim}`}
          style={{
            backgroundImage: `radial-gradient(circle, rgba(${orb.rgb},${orb.alpha}), rgba(${orb.rgb},${(orb.alpha * 0.38).toFixed(3)}) 40%, transparent 70%)`,
          }}
        />
      ))}
    </div>
  );
}
