import { Injectable, NotFoundException } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Challenge participants = the distinct users who submitted (non-draft) innovations to a challenge
 * (`Innovation.challengeId` + `submittedById`). One user with several submissions is ONE
 * participant: their submissions are aggregated, so exports and bulk messages never list or
 * contact anyone twice. Team members without their own submission are not participants.
 */

export interface ParticipantSubmission {
  id: string;
  innovationCode: string;
  titleEn: string;
  titleBn: string | null;
  categoryEn: string | null;
  categoryBn: string | null;
  reviewStatus: string;
  submittedAt: Date | null;
}

export interface Participant {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  locale: string;
  irn: string | null;
  designation: string | null;
  institution: string | null;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  registeredAt: Date;
  submissions: ParticipantSubmission[];
  firstSubmittedAt: Date | null;
  lastSubmittedAt: Date | null;
}

export interface ChallengeRef {
  id: string;
  slug: string;
  titleEn: string;
  titleBn: string | null;
}

const HEADERS = {
  en: {
    participants: 'Participants',
    submissions: 'Submissions',
    info: 'Export info',
    sl: 'SL',
    name: 'Full name',
    email: 'Email',
    phone: 'Mobile',
    irn: 'Innovator ID (IRN)',
    designation: 'Designation',
    institution: 'Institution',
    language: 'Preferred language',
    emailVerified: 'Email verified',
    phoneVerified: 'Mobile verified',
    account: 'Account status',
    registered: 'Registered on',
    count: 'Submissions',
    codes: 'NIR codes',
    titles: 'Innovation titles',
    latestStatus: 'Latest status',
    first: 'First submitted',
    last: 'Last submitted',
    code: 'NIR code',
    titleEn: 'Title (English)',
    titleBn: 'Title (Bangla)',
    category: 'Category',
    status: 'Status',
    submitted: 'Submitted',
    yes: 'Yes',
    no: 'No',
    active: 'Active',
    inactive: 'Inactive',
    english: 'English',
    bangla: 'Bangla',
    challenge: 'Challenge',
    challengeBn: 'Challenge (Bangla)',
    exportedAt: 'Exported at',
    exportedBy: 'Exported by',
    totalParticipants: 'Participants (unique users)',
    totalSubmissions: 'Submissions (excluding drafts)',
    note: 'Note',
    noteText: 'One row per participant on the Participants sheet; a participant with several submissions is listed once. Drafts are excluded. All times are Bangladesh time (UTC+6).',
  },
  bn: {
    participants: 'অংশগ্রহণকারী',
    submissions: 'জমা',
    info: 'এক্সপোর্ট তথ্য',
    sl: 'ক্রম',
    name: 'পূর্ণ নাম',
    email: 'ইমেইল',
    phone: 'মোবাইল',
    irn: 'উদ্ভাবক আইডি (IRN)',
    designation: 'পদবি',
    institution: 'প্রতিষ্ঠান',
    language: 'পছন্দের ভাষা',
    emailVerified: 'ইমেইল যাচাইকৃত',
    phoneVerified: 'মোবাইল যাচাইকৃত',
    account: 'অ্যাকাউন্টের অবস্থা',
    registered: 'নিবন্ধনের তারিখ',
    count: 'জমার সংখ্যা',
    codes: 'NIR কোড',
    titles: 'উদ্ভাবনের শিরোনাম',
    latestStatus: 'সর্বশেষ অবস্থা',
    first: 'প্রথম জমা',
    last: 'সর্বশেষ জমা',
    code: 'NIR কোড',
    titleEn: 'শিরোনাম (ইংরেজি)',
    titleBn: 'শিরোনাম (বাংলা)',
    category: 'ক্যাটাগরি',
    status: 'অবস্থা',
    submitted: 'জমার তারিখ',
    yes: 'হ্যাঁ',
    no: 'না',
    active: 'সক্রিয়',
    inactive: 'নিষ্ক্রিয়',
    english: 'ইংরেজি',
    bangla: 'বাংলা',
    challenge: 'চ্যালেঞ্জ',
    challengeBn: 'চ্যালেঞ্জ (বাংলা)',
    exportedAt: 'এক্সপোর্টের সময়',
    exportedBy: 'এক্সপোর্ট করেছেন',
    totalParticipants: 'অংশগ্রহণকারী (স্বতন্ত্র ব্যবহারকারী)',
    totalSubmissions: 'জমা (খসড়া বাদে)',
    note: 'নোট',
    noteText: 'অংশগ্রহণকারী শিটে প্রত্যেক অংশগ্রহণকারী একবারই আছেন; একাধিক জমা থাকলেও একটি সারি। খসড়া বাদ দেওয়া হয়েছে। সব সময় বাংলাদেশ সময় (UTC+6)।',
  },
} as const;

