'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
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

function NewsTab() {
  const { data: news, isLoading } = useAdminNews() as { data: any[]; isLoading: boolean };
  const createNews = useCreateNews();
  const updateNews = useUpdateNews();
  const deleteNews = useDeleteNews();
  const emptyForm = { slug: '', titleEn: '', titleBn: '', bodyEn: '', bodyBn: '', category: '', coverImageUrl: '' };
  const [form, setForm] = useState(emptyForm);

  return (
    <div>
      <Panel title="Publish a news / event post">
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input placeholder="Slug (url-friendly)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputCls} />
          <input placeholder="Category (optional)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} />
          <input placeholder="Title (English)" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className={inputCls} />
          <input placeholder="Title (Bangla)" value={form.titleBn} onChange={(e) => setForm({ ...form, titleBn: e.target.value })} className={inputCls} />
          <ImageUploadField value={form.coverImageUrl} onChange={(url) => setForm({ ...form, coverImageUrl: url })} />
          <textarea placeholder="Body (English)" value={form.bodyEn} onChange={(e) => setForm({ ...form, bodyEn: e.target.value })} className={`${inputCls} sm:col-span-2`} rows={4} />
          <textarea placeholder="Body (Bangla)" value={form.bodyBn} onChange={(e) => setForm({ ...form, bodyBn: e.target.value })} className={`${inputCls} sm:col-span-2`} rows={4} />
        </div>
        <AddButton
          disabled={!form.slug || !form.titleEn || !form.bodyEn || createNews.isPending}
          onClick={() => createNews.mutate(form, { onSuccess: () => setForm(emptyForm) })}
          label="Publish"
        />
      </Panel>

      <div className="mt-6 space-y-2">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {news?.map((n) => (
          <div key={n.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-2.5">
            <div>
              <p className="text-sm font-medium text-ink-800">{n.titleEn}</p>
              <p className="text-xs text-ink-500">/{n.slug} · {n.publishedAt ? 'Published' : 'Unpublished'}</p>
            </div>
            <div className="flex gap-3">
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
        ))}
      </div>
    </div>
  );
}

const EMPTY_CHALLENGE_FORM = { slug: '', titleEn: '', organizingAgency: '', descriptionEn: '', startDate: '', deadline: '', bannerImageUrl: '', prizeInfoEn: '', applyUrl: '' };

function formatChallengeDate(value?: string) {
  return value ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : null;
}

function ChallengeFormFields({ form, setForm }: { form: typeof EMPTY_CHALLENGE_FORM; setForm: (form: typeof EMPTY_CHALLENGE_FORM) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputCls} />
      <input placeholder="Organizing agency" value={form.organizingAgency} onChange={(e) => setForm({ ...form, organizingAgency: e.target.value })} className={inputCls} />
      <input placeholder="Title (English)" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className={`${inputCls} sm:col-span-2`} />
      <textarea placeholder="Description (English)" value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} className={`${inputCls} sm:col-span-2`} rows={3} />
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

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setEditForm({
      slug: c.slug,
      titleEn: c.titleEn,
      organizingAgency: c.organizingAgency,
      descriptionEn: c.descriptionEn,
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      deadline: c.deadline ? c.deadline.slice(0, 10) : '',
      bannerImageUrl: c.bannerImageUrl ?? '',
      prizeInfoEn: c.prizeInfoEn ?? '',
      applyUrl: c.applyUrl ?? '',
    });
  };

  return (
    <div>
      <Panel title="Open a new challenge">
        <div className="mt-3">
          <ChallengeFormFields form={form} setForm={setForm} />
        </div>
        <AddButton
          disabled={!form.slug || !form.titleEn || !form.organizingAgency || !form.descriptionEn || createChallenge.isPending}
          onClick={() => createChallenge.mutate(form, { onSuccess: () => setForm(EMPTY_CHALLENGE_FORM) })}
          label="Create challenge"
        />
      </Panel>

      <div className="mt-6 space-y-2">
        {isLoading && <p className="text-ink-400">Loading…</p>}
        {challenges?.map((c) =>
          editingId === c.id ? (
            <div key={c.id} className="rounded-xl border border-brand-300 bg-white p-4">
              <ChallengeFormFields form={editForm} setForm={setEditForm} />
              <div className="mt-3 flex gap-2">
                <button
                  disabled={updateChallenge.isPending}
                  onClick={() => updateChallenge.mutate({ id: c.id, ...editForm }, { onSuccess: () => setEditingId(null) })}
                  className="focus-ring rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Save
                </button>
                <button onClick={() => setEditingId(null)} className="focus-ring rounded-lg border border-ink-100 px-4 py-2 text-sm font-semibold text-ink-600">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={c.id} className="flex items-center justify-between gap-4 rounded-xl border border-ink-100 bg-white px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                {c.bannerImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.bannerImageUrl} alt="" className="h-10 w-16 shrink-0 rounded-md border border-ink-100 object-cover" />
                )}
                <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-ink-800">{c.titleEn}</p>
                  {c.isFeatured && (
                    <span className="shrink-0 rounded-full bg-sun-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sun-600">
                      Featured
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-500">{c.organizingAgency}</p>
                {(c.startDate || c.deadline) && (
                  <p className="text-xs text-ink-400">
                    {formatChallengeDate(c.startDate) ?? '—'} → {formatChallengeDate(c.deadline) ?? '—'}
                  </p>
                )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateChallenge.mutate({ id: c.id, isFeatured: !c.isFeatured })}
                  aria-pressed={c.isFeatured}
                  aria-label={c.isFeatured ? 'Unset as featured challenge' : 'Set as featured challenge'}
                  title={c.isFeatured ? 'Featured — click to unset' : 'Mark as featured challenge'}
                  className="focus-ring rounded-full p-1.5 text-ink-300 transition hover:text-sun-500"
                >
                  <Star className={c.isFeatured ? 'h-4 w-4 fill-sun-500 text-sun-500' : 'h-4 w-4'} />
                </button>
                <select
                  value={c.status}
                  onChange={(e) => updateChallenge.mutate({ id: c.id, status: e.target.value })}
                  className="rounded-lg border border-ink-100 bg-white px-2 py-1 text-xs"
                >
                  {Object.values(ChallengeStatus).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button onClick={() => startEdit(c)} className="text-xs font-semibold text-brand-600 hover:text-brand-800">
                  Edit
                </button>
                <button onClick={() => deleteChallenge.mutate(c.id)} className="text-xs font-semibold text-ink-400 hover:text-red-600">
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
