import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { CategoryIcon } from './category-icon';
import { StagePill } from './stage-pill';
import type { InnovationCardDto } from '@/hooks/use-content';

const GRADIENTS = ['from-nirgreen-deep/90 to-navy/90', 'from-amber/90 to-navy-2/90', 'from-navy-2/90 to-nirgreen-dark/90'];

export function InnovationCard({ innovation, index = 0 }: { innovation: InnovationCardDto; index?: number }) {
  const photo = innovation.attachments?.find((a) => a.kind === 'PHOTO');
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    <Link
      href={`/repository/${innovation.slug}`}
      className="focus-ring group flex flex-col overflow-hidden rounded-[18px] border border-greenline bg-white shadow-card transition hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(19,36,63,.08),0_20px_48px_-16px_rgba(19,36,63,.24)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-mist-2">
        {photo ? (
          <Image
            src={photo.url}
            alt=""
            fill
            sizes="380px"
            className="object-cover transition duration-[400ms] ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className={`flex h-full w-full items-end bg-gradient-to-br p-4 ${gradient}`}>
            <CategoryIcon name={innovation.category.icon} className="absolute right-4 top-4 h-8 w-8 text-white/40" />
          </div>
        )}
        <StagePill stage={innovation.developmentStage} className="absolute left-3.5 top-3.5" />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-[22px_24px_24px]" style={{ padding: '22px 24px 24px' }}>
        <span className="font-mono text-xs uppercase tracking-[0.08em] text-slate">
          {innovation.innovationCode} · {innovation.category.nameEn}
        </span>
        <h3 className="font-display text-xl font-bold leading-[1.25] text-navy group-hover:text-nirgreen-dark">
          {innovation.titleEn}
        </h3>
        <p className="m-0 line-clamp-3 text-sm text-slate">{innovation.summaryEn}</p>
        <div className="mt-auto flex flex-wrap gap-3.5 pt-1 text-xs text-slate">
          <span>{innovation.organization?.name ?? 'Independent innovator'}</span>
        </div>
      </div>
    </Link>
  );
}