const BRAND_GREEN = 'FF007A4E';
const DATE_FMT = 'yyyy-mm-dd hh:mm';
/** Excel dates have no time zone and ExcelJS writes the UTC fields, so shift to Bangladesh time (UTC+6, no DST). */
const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
const bdTime = (d: Date | null | undefined) => (d ? new Date(d.getTime() + BD_OFFSET_MS) : null);

@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getChallenge(challengeId: string): Promise<ChallengeRef> {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true, slug: true, titleEn: true, titleBn: true },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');
    return challenge;
  }

  /** Challenges with their unique-participant counts (for the admin selector). */
  async listChallenges() {
    const [challenges, pairs] = await Promise.all([
      this.prisma.challenge.findMany({
        select: { id: true, slug: true, titleEn: true, titleBn: true, status: true, deadline: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.innovation.groupBy({
        by: ['challengeId', 'submittedById'],
        where: { challengeId: { not: null }, reviewStatus: { not: 'DRAFT' } },
      }),
    ]);
    const counts = new Map<string, number>();
    for (const p of pairs) counts.set(p.challengeId!, (counts.get(p.challengeId!) ?? 0) + 1);
    return challenges.map((c) => ({ ...c, participantCount: counts.get(c.id) ?? 0 }));
  }

  /** De-duplicated participants of one challenge, ordered by first submission. */
  async getParticipants(challengeId: string): Promise<Participant[]> {
    const innovations = await this.prisma.innovation.findMany({
      where: { challengeId, reviewStatus: { not: 'DRAFT' } },
      select: {
        id: true,
        innovationCode: true,
        titleEn: true,
        titleBn: true,
        reviewStatus: true,
        submittedAt: true,
        createdAt: true,
        submittedById: true,
        category: { select: { nameEn: true, nameBn: true } },
      },
      orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
    });
    if (!innovations.length) return [];

    // submittedById has no formal relation on Innovation (see schema), so join users by hand.
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(innovations.map((i) => i.submittedById))] } },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        locale: true,
        designation: true,
        institution: true,
        isActive: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        createdAt: true,
        innovatorProfile: { select: { irn: true } },
      },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    const byUser = new Map<string, Participant>();
    for (const i of innovations) {
      const u = userById.get(i.submittedById);
      if (!u) continue; // submitter deleted — nothing to export or contact
      let p = byUser.get(u.id);
      if (!p) {
        p = {
          userId: u.id,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          locale: u.locale,
          irn: u.innovatorProfile?.irn ?? null,
          designation: u.designation,
          institution: u.institution,
          isActive: u.isActive,
          emailVerifiedAt: u.emailVerifiedAt,
          phoneVerifiedAt: u.phoneVerifiedAt,
          registeredAt: u.createdAt,
          submissions: [],
          firstSubmittedAt: null,
          lastSubmittedAt: null,
        };
        byUser.set(u.id, p);
      }
      const when = i.submittedAt ?? i.createdAt;
      p.submissions.push({
        id: i.id,
        innovationCode: i.innovationCode,
        titleEn: i.titleEn,
        titleBn: i.titleBn,
        categoryEn: i.category?.nameEn ?? null,
        categoryBn: i.category?.nameBn ?? null,
        reviewStatus: i.reviewStatus,
        submittedAt: when,
      });
      if (!p.firstSubmittedAt || when < p.firstSubmittedAt) p.firstSubmittedAt = when;
      if (!p.lastSubmittedAt || when > p.lastSubmittedAt) p.lastSubmittedAt = when;
    }
    return [...byUser.values()];
  }

  /** Admin table: paged + searchable view of the same list (search: name, email, phone, IRN). */
  async listParticipants(challengeId: string, q = '', page = 1, pageSize = 20) {
    const challenge = await this.getChallenge(challengeId);
    const all = await this.getParticipants(challengeId);
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? all.filter((p) => [p.fullName, p.email, p.phone ?? '', p.irn ?? ''].some((v) => v.toLowerCase().includes(needle)))
      : all;
    const size = Math.min(Math.max(pageSize, 1), 100);
    const totalPages = Math.max(1, Math.ceil(filtered.length / size));
    const current = Math.min(Math.max(page, 1), totalPages);
    return {
      challenge,
      total: filtered.length,
      totalParticipants: all.length,
      totalSubmissions: all.reduce((n, p) => n + p.submissions.length, 0),
      page: current,
      pageSize: size,
      totalPages,
      items: filtered.slice((current - 1) * size, current * size).map((p) => ({
        userId: p.userId,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
        irn: p.irn,
        locale: p.locale,
        isActive: p.isActive,
        submissionCount: p.submissions.length,
        lastSubmittedAt: p.lastSubmittedAt,
      })),
    };
  }

  /** The .xlsx workbook: Participants (one row per user), Submissions (one per innovation), Export info. */
  async exportWorkbook(challengeId: string, lang: 'en' | 'bn', exportedBy: string) {
    const challenge = await this.getChallenge(challengeId);
    const participants = await this.getParticipants(challengeId);
    const h = HEADERS[lang];
    const yesNo = (v: unknown) => (v ? h.yes : h.no);

    const wb = new Workbook();
    wb.creator = 'National Innovation Repository (NIR)';
    wb.created = new Date();

    const styleHeader = (ws: import('exceljs').Worksheet) => {
      const row = ws.getRow(1);
      row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_GREEN } };
      row.alignment = { vertical: 'middle', wrapText: true };
      row.height = 30;
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
    };

    // Sheet 1 — participants (de-duplicated).
    const ps = wb.addWorksheet(h.participants);
    ps.columns = [
      { header: h.sl, key: 'sl', width: 6 },
      { header: h.name, key: 'name', width: 28 },
      { header: h.email, key: 'email', width: 32 },
      { header: h.phone, key: 'phone', width: 18 },
      { header: h.irn, key: 'irn', width: 20 },
      { header: h.designation, key: 'designation', width: 22 },
      { header: h.institution, key: 'institution', width: 28 },
      { header: h.language, key: 'language', width: 14 },
      { header: h.emailVerified, key: 'emailVerified', width: 12 },
      { header: h.phoneVerified, key: 'phoneVerified', width: 12 },
      { header: h.account, key: 'account', width: 12 },
      { header: h.registered, key: 'registered', width: 18, style: { numFmt: DATE_FMT } },
      { header: h.count, key: 'count', width: 12 },
      { header: h.codes, key: 'codes', width: 22 },
      { header: h.titles, key: 'titles', width: 48 },
      { header: h.latestStatus, key: 'latestStatus', width: 18 },
      { header: h.first, key: 'first', width: 18, style: { numFmt: DATE_FMT } },
      { header: h.last, key: 'last', width: 18, style: { numFmt: DATE_FMT } },
    ];
    participants.forEach((p, idx) => {
      const latest = p.submissions[p.submissions.length - 1];
      const title = (s: ParticipantSubmission) => (lang === 'bn' && s.titleBn ? s.titleBn : s.titleEn);
      ps.addRow({
        sl: idx + 1,
        name: p.fullName,
        email: p.email,
        // Text, not a number — keeps the leading +/0 of the mobile number.
        phone: p.phone ?? '',
        irn: p.irn ?? '',
        designation: p.designation ?? '',
        institution: p.institution ?? '',
        language: p.locale === 'bn' ? h.bangla : h.english,
        emailVerified: yesNo(p.emailVerifiedAt),
        phoneVerified: yesNo(p.phoneVerifiedAt),
        account: p.isActive ? h.active : h.inactive,
        registered: bdTime(p.registeredAt),
        count: p.submissions.length,
        codes: p.submissions.map((s) => s.innovationCode).join('\n'),
        titles: p.submissions.map(title).join('\n'),
        latestStatus: latest?.reviewStatus.replace(/_/g, ' ') ?? '',
        first: bdTime(p.firstSubmittedAt),
        last: bdTime(p.lastSubmittedAt),
      });
    });
    ps.getColumn('phone').numFmt = '@';
    ps.getColumn('codes').alignment = { wrapText: true, vertical: 'top' };
    ps.getColumn('titles').alignment = { wrapText: true, vertical: 'top' };
    styleHeader(ps);

    // Sheet 2 — every submission (one row each) with its participant.
    const ss = wb.addWorksheet(h.submissions);
    ss.columns = [
      { header: h.sl, key: 'sl', width: 6 },
      { header: h.code, key: 'code', width: 20 },
      { header: h.titleEn, key: 'titleEn', width: 40 },
      { header: h.titleBn, key: 'titleBn', width: 40 },
      { header: h.category, key: 'category', width: 24 },
      { header: h.status, key: 'status', width: 18 },
      { header: h.submitted, key: 'submitted', width: 18, style: { numFmt: DATE_FMT } },
      { header: h.name, key: 'name', width: 28 },
      { header: h.email, key: 'email', width: 32 },
      { header: h.phone, key: 'phone', width: 18 },
      { header: h.irn, key: 'irn', width: 20 },
    ];
    let n = 0;
    const rows = participants
      .flatMap((p) => p.submissions.map((s) => ({ p, s })))
      .sort((a, b) => (a.s.submittedAt?.getTime() ?? 0) - (b.s.submittedAt?.getTime() ?? 0));
    for (const { p, s } of rows) {
      ss.addRow({
        sl: ++n,
        code: s.innovationCode,
        titleEn: s.titleEn,
        titleBn: s.titleBn ?? '',
        category: (lang === 'bn' ? s.categoryBn || s.categoryEn : s.categoryEn) ?? '',
        status: s.reviewStatus.replace(/_/g, ' '),
        submitted: bdTime(s.submittedAt),
        name: p.fullName,
        email: p.email,
        phone: p.phone ?? '',
        irn: p.irn ?? '',
      });
    }
    ss.getColumn('phone').numFmt = '@';
    styleHeader(ss);

    // Sheet 3 — what this file is.
    const info = wb.addWorksheet(h.info);
    info.columns = [
      { key: 'k', width: 34 },
      { key: 'v', width: 70 },
    ];
    info.addRows([
      { k: h.challenge, v: challenge.titleEn },
      { k: h.challengeBn, v: challenge.titleBn ?? '' },
      { k: h.totalParticipants, v: participants.length },
      { k: h.totalSubmissions, v: rows.length },
      { k: h.exportedAt, v: bdTime(new Date()) },
      { k: h.exportedBy, v: exportedBy },
      { k: h.note, v: h.noteText },
    ]);
    info.getColumn('k').font = { bold: true };
    info.getCell('B5').numFmt = DATE_FMT;
    info.getColumn('v').alignment = { wrapText: true, vertical: 'top' };

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const date = new Date().toISOString().slice(0, 10);
    const safeSlug = challenge.slug.replace(/[^a-z0-9-]/gi, '').slice(0, 60) || 'challenge';
    return {
      buffer,
      filename: `nir-participants-${safeSlug}-${date}.xlsx`,
      participantCount: participants.length,
      submissionCount: rows.length,
      challenge,
    };
  }
}
