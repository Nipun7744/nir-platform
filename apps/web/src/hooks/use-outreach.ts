'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiDownload, toQueryString } from '@/lib/api-client';

/** Admin "Participants & messaging" — GET/POST /admin/outreach/* (see docs/API.md § Outreach). */

export type MessageChannel = 'EMAIL' | 'SMS';
export type BulkStatus = 'QUEUED' | 'SENDING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';
export type RecipientStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface OutreachConfig {
  channels: Record<MessageChannel, boolean>;
  placeholders: string[];
  limits: { subjectMax: number; emailBodyMax: number; smsBodyMax: number; smsMaxSegments: number; maxRecipients: number };
  rate: { emailPerMinute: number; smsPerMinute: number };
  otp: {
    channels: MessageChannel[];
    targets: Record<MessageChannel, string | null>;
    ttlSeconds: number;
    resendSeconds: number;
  };
}

export interface OutreachChallenge {
  id: string;
  slug: string;
  titleEn: string;
  titleBn: string | null;
  status: string;
  deadline: string | null;
  participantCount: number;
}

export interface ParticipantRow {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  irn: string | null;
  locale: string;
  isActive: boolean;
  submissionCount: number;
  lastSubmittedAt: string | null;
}

export interface ParticipantPage {
  challenge: { id: string; slug: string; titleEn: string; titleBn: string | null };
  total: number;
  totalParticipants: number;
  totalSubmissions: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: ParticipantRow[];
}

export interface ComposeInput {
  challengeId: string;
  channel: MessageChannel;
  subject?: string;
  body: string;
}

export interface MessagePreview {
  challenge: { id: string; titleEn: string; titleBn: string | null };
  channel: MessageChannel;
  totalParticipants: number;
  recipientCount: number;
  skippedCount: number;
  skipped: { name: string; address: string; reason: string }[];
  overLimit: boolean;
  maxRecipients: number;
  sample: {
    recipientName: string;
    locale: string;
    subject: string | null;
    body: string;
    sms: { encoding: 'GSM-7' | 'UCS-2'; units: number; segments: number } | null;
  } | null;
  duplicateOf: { id: string; createdAt: string; sentCount: number; createdBy: string } | null;
}

export interface BulkMessageSummary {
  id: string;
  channel: MessageChannel;
  challengeId: string | null;
  challengeTitleEn: string;
  subject: string | null;
  body: string;
  status: BulkStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  pendingCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: { id: string; fullName: string; email: string };
  replayed?: boolean;
}

interface Paged<T> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: T[];
}

const isActive = (s: BulkStatus) => s === 'QUEUED' || s === 'SENDING';

export function useOutreachConfig() {
  return useQuery({ queryKey: ['outreach', 'config'], queryFn: () => api.get<OutreachConfig>('/admin/outreach/config') });
}

export function useOutreachChallenges() {
  return useQuery({ queryKey: ['outreach', 'challenges'], queryFn: () => api.get<OutreachChallenge[]>('/admin/outreach/challenges') });
}

export function useParticipants(challengeId: string, q: string, page: number) {
  return useQuery({
    queryKey: ['outreach', 'participants', challengeId, q, page],
    queryFn: () =>
      api.get<ParticipantPage>(`/admin/outreach/challenges/${challengeId}/participants${toQueryString({ q, page, pageSize: 10 })}`),
    enabled: Boolean(challengeId),
    placeholderData: (prev) => prev,
  });
}

export function useExportParticipants() {
  return useMutation({
    mutationFn: ({ challengeId, lang }: { challengeId: string; lang: 'en' | 'bn' }) =>
      apiDownload(`/admin/outreach/challenges/${challengeId}/participants/export?lang=${lang}`, 'nir-participants.xlsx'),
  });
}

export function usePreviewMessage() {
  return useMutation({ mutationFn: (input: ComposeInput) => api.post<MessagePreview>('/admin/outreach/messages/preview', input) });
}

export function useSendBulkOtp() {
  return useMutation({
    mutationFn: (input: { otpChannel: MessageChannel; locale: string }) =>
      api.post<{ channel: MessageChannel; sentTo: string; expiresInSeconds: number; resendInSeconds: number }>('/admin/outreach/messages/otp', input),
  });
}

export function useSendBulkMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ComposeInput & { otpChannel: MessageChannel; otpCode: string; requestKey: string; allowRepeat?: boolean }) =>
      api.post<BulkMessageSummary>('/admin/outreach/messages', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outreach', 'history'] }),
  });
}

/** History; polls every 3 s while any listed send is still running. */
export function useBulkHistory(challengeId: string, page: number) {
  return useQuery({
    queryKey: ['outreach', 'history', challengeId, page],
    queryFn: () => api.get<Paged<BulkMessageSummary>>(`/admin/outreach/messages${toQueryString({ challengeId, page, pageSize: 10 })}`),
    refetchInterval: (query) => (query.state.data?.items.some((m) => isActive(m.status)) ? 3000 : false),
    placeholderData: (prev) => prev,
  });
}

export function useBulkMessageDetail(id: string | null, status: RecipientStatus | '', page: number) {
  return useQuery({
    queryKey: ['outreach', 'history', 'detail', id, status, page],
    queryFn: () =>
      api.get<{ message: BulkMessageSummary; recipients: Paged<{ id: string; name: string; address: string; status: RecipientStatus; error: string | null; sentAt: string | null }> }>(
        `/admin/outreach/messages/${id}${toQueryString({ status, page, pageSize: 25 })}`,
      ),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data && isActive(query.state.data.message.status) ? 3000 : false),
    placeholderData: (prev) => prev,
  });
}
