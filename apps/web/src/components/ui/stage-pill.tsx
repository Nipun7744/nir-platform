import clsx from 'clsx';

const STAGE_LABELS: Record<string, string> = {
  IDEA: 'Idea',
  PROTOTYPE_DEVELOPED: 'Prototype',
  PILOT_IMPLEMENTED: 'Piloting',
  COMMERCIALIZED: 'Commercial product',
  SCALED: 'Scaled',
  DISCONTINUED: 'Discontinued',
};

// Matches nir.css .badge-commercial / .badge-pilot / .badge-idea
const STAGE_STYLES: Record<string, string> = {
  IDEA: 'bg-[#EAF0F9] text-navy-2',
  PROTOTYPE_DEVELOPED: 'bg-[#EAF0F9] text-navy-2',
  PILOT_IMPLEMENTED: 'bg-[#FDF3DC] text-amber-deep',
  COMMERCIALIZED: 'bg-[#E5F5EE] text-nirgreen-dark',
  SCALED: 'bg-[#E5F5EE] text-nirgreen-dark',
  DISCONTINUED: 'bg-mist text-slate',
};

export function StagePill({ stage, className }: { stage: string; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.04em]',
        STAGE_STYLES[stage] ?? 'bg-mist text-slate',
        className,
      )}
    >
      {STAGE_LABELS[stage] ?? stage}
    </span>
  );
}
