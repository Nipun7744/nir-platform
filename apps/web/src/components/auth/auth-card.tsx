import Image from 'next/image';

export function AuthCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-14">
      <div className="w-full max-w-md rounded-2xl border border-ink-100 bg-white p-8 shadow-card">
        <div className="mb-6">
          <Image
            src="/brand/nir-logo.svg"
            alt="National Innovation Repository"
            width={180}
            height={60}
            className="h-14 w-auto"
          />
        </div>
        {eyebrow && <p className="font-mono text-xs font-semibold uppercase tracking-wide text-brand-700">{eyebrow}</p>}
        <h1 className="mt-1.5 font-display text-2xl font-extrabold text-ink-900">{title}</h1>
        <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
