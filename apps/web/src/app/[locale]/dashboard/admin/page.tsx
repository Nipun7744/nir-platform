'use client';

import { useState } from 'react';
import { Inbox, ListChecks, Star } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/lib/api-client';
import { ChallengeFormBuilder } from '@/components/admin/challenge-form-builder';
import { Role, ROLE_LABELS, ChallengeStatus } from '@nir/shared';
import {
  useAdminUsers, useUpdateUserRoles, useUpdateEvaluatorProfile, useUpdatePreliminaryReviewerProfile, useUpdateAuthenticityReviewerProfile, useToggleUserStatus, useCreateCategory, useToggleCategory,
  useAdminNews, useCreateNews, useUpdateNews, useDeleteNews,
  useAdminChallenges, useCreateChallenge, useUpdateChallenge, useDeleteChallenge,
  useAdminResources, useCreateResource, useDeleteResource,
  useAdminPartners, useCreatePartner, useUpdatePartner, useDeletePartner,
  useAdminFaqs, useCreateFaq, useUpdateFaq, useDeleteFaq,
  useUploadFile,
} from '@/hooks/use-admin';
import { useCategories } from '@/hooks/use-content';
import { CategoryIcon } from '@/components/ui/category-icon';

const ALL_ROLES = Object.values(Role);
const RESOURCE_TYPES = ['GUIDELINE', 'POLICY', 'SOP', 'MANUAL', 'TEMPLATE', 'REPORT', 'TOOLKIT'];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <h2 className="font-display text-base font-bold text-ink-900">{title}</h2>
      {children}
    </div>
  );
}

function AddButton({ disabled, onClick, label }: { disabled?: boolean; onClick: () => void; label: string }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="focus-ring mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
    >
      {label}
    </button>
  );
}

const inputCls = 'focus-ring rounded-lg border border-ink-100 px-3 py-2 text-sm';

function ImageUploadField({
  value,
  onChange,
  placeholder = 'Cover image URL (optional)',
}: {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}) {
  const upload = useUploadFile();

  return (
    <div className="sm:col-span-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} flex-1`}
        />
        <label className="focus-ring cursor-pointer rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:border-ink-300">
          {upload.isPending ? 'Uploading…' : 'Upload image'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              upload.mutate(file, { onSuccess: (data) => onChange(data.url) });
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {upload.isError && <p className="mt-1 text-xs text-red-600">Upload failed — try a smaller image or paste a URL instead.</p>}
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="Preview" className="mt-2 h-24 w-40 rounded-lg border border-ink-100 object-cover" />
      )}
    </div>
  );
}

