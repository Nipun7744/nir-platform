/**
 * Moving glow for the landing page's dark (navy) sections — stats strip and challenge banner
 * (user request, 2026-11-19). One band drifts left → right on a loop (`animate-strip-sweep`).
 *
 * Usage: put it as the first child of a section with `relative isolate overflow-hidden`. It sits at
 * -z-10 inside that stacking context: above the section's background, below all of its content, so
 * it never covers text.
 *
 * Two layers:
 *  - edge rails: the bright part — a lime → near-white light line with an emerald bloom along the
 *    top and bottom edges, which fall inside the sections' padding (no text there);
 *  - body haze: emerald, capped at 16% alpha — the most the #9DB3D6 labels can take over navy (plus
 *    the sections' static glows) and stay ≥ 4.5:1. Don't raise it, and don't blur it (blur dilutes
 *    it to near-invisible).
 *
 * Decorative (aria-hidden); hidden entirely under prefers-reduced-motion.
 */
export function GlowSweep() {
  const rail =
    'absolute inset-x-[12%] h-[2px] bg-[linear-gradient(90deg,transparent,rgba(163,230,53,.85)_30%,#ECFDF5_50%,rgba(163,230,53,.85)_70%,transparent)] blur-[0.5px]';
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 motion-reduce:hidden">
      <span className="absolute inset-y-0 left-0 w-[max(36%,220px)] animate-strip-sweep">
        <span className="absolute inset-0 bg-[radial-gradient(ellipse_50%_90%_at_50%_50%,rgba(16,185,129,.16),rgba(16,185,129,.11)_40%,transparent_75%)]" />
        <span className="absolute inset-x-0 top-0 h-4 bg-[radial-gradient(ellipse_45%_100%_at_50%_0%,rgba(52,211,153,.6),transparent_70%)]" />
        <span className={`${rail} top-0`} />
        <span className="absolute inset-x-0 bottom-0 h-4 bg-[radial-gradient(ellipse_45%_100%_at_50%_100%,rgba(52,211,153,.6),transparent_70%)]" />
        <span className={`${rail} bottom-0`} />
      </span>
    </span>
  );
}
