'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { MapPin, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api-client';

export default function ContactPage() {
  const t = useTranslations('contact');
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const mutation = useMutation({
    mutationFn: () => api.post('/feedback', form),
  });

  return (
    <div className="container-page grid gap-12 py-14 lg:grid-cols-2">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{t('eyebrow')}</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-ink-900">{t('title')}</h1>
        <p className="mt-3 max-w-md text-ink-600">{t('description')}</p>

        <dl className="mt-8 space-y-4 text-sm">
          <div className="flex gap-3">
            <MapPin className="h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <dt className="font-semibold text-ink-800">{t('addressLabel')}</dt>
              <dd className="text-ink-600">E-14/X, ICT Tower, Agargaon, Sher-e-Bangla Nagar, Dhaka-1207</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Phone className="h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <dt className="font-semibold text-ink-800">{t('phoneLabel')}</dt>
              <dd className="text-ink-600">+88 02 55006931-34</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Mail className="h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <dt className="font-semibold text-ink-800">{t('emailLabel')}</dt>
              <dd className="text-ink-600">info@a2i.gov.bd</dd>
            </div>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        {mutation.isSuccess ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <CheckCircle2 className="h-10 w-10 text-brand-600" />
            <p className="font-medium text-ink-800">{t('formSuccess')}</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">{t('formName')}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">{t('formEmail')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('formSubject')}</label>
              <input
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{t('formMessage')}</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="focus-ring w-full rounded-lg border border-ink-100 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="focus-ring rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {mutation.isPending ? '…' : t('formSubmit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