function EvaluatorDetails({ user, categories }: { user: any; categories: any[] | undefined }) {
  const updateEvaluatorProfile = useUpdateEvaluatorProfile();
  const categoryIds: string[] = user.evaluatorCategoryIds ?? [];

  const toggleCategory = (categoryId: string) => {
    const next = categoryIds.includes(categoryId)
      ? categoryIds.filter((id) => id !== categoryId)
      : [...categoryIds, categoryId];
    updateEvaluatorProfile.mutate({ id: user.id, categoryIds: next });
  };

  return (
    <div className="mt-3 space-y-3 border-t border-ink-100 pt-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-600">Innovation categories</label>
        <div className="flex flex-wrap gap-1.5">
          {categories?.map((c) => {
            const active = categoryIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                  active ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-500 hover:border-ink-300'
                }`}
              >
                {c.nameEn}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PreliminaryReviewerDetails({ user, categories }: { user: any; categories: any[] | undefined }) {
  const updateProfile = useUpdatePreliminaryReviewerProfile();
  const categoryIds: string[] = user.preliminaryReviewerCategoryIds ?? [];

  const toggleCategory = (categoryId: string) => {
    const next = categoryIds.includes(categoryId)
      ? categoryIds.filter((id) => id !== categoryId)
      : [...categoryIds, categoryId];
    updateProfile.mutate({ id: user.id, categoryIds: next });
  };

  return (
    <div className="mt-3 space-y-3 border-t border-ink-100 pt-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-600">Preliminary review categories</label>
        <div className="flex flex-wrap gap-1.5">
          {categories?.map((c) => {
            const active = categoryIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                  active ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-500 hover:border-ink-300'
                }`}
              >
                {c.nameEn}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AuthenticityReviewerDetails({ user, categories }: { user: any; categories: any[] | undefined }) {
  const updateProfile = useUpdateAuthenticityReviewerProfile();
  const categoryIds: string[] = user.authenticityReviewerCategoryIds ?? [];

  const toggleCategory = (categoryId: string) => {
    const next = categoryIds.includes(categoryId)
      ? categoryIds.filter((id) => id !== categoryId)
      : [...categoryIds, categoryId];
    updateProfile.mutate({ id: user.id, categoryIds: next });
  };

  return (
    <div className="mt-3 space-y-3 border-t border-ink-100 pt-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-600">Authenticity review categories</label>
        <div className="flex flex-wrap gap-1.5">
          {categories?.map((c) => {
            const active = categoryIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                  active ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-500 hover:border-ink-300'
                }`}
              >
                {c.nameEn}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAdminUsers(search) as { data: any; isLoading: boolean };
  const { data: categories } = useCategories();
  const updateRoles = useUpdateUserRoles();
  const toggleStatus = useToggleUserStatus();

  return (
    <div>
      <input
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="focus-ring w-full max-w-sm rounded-lg border border-ink-100 px-3 py-2 text-sm"
      />

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {data?.items.map((u: any) => {
          const isEvaluator = u.roles.includes('EXPERT_EVALUATOR');
          const isPreliminaryReviewer = u.roles.includes('PRELIMINARY_REVIEWER');
          const isAuthenticityReviewer = u.roles.includes('AUTHENTICITY_REVIEWER');
          return (
            <div key={u.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-ink-800">{u.fullName}</p>
                  {isEvaluator && (u.designation || u.institution) && (
                    <p className="text-xs text-ink-500">
                      {[u.designation, u.institution].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-ink-500">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                  {isEvaluator && (
                    <p className="mt-0.5 text-xs font-medium text-brand-700">
                      {(u.evaluatorCategoryIds ?? []).length
                        ? (categories ?? [])
                            .filter((c) => u.evaluatorCategoryIds.includes(c.id))
                            .map((c) => c.nameEn)
                            .join(', ')
                        : 'No category set'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleStatus.mutate({ id: u.id, isActive: !u.isActive })}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.isActive ? 'bg-brand-100 text-brand-700' : 'bg-red-50 text-red-600'}`}
                >
                  {u.isActive ? 'Active' : 'Deactivated'}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ALL_ROLES.map((role) => {
                  const has = u.roles.includes(role);
                  return (
                    <button
                      key={role}
                      onClick={() => {
                        const nextRoles = has ? u.roles.filter((r: string) => r !== role) : [...u.roles, role];
                        updateRoles.mutate({ id: u.id, roles: nextRoles });
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                        has ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-ink-100 text-ink-500 hover:border-ink-300'
                      }`}
                    >
                      {ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
                    </button>
                  );
                })}
              </div>
              {isEvaluator && <EvaluatorDetails user={u} categories={categories} />}
              {isPreliminaryReviewer && <PreliminaryReviewerDetails user={u} categories={categories} />}
              {isAuthenticityReviewer && <AuthenticityReviewerDetails user={u} categories={categories} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoriesTab() {
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const toggleCategory = useToggleCategory();
  const [form, setForm] = useState({ nameEn: '', nameBn: '', slug: '', icon: 'sparkles', descriptionEn: '' });

  return (
    <div>
      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
        <h2 className="font-display text-base font-bold text-ink-900">Add a category</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input placeholder="Name (English)" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })} className="focus-ring rounded-lg border border-ink-100 px-3 py-2 text-sm" />
          <input placeholder="Name (Bangla)" value={form.nameBn} onChange={(e) => setForm({ ...form, nameBn: e.target.value })} className="focus-ring rounded-lg border border-ink-100 px-3 py-2 text-sm" />
          <input placeholder="Description" value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} className="focus-ring rounded-lg border border-ink-100 px-3 py-2 text-sm sm:col-span-2" />
        </div>
        <button
          disabled={!form.nameEn || !form.nameBn || createCategory.isPending}
          onClick={() => createCategory.mutate({ ...form, examplesEn: '' })}
          className="focus-ring mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Add category
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {categories?.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium text-ink-800">
              <CategoryIcon name={c.icon} className="h-4 w-4 text-brand-600" /> {c.nameEn}
            </span>
            <button
              onClick={() => toggleCategory.mutate({ id: c.id, isActive: false })}
              className="text-xs font-semibold text-ink-400 hover:text-red-600"
            >
              Deactivate
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const EMPTY_NEWS_FORM = { slug: '', titleEn: '', titleBn: '', bodyEn: '', bodyBn: '', category: '', coverImageUrl: '' };

function NewsFormFields({ form, setForm }: { form: typeof EMPTY_NEWS_FORM; setForm: (form: typeof EMPTY_NEWS_FORM) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input placeholder="Slug (url-friendly)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputCls} />
      <input placeholder="Category (optional)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} />
      <input placeholder="Title (English)" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className={inputCls} />
      <input placeholder="Title (Bangla)" value={form.titleBn} onChange={(e) => setForm({ ...form, titleBn: e.target.value })} className={inputCls} />
      <ImageUploadField value={form.coverImageUrl} onChange={(url) => setForm({ ...form, coverImageUrl: url })} />
      <textarea placeholder="Body (English)" value={form.bodyEn} onChange={(e) => setForm({ ...form, bodyEn: e.target.value })} className={`${inputCls} sm:col-span-2`} rows={4} />
      <textarea placeholder="Body (Bangla)" value={form.bodyBn} onChange={(e) => setForm({ ...form, bodyBn: e.target.value })} className={`${inputCls} sm:col-span-2`} rows={4} />
    </div>
  );
}

function NewsTab() {
  const { data: news, isLoading } = useAdminNews() as { data: any[]; isLoading: boolean };
  const createNews = useCreateNews();
  const updateNews = useUpdateNews();
  const deleteNews = useDeleteNews();
  const [form, setForm] = useState(EMPTY_NEWS_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_NEWS_FORM);

  const startEdit = (n: any) => {
    setEditingId(n.id);
    setEditForm({
      slug: n.slug,
      titleEn: n.titleEn,
      titleBn: n.titleBn ?? '',
      bodyEn: n.bodyEn,
      bodyBn: n.bodyBn ?? '',
      category: n.category ?? '',
      coverImageUrl: n.coverImageUrl ?? '',
    });
  };

  return (
    <div>
      <Panel title="Publish a news / event post">
        <div className="mt-3">
          <NewsFormFields form={form} setForm={setForm} />
        </div>
        <AddButton
          disabled={!form.slug || !form.titleEn || !form.bodyEn || createNews.isPending}
          onClick={() => createNews.mutate(form, { onSuccess: () => setForm(EMPTY_NEWS_FORM) })}
          label="Publish"
        />
      </Panel>

      <div className="mt-6 space-y-2">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {news?.map((n) =>
          editingId === n.id ? (
            <div key={n.id} className="rounded-xl border border-brand-300 bg-white p-4">
              <NewsFormFields form={editForm} setForm={setEditForm} />
              {updateNews.isError && (
                <p className="mt-2 text-xs text-red-600">
                  {(updateNews.error as any)?.message ?? 'Could not save changes — try again.'}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  disabled={!editForm.slug || !editForm.titleEn || !editForm.bodyEn || updateNews.isPending}
                  onClick={() =>
                    updateNews.mutate(
                      { id: n.id, ...editForm },
                      { onSuccess: () => setEditingId(null) },
                    )
                  }
                  className="focus-ring rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {updateNews.isPending ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditingId(null)} className="focus-ring rounded-lg border border-ink-100 px-4 py-2 text-sm font-semibold text-ink-600">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={n.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-ink-800">{n.titleEn}</p>
                <p className="text-xs text-ink-500">/{n.slug} · {n.publishedAt ? 'Published' : 'Unpublished'}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => startEdit(n)} className="text-xs font-semibold text-brand-600 hover:text-brand-800">
                  Edit
                </button>
                <button
                  onClick={() => updateNews.mutate({ id: n.id, unpublish: !!n.publishedAt })}
                  className="text-xs font-semibold text-ink-400 hover:text-brand-700"
                >
                  {n.publishedAt ? 'Unpublish' : 'Republish'}
                </button>
                <button onClick={() => deleteNews.mutate(n.id)} className="text-xs font-semibold text-ink-400 hover:text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

type TimelinePhaseInput = { label: string; date: string; description: string };
type FaqInput = { question: string; answer: string };
type ResourceInput = { label: string; url: string };

/** Optional details-page text fields (2026-11-11) — shown on /challenges/[slug] only when filled. */
const DETAIL_TEXT_KEYS = [
  'titleBn', 'descriptionBn',
  'problemStatementEn', 'problemStatementBn', 'eligibilityEn', 'eligibilityBn',
  'evaluationCriteriaEn', 'evaluationCriteriaBn', 'prizeDetailsEn', 'prizeDetailsBn',
  'additionalInfoEn', 'additionalInfoBn', 'contactName', 'contactEmail', 'contactPhone',
] as const;
type DetailTextKey = (typeof DETAIL_TEXT_KEYS)[number];

type ChallengeForm = {
  slug: string; titleEn: string; organizingAgency: string; categoryId: string; descriptionEn: string;
  startDate: string; deadline: string; bannerImageUrl: string; prizeInfoEn: string; applyUrl: string;
  timelinePhases: TimelinePhaseInput[]; faqs: FaqInput[]; resources: ResourceInput[];
} & Record<DetailTextKey, string>;

const EMPTY_CHALLENGE_FORM: ChallengeForm = {
  slug: '', titleEn: '', organizingAgency: '', categoryId: '', descriptionEn: '', startDate: '', deadline: '', bannerImageUrl: '', prizeInfoEn: '', applyUrl: '',
  ...(Object.fromEntries(DETAIL_TEXT_KEYS.map((k) => [k, ''])) as Record<DetailTextKey, string>),
  timelinePhases: [], faqs: [], resources: [],
};

/** Existing challenge → edit form state (nullable strings become '', missing lists become []). */
function challengeToForm(c: any): ChallengeForm {
  return {
    slug: c.slug,
    titleEn: c.titleEn,
    organizingAgency: c.organizingAgency,
    categoryId: c.categoryId ?? '',
    descriptionEn: c.descriptionEn,
    startDate: c.startDate ? c.startDate.slice(0, 10) : '',
    deadline: c.deadline ? c.deadline.slice(0, 10) : '',
    bannerImageUrl: c.bannerImageUrl ?? '',
    prizeInfoEn: c.prizeInfoEn ?? '',
    applyUrl: c.applyUrl ?? '',
    ...(Object.fromEntries(DETAIL_TEXT_KEYS.map((k) => [k, c[k] ?? ''])) as Record<DetailTextKey, string>),
    timelinePhases: (c.timelinePhases ?? []).map((p: any) => ({ label: p.label ?? '', date: p.date ?? '', description: p.description ?? '' })),
    faqs: (c.faqs ?? []).map((f: any) => ({ question: f.question ?? '', answer: f.answer ?? '' })),
    resources: (c.resources ?? []).map((r: any) => ({ label: r.label ?? '', url: r.url ?? '' })),
  };
}

/** Form state → API body. Half-filled list rows are dropped rather than failing validation. */
function challengeFormToPayload(form: ChallengeForm) {
  return {
    ...form,
    timelinePhases: form.timelinePhases.filter((p) => p.label.trim()),
    faqs: form.faqs.filter((f) => f.question.trim() && f.answer.trim()),
    resources: form.resources.filter((r) => r.label.trim() && r.url.trim()),
  };
}

function formatChallengeDate(value?: string) {
  return value ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : null;
}

function ChallengeFormFields({ form, setForm }: { form: ChallengeForm; setForm: (form: ChallengeForm) => void }) {
  const { data: categories } = useCategories();
  return (
    <>
    <div className="grid gap-3 sm:grid-cols-2">
      <input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputCls} />
      <input placeholder="Organizing agency" value={form.organizingAgency} onChange={(e) => setForm({ ...form, organizingAgency: e.target.value })} className={inputCls} />
      <input placeholder="Title (English)" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className={`${inputCls} sm:col-span-2`} />
      <textarea placeholder="Description (English)" value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} className={`${inputCls} sm:col-span-2`} rows={3} />
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-ink-500">
          Category — routes this challenge&apos;s submissions to the matching Preliminary/Authenticity reviewers (required to enable submissions)
        </span>
        <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={`${inputCls} w-full bg-white`}>
          <option value="">— No category —</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.nameEn}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-500">Start date</span>
        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={`${inputCls} w-full`} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-500">End date (deadline)</span>
        <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={`${inputCls} w-full`} />
      </label>
      <ImageUploadField
        value={form.bannerImageUrl}
        onChange={(url) => setForm({ ...form, bannerImageUrl: url })}
        placeholder="Banner image URL (optional)"
      />
      <input placeholder="Prize info (optional)" value={form.prizeInfoEn} onChange={(e) => setForm({ ...form, prizeInfoEn: e.target.value })} className={inputCls} />
      <input placeholder="Apply URL (optional)" value={form.applyUrl} onChange={(e) => setForm({ ...form, applyUrl: e.target.value })} className={`${inputCls} sm:col-span-2`} />
    </div>
    <ChallengeDetailsFields form={form} setForm={setForm} />
    </>
  );
}

const DETAIL_SECTIONS: { en: DetailTextKey; bn: DetailTextKey; label: string; hint: string }[] = [
  { en: 'problemStatementEn', bn: 'problemStatementBn', label: 'The problem', hint: 'Background and the problem innovators should solve' },
  { en: 'eligibilityEn', bn: 'eligibilityBn', label: 'Who can apply', hint: 'Eligibility — e.g. one item per line' },
  { en: 'evaluationCriteriaEn', bn: 'evaluationCriteriaBn', label: 'Evaluation criteria', hint: 'How submissions will be judged' },
  { en: 'prizeDetailsEn', bn: 'prizeDetailsBn', label: 'Prizes & support (details)', hint: 'Prize breakdown, mentoring, pilots… (the short “Prize info” above is the headline)' },
  { en: 'additionalInfoEn', bn: 'additionalInfoBn', label: 'Additional information', hint: 'Anything else' },
];

const smallBtn = 'focus-ring rounded-lg border border-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-ink-300';
const removeBtn = 'focus-ring self-start rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50';

/** Optional sections for the public challenge details page. Empty ones are hidden on the site. */
function ChallengeDetailsFields({ form, setForm }: { form: ChallengeForm; setForm: (form: ChallengeForm) => void }) {
  const upload = useUploadFile();
  const set = (patch: Partial<ChallengeForm>) => setForm({ ...form, ...patch });
  const updateAt = <K extends 'timelinePhases' | 'faqs' | 'resources'>(key: K, i: number, patch: Partial<ChallengeForm[K][number]>) =>
    set({ [key]: form[key].map((row, j) => (j === i ? { ...row, ...patch } : row)) } as Partial<ChallengeForm>);
  const removeAt = (key: 'timelinePhases' | 'faqs' | 'resources', i: number) =>
    set({ [key]: (form[key] as unknown[]).filter((_, j) => j !== i) } as Partial<ChallengeForm>);
  const filled =
    DETAIL_SECTIONS.some((s) => form[s.en]) || form.timelinePhases.length + form.faqs.length + form.resources.length > 0 || Boolean(form.contactEmail);

  return (
    <details className="mt-4 rounded-xl border border-ink-100 bg-ink-50/40 p-4" open={filled || undefined}>
      <summary className="cursor-pointer text-sm font-semibold text-ink-800">
        Details page content <span className="font-normal text-ink-500">— optional; each section appears on the public challenge page only when filled</span>
      </summary>

      <div className="mt-4 space-y-4">
        {DETAIL_SECTIONS.map((s) => (
          <label key={s.en} className="block">
            <span className="mb-1 block text-xs font-medium text-ink-500">{s.label}</span>
            <textarea rows={3} placeholder={s.hint} value={form[s.en]} onChange={(e) => set({ [s.en]: e.target.value } as Partial<ChallengeForm>)} className={`${inputCls} w-full`} />
          </label>
        ))}

        {/* Timeline */}
        <fieldset>
          <legend className="mb-1 text-xs font-medium text-ink-500">Timeline phases (e.g. Submission → Shortlist → Pitch → Award)</legend>
          <div className="space-y-2">
            {form.timelinePhases.map((p, i) => (
              <div key={i} className="flex flex-wrap gap-2 rounded-lg border border-ink-100 bg-white p-2">
                <input aria-label={`Phase ${i + 1} name`} placeholder="Phase name" value={p.label} onChange={(e) => updateAt('timelinePhases', i, { label: e.target.value })} className={`${inputCls} min-w-0 flex-1`} />
                <input aria-label={`Phase ${i + 1} date`} type="date" value={p.date} onChange={(e) => updateAt('timelinePhases', i, { date: e.target.value })} className={`${inputCls} w-full sm:w-auto`} />
                <input aria-label={`Phase ${i + 1} description`} placeholder="Short description (optional)" value={p.description} onChange={(e) => updateAt('timelinePhases', i, { description: e.target.value })} className={`${inputCls} w-full`} />
                <button type="button" onClick={() => removeAt('timelinePhases', i)} className={removeBtn}>Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => set({ timelinePhases: [...form.timelinePhases, { label: '', date: '', description: '' }] })} className={`${smallBtn} mt-2`}>
            + Add phase
          </button>
        </fieldset>

        {/* Resources */}
        <fieldset>
          <legend className="mb-1 text-xs font-medium text-ink-500">Resources — guidelines, templates (upload a file or paste an https:// link)</legend>
          <div className="space-y-2">
            {form.resources.map((r, i) => (
              <div key={i} className="flex flex-wrap gap-2 rounded-lg border border-ink-100 bg-white p-2">
                <input aria-label={`Resource ${i + 1} name`} placeholder="Name, e.g. Guidelines (PDF)" value={r.label} onChange={(e) => updateAt('resources', i, { label: e.target.value })} className={`${inputCls} min-w-0 flex-1`} />
                <input aria-label={`Resource ${i + 1} link`} placeholder="https://… or upload" value={r.url} onChange={(e) => updateAt('resources', i, { url: e.target.value })} className={`${inputCls} min-w-0 flex-1`} />
                <label className={`${smallBtn} cursor-pointer self-center`}>
                  {upload.isPending ? 'Uploading…' : 'Upload'}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      upload.mutate(file, {
                        onSuccess: (data) => updateAt('resources', i, { url: data.url, ...(r.label ? {} : { label: file.name }) }),
                      });
                      e.target.value = '';
                    }}
                  />
                </label>
                <button type="button" onClick={() => removeAt('resources', i)} className={removeBtn}>Remove</button>
              </div>
            ))}
          </div>
          {upload.isError && <p className="mt-1 text-xs text-red-600">Upload failed — PDF, Word, PowerPoint or image, up to 50 MB.</p>}
          <button type="button" onClick={() => set({ resources: [...form.resources, { label: '', url: '' }] })} className={`${smallBtn} mt-2`}>
            + Add resource
          </button>
        </fieldset>

        {/* FAQ */}
        <fieldset>
          <legend className="mb-1 text-xs font-medium text-ink-500">FAQ</legend>
          <div className="space-y-2">
            {form.faqs.map((f, i) => (
              <div key={i} className="flex flex-wrap gap-2 rounded-lg border border-ink-100 bg-white p-2">
                <input aria-label={`Question ${i + 1}`} placeholder="Question" value={f.question} onChange={(e) => updateAt('faqs', i, { question: e.target.value })} className={`${inputCls} w-full`} />
                <textarea aria-label={`Answer ${i + 1}`} rows={2} placeholder="Answer" value={f.answer} onChange={(e) => updateAt('faqs', i, { answer: e.target.value })} className={`${inputCls} min-w-0 flex-1`} />
                <button type="button" onClick={() => removeAt('faqs', i)} className={removeBtn}>Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => set({ faqs: [...form.faqs, { question: '', answer: '' }] })} className={`${smallBtn} mt-2`}>
            + Add question
          </button>
        </fieldset>

        {/* Contact */}
        <fieldset>
          <legend className="mb-1 text-xs font-medium text-ink-500">Contact for questions</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            <input placeholder="Name" value={form.contactName} onChange={(e) => set({ contactName: e.target.value })} className={inputCls} />
            <input type="email" placeholder="Email" value={form.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} className={inputCls} />
            <input placeholder="Phone" value={form.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} className={inputCls} />
          </div>
        </fieldset>

        {/* Bangla */}
        <details className="rounded-lg border border-ink-100 bg-white p-3">
          <summary className="cursor-pointer text-xs font-semibold text-ink-700">
            বাংলা translations <span className="font-normal text-ink-500">— optional; the Bangla site falls back to English for anything left blank</span>
          </summary>
          <div className="mt-3 space-y-3">
            <input placeholder="Title (Bangla)" value={form.titleBn} onChange={(e) => set({ titleBn: e.target.value })} className={`${inputCls} w-full`} />
            <textarea rows={3} placeholder="Description (Bangla)" value={form.descriptionBn} onChange={(e) => set({ descriptionBn: e.target.value })} className={`${inputCls} w-full`} />
            {DETAIL_SECTIONS.map((s) => (
              <textarea key={s.bn} rows={2} placeholder={`${s.label} (Bangla)`} value={form[s.bn]} onChange={(e) => set({ [s.bn]: e.target.value } as Partial<ChallengeForm>)} className={`${inputCls} w-full`} />
            ))}
          </div>
        </details>
      </div>
    </details>
  );
}

/** A labelled on/off pill button for one of a challenge's switches. */
function SwitchButton({ on, onLabel, offLabel, onClick, disabled }: { on: boolean; onLabel: string; offLabel: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      disabled={disabled}
      className={`focus-ring inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
        on ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-red-200 bg-red-50 text-red-600 hover:border-red-300'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${on ? 'bg-brand-500' : 'bg-red-500'}`} />
      {on ? onLabel : offLabel}
    </button>
  );
}

function ChallengesTab() {
  const { data: challenges, isLoading } = useAdminChallenges() as { data: any[]; isLoading: boolean };
  const createChallenge = useCreateChallenge();
  const updateChallenge = useUpdateChallenge();
  const deleteChallenge = useDeleteChallenge();
  const [form, setForm] = useState(EMPTY_CHALLENGE_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_CHALLENGE_FORM);
  const [builderId, setBuilderId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setEditForm(challengeToForm(c));
  };

  // Every switch/delete on a row reports its own error inline (e.g. enabling submissions without a
  // category, or deleting a challenge that already has submissions).
  const onRowError = (id: string) => (err: unknown) =>
    setRowError({ id, message: err instanceof ApiError ? err.message : 'Something went wrong' });
  const toggle = (c: any, patch: Record<string, unknown>) => {
    setRowError(null);
    updateChallenge.mutate({ id: c.id, ...patch }, { onError: onRowError(c.id) });
  };

  return (
    <div>
      <Panel title="Create a new challenge">
        <p className="mt-1 text-xs text-ink-500">
          New challenges start <b>unpublished</b>. Build and preview the submission form, then publish the challenge and enable submissions.
        </p>
        <div className="mt-3">
          <ChallengeFormFields form={form} setForm={setForm} />
        </div>
        <AddButton
          disabled={!form.slug || !form.titleEn || !form.organizingAgency || !form.descriptionEn || createChallenge.isPending}
          onClick={() =>
            createChallenge.mutate(
              { ...challengeFormToPayload(form), categoryId: form.categoryId || undefined, isPublished: false },
              { onSuccess: () => setForm(EMPTY_CHALLENGE_FORM) },
            )
          }
          label="Create challenge"
        />
        {createChallenge.isError && (
          <p className="mt-2 text-xs text-red-600">{createChallenge.error instanceof ApiError ? createChallenge.error.message : 'Could not create the challenge'}</p>
        )}
      </Panel>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {challenges?.map((c) =>
          editingId === c.id ? (
            <div key={c.id} className="rounded-xl border border-brand-300 bg-white p-4">
              <ChallengeFormFields form={editForm} setForm={setEditForm} />
              <div className="mt-3 flex gap-2">
                <button
                  disabled={updateChallenge.isPending}
                  onClick={() =>
                    updateChallenge.mutate(
                      { id: c.id, ...challengeFormToPayload(editForm) },
                      { onSuccess: () => setEditingId(null), onError: onRowError(c.id) },
                    )
                  }
                  className="focus-ring rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Save
                </button>
                <button onClick={() => setEditingId(null)} className="focus-ring rounded-lg border border-ink-100 px-4 py-2 text-sm font-semibold text-ink-600">
                  Cancel
                </button>
              </div>
              {rowError && rowError.id === c.id && <p className="mt-2 text-xs text-red-600">{rowError.message}</p>}
            </div>
          ) : (
            <div key={c.id} className="space-y-3">
              <div className="rounded-xl border border-ink-100 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {c.bannerImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.bannerImageUrl} alt="" className="h-10 w-16 shrink-0 rounded-md border border-ink-100 object-cover" />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-ink-800">{c.titleEn}</p>
                        {c.isFeatured && (
                          <span className="shrink-0 rounded-full bg-sun-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sun-600">Featured</span>
                        )}
                        <span
                          title={c.closedReason ?? undefined}
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            c.acceptingSubmissions ? 'bg-brand-100 text-brand-700' : 'bg-ink-50 text-ink-500'
                          }`}
                        >
                          {c.acceptingSubmissions ? 'Accepting submissions' : 'Not accepting'}
                        </span>
                      </div>
                      <p className="text-xs text-ink-500">{c.organizingAgency}</p>
                      {(c.startDate || c.deadline) && (
                        <p className="text-xs text-ink-400">
                          {formatChallengeDate(c.startDate) ?? '—'} → {formatChallengeDate(c.deadline) ?? '—'}
                        </p>
                      )}
                      {!c.acceptingSubmissions && c.closedReason && <p className="text-xs text-ink-400">{c.closedReason}</p>}
                    </div>
                  </div>
                  <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">
                    <button
                      type="button"
                      onClick={() => toggle(c, { isFeatured: !c.isFeatured })}
                      aria-pressed={c.isFeatured}
                      aria-label={c.isFeatured ? 'Unset as featured challenge' : 'Set as featured challenge'}
                      title={c.isFeatured ? 'Featured — click to unset' : 'Mark as featured challenge'}
                      className="focus-ring rounded-full p-1.5 text-ink-300 transition hover:text-sun-500"
                    >
                      <Star className={c.isFeatured ? 'h-4 w-4 fill-sun-500 text-sun-500' : 'h-4 w-4'} />
                    </button>
                    <select
                      value={c.status}
                      aria-label="Challenge status"
                      onChange={(e) => toggle(c, { status: e.target.value })}
                      className="rounded-lg border border-ink-100 bg-white px-2 py-1 text-xs"
                    >
                      {Object.values(ChallengeStatus).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button onClick={() => startEdit(c)} className="text-xs font-semibold text-brand-600 hover:text-brand-800">
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setRowError(null);
                        deleteChallenge.mutate(c.id, { onError: onRowError(c.id) });
                      }}
                      className="text-xs font-semibold text-ink-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                  <SwitchButton on={c.isPublished} onLabel="Published" offLabel="Unpublished" onClick={() => toggle(c, { isPublished: !c.isPublished })} />
                  <SwitchButton on={c.isActive} onLabel="Active" offLabel="Inactive" onClick={() => toggle(c, { isActive: !c.isActive })} />
                  <SwitchButton
                    on={c.submissionsEnabled}
                    onLabel="Submissions enabled"
                    offLabel="Submissions disabled"
                    onClick={() => toggle(c, { submissionsEnabled: !c.submissionsEnabled })}
                  />
                  <span className="mx-1 hidden h-4 w-px bg-ink-100 sm:block" />
                  <button
                    type="button"
                    onClick={() => setBuilderId(builderId === c.id ? null : c.id)}
                    aria-expanded={builderId === c.id}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
                  >
                    <ListChecks className="h-3.5 w-3.5" /> Submission form ({c.formFieldCount ?? 0} field{c.formFieldCount === 1 ? '' : 's'})
                  </button>
                  <Link
                    href={`/dashboard/admin/submissions?challengeId=${c.id}`}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
                  >
                    <Inbox className="h-3.5 w-3.5" /> {c.submissionCount ?? 0} submission{c.submissionCount === 1 ? '' : 's'}
                  </Link>
                  <Link
                    href={`/challenges/${c.slug}`}
                    className="focus-ring text-xs font-semibold text-brand-600 hover:text-brand-800"
                  >
                    {c.isPublished ? 'View public page' : 'Preview page'}
                  </Link>
                </div>
                {rowError && rowError.id === c.id && <p className="mt-2 text-xs text-red-600">{rowError.message}</p>}
              </div>

              {builderId === c.id && <ChallengeFormBuilder challengeId={c.id} onClose={() => setBuilderId(null)} />}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function ResourcesTab() {
  const { data: resources, isLoading } = useAdminResources() as { data: any[]; isLoading: boolean };
  const createResource = useCreateResource();
  const deleteResource = useDeleteResource();
  const [form, setForm] = useState({ titleEn: '', type: 'GUIDELINE', descriptionEn: '', fileUrl: '', fileType: 'pdf', fileSizeBytes: 0 });

  return (
    <div>
      <Panel title="Add a resource document">
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input placeholder="Title (English)" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className={`${inputCls} sm:col-span-2`} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input placeholder="File type (pdf, docx…)" value={form.fileType} onChange={(e) => setForm({ ...form, fileType: e.target.value })} className={inputCls} />
          <input placeholder="File URL" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} className={`${inputCls} sm:col-span-2`} />
          <input type="number" placeholder="File size (bytes)" value={form.fileSizeBytes || ''} onChange={(e) => setForm({ ...form, fileSizeBytes: Number(e.target.value) })} className={inputCls} />
          <input placeholder="Description (optional)" value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} className={inputCls} />
        </div>
        <AddButton
          disabled={!form.titleEn || !form.fileUrl || !form.fileSizeBytes || createResource.isPending}
          onClick={() => createResource.mutate(form, { onSuccess: () => setForm({ titleEn: '', type: 'GUIDELINE', descriptionEn: '', fileUrl: '', fileType: 'pdf', fileSizeBytes: 0 }) })}
          label="Add resource"
        />
      </Panel>

      <div className="mt-6 space-y-2">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {resources?.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-2.5">
            <div>
              <p className="text-sm font-medium text-ink-800">{r.titleEn}</p>
              <p className="text-xs text-ink-500">{r.type} · {r.fileType}</p>
            </div>
            <button onClick={() => deleteResource.mutate(r.id)} className="text-xs font-semibold text-ink-400 hover:text-red-600">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartnersTab() {
  const { data: partners, isLoading } = useAdminPartners() as { data: any[]; isLoading: boolean };
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();
  const deletePartner = useDeletePartner();
  const [form, setForm] = useState({ name: '', logoUrl: '', websiteUrl: '' });

  return (
    <div>
      <Panel title="Add a partner">
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          <input placeholder="Website URL (optional)" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} className={inputCls} />
          <input placeholder="Logo URL" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} className={`${inputCls} sm:col-span-2`} />
        </div>
        <AddButton
          disabled={!form.name || !form.logoUrl || createPartner.isPending}
          onClick={() => createPartner.mutate(form, { onSuccess: () => setForm({ name: '', logoUrl: '', websiteUrl: '' }) })}
          label="Add partner"
        />
      </Panel>

      <div className="mt-6 space-y-2">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {partners?.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-2.5">
            <span className="text-sm font-medium text-ink-800">{p.name}</span>
            <div className="flex gap-3">
              <button
                onClick={() => updatePartner.mutate({ id: p.id, isActive: !p.isActive })}
                className={`text-xs font-semibold ${p.isActive ? 'text-ink-400 hover:text-red-600' : 'text-brand-700'}`}
              >
                {p.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => deletePartner.mutate(p.id)} className="text-xs font-semibold text-ink-400 hover:text-red-600">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqTab() {
  const { data: faqs, isLoading } = useAdminFaqs() as { data: any[]; isLoading: boolean };
  const createFaq = useCreateFaq();
  const updateFaq = useUpdateFaq();
  const deleteFaq = useDeleteFaq();
  const [form, setForm] = useState({ categoryLabel: '', questionEn: '', answerEn: '' });

  return (
    <div>
      <Panel title="Add a FAQ">
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input placeholder="Category label" value={form.categoryLabel} onChange={(e) => setForm({ ...form, categoryLabel: e.target.value })} className={`${inputCls} sm:col-span-2`} />
          <input placeholder="Question (English)" value={form.questionEn} onChange={(e) => setForm({ ...form, questionEn: e.target.value })} className={`${inputCls} sm:col-span-2`} />
          <textarea placeholder="Answer (English)" value={form.answerEn} onChange={(e) => setForm({ ...form, answerEn: e.target.value })} className={`${inputCls} sm:col-span-2`} rows={3} />
        </div>
        <AddButton
          disabled={!form.categoryLabel || !form.questionEn || !form.answerEn || createFaq.isPending}
          onClick={() => createFaq.mutate(form, { onSuccess: () => setForm({ categoryLabel: '', questionEn: '', answerEn: '' }) })}
          label="Add FAQ"
        />
      </Panel>

      <div className="mt-6 space-y-2">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {faqs?.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-2.5">
            <div>
              <p className="text-sm font-medium text-ink-800">{f.questionEn}</p>
              <p className="text-xs text-ink-500">{f.categoryLabel}{!f.isActive ? ' · Inactive' : ''}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => updateFaq.mutate({ id: f.id, isActive: !f.isActive })}
                className={`text-xs font-semibold ${f.isActive ? 'text-ink-400 hover:text-red-600' : 'text-brand-700'}`}
              >
                {f.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => deleteFaq.mutate(f.id)} className="text-xs font-semibold text-ink-400 hover:text-red-600">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = ['users', 'categories', 'news', 'challenges', 'resources', 'partners', 'faq'] as const;

export default function AdminPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('users');

  const panels: Record<(typeof TABS)[number], React.ReactNode> = {
    users: <UsersTab />,
    categories: <CategoriesTab />,
    news: <NewsTab />,
    challenges: <ChallengesTab />,
    resources: <ResourcesTab />,
    partners: <PartnersTab />,
    faq: <FaqTab />,
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Platform administration</h1>
      <div className="mt-5 flex flex-wrap gap-2 border-b border-ink-100">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-semibold capitalize ${
              tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-6">{panels[tab]}</div>
    </div>
  );
}
