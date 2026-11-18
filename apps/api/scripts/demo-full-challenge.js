/* eslint-disable no-console */
/**
 * Creates (or refreshes) a fully populated DEMO challenge — every details-page section, Bangla
 * text, a banner, attachments, and a submission form using every field type plus conditional
 * fields — then exercises it end to end against the running local API and prints PASS/FAIL.
 *
 * Nothing is deleted: the challenge and the submissions made by the test are kept on purpose so
 * they can be inspected in the UI afterwards. Re-running updates the challenge in place and adds
 * two more submissions.
 *
 * Run (API must be running on :4000, seeded demo accounts, password Password123!):
 *   cd apps/api && node scripts/demo-full-challenge.js
 */
const zlib = require('zlib');
const { PrismaClient } = require('@prisma/client');

const API = process.env.NIR_API_URL ?? 'http://localhost:4000/api/v1';
const PASSWORD = process.env.NIR_TEST_PASSWORD ?? 'Password123!';
const SLUG = 'demo-smart-bangladesh-innovation-challenge-2026';
const prisma = new PrismaClient();

// ------------------------------------------------------------------------------------- helpers
async function call(method, path, { token, body, form } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(form ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

async function login(email) {
  const r = await call('POST', '/auth/login', {
    body: { email, password: PASSWORD, captchaToken: process.env.NIR_CAPTCHA_TOKEN ?? 'XXXX.DUMMY.TOKEN.XXXX' },
  });
  const token = r.body?.accessToken ?? r.body?.tokens?.accessToken;
  if (!token) throw new Error(`login ${email} failed: ${JSON.stringify(r.body)}`);
  return token;
}

/** A real (tiny) PNG: horizontal gradient, w×h. */
function makePng(w, h, [r1, g1, b1], [r2, g2, b2]) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const t = x / (w - 1);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = Math.round(r1 + (r2 - r1) * t);
      raw[o + 1] = Math.round(g1 + (g2 - g1) * t);
      raw[o + 2] = Math.round(b1 + (b2 - b1) * t);
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A minimal valid one-page PDF with a line of text. */
function makePdf(text) {
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    null,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const stream = `BT /F1 18 Tf 60 780 Td (${text.replace(/[()\\]/g, '')}) Tj ET`;
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { out += `${String(o).padStart(10, '0')} 00000 n \n`; });
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

async function upload(token, buf, name, mime) {
  const form = new FormData();
  form.append('file', new Blob([buf], { type: mime }), name);
  const r = await call('POST', '/uploads', { token, form });
  if (r.status !== 201) throw new Error(`upload ${name}: ${r.status} ${JSON.stringify(r.body)}`);
  return { url: r.body.url, name: r.body.originalName, mimeType: r.body.mimeType };
}

let pass = 0;
let fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail !== undefined ? `\n        ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}
const sameSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

// ---------------------------------------------------------------------------------- demo data
const DETAILS = {
  titleEn: 'Smart Bangladesh Innovation Challenge 2026 (Demo)',
  titleBn: 'স্মার্ট বাংলাদেশ উদ্ভাবন চ্যালেঞ্জ ২০২৬ (ডেমো)',
  organizingAgency: 'Aspire to Innovate (a2i), ICT Division',
  organizingAgencyBn: 'এসপায়ার টু ইনোভেট (এটুআই), আইসিটি বিভাগ',
  descriptionEn:
    'A nationwide call for citizen-centric innovations that make public services faster, cheaper and easier to reach — in agriculture, health, education and climate resilience. Shortlisted teams receive seed funding, mentoring and a government pilot site.',
  descriptionBn:
    'নাগরিককেন্দ্রিক উদ্ভাবনের জন্য দেশব্যাপী আহ্বান — কৃষি, স্বাস্থ্য, শিক্ষা ও জলবায়ু সহনশীলতায় সরকারি সেবা দ্রুত, সাশ্রয়ী ও সহজলভ্য করতে। নির্বাচিত দলগুলো পাবে প্রাথমিক অর্থায়ন, মেন্টরিং এবং সরকারি পাইলট সাইট।',
  prizeInfoEn: 'BDT 50 lakh total prize pool',
  prizeInfoBn: 'মোট ৫০ লক্ষ টাকার পুরস্কার',
  // Configurable details fields (2026-11-18): the standard sections plus a grouped "At a glance" section.
  detailFields: [
    {
      key: 'objective', labelEn: 'Objective', labelBn: 'উদ্দেশ্য', type: 'LONG_TEXT',
      value:
        'Many public services still require several in-person visits, paper forms and long waits. Rural citizens, women and people with disabilities are hit hardest. We are looking for practical, low-cost solutions that can be piloted within six months.',
      valueBn:
        'অনেক সরকারি সেবায় এখনও একাধিকবার সশরীরে যাওয়া, কাগজের ফরম এবং দীর্ঘ অপেক্ষা লাগে। গ্রামের নাগরিক, নারী ও প্রতিবন্ধী ব্যক্তিরা সবচেয়ে বেশি ভোগেন। আমরা ছয় মাসের মধ্যে পাইলট করা যায় এমন বাস্তবসম্মত, স্বল্প-খরচের সমাধান খুঁজছি।',
    },
    {
      key: 'sectors', sectionEn: 'At a glance', sectionBn: 'এক নজরে', labelEn: 'Focus sectors', labelBn: 'অগ্রাধিকার খাত', type: 'CHECKBOX',
      options: [
        { en: 'Agriculture', bn: 'কৃষি' }, { en: 'Health', bn: 'স্বাস্থ্য' }, { en: 'Education', bn: 'শিক্ষা' }, { en: 'Climate resilience', bn: 'জলবায়ু সহনশীলতা' },
      ],
      validation: { required: true, min: 1 },
      value: ['Agriculture', 'Health', 'Education', 'Climate resilience'],
    },
    {
      key: 'team_size', sectionEn: 'At a glance', sectionBn: 'এক নজরে', labelEn: 'Maximum team size', labelBn: 'দলের সর্বোচ্চ সদস্য', type: 'NUMBER',
      validation: { min: 1, max: 10 }, value: '5',
    },
    {
      key: 'stage', sectionEn: 'At a glance', sectionBn: 'এক নজরে', labelEn: 'Solution stage', labelBn: 'সমাধানের পর্যায়', type: 'SELECT',
      options: [{ en: 'Idea', bn: 'ধারণা' }, { en: 'Prototype or pilot', bn: 'প্রোটোটাইপ বা পাইলট' }, { en: 'Scaling', bn: 'সম্প্রসারণ' }],
      value: 'Prototype or pilot',
    },
    {
      key: 'eligibility', labelEn: 'Who can apply', labelBn: 'কারা আবেদন করতে পারবেন', type: 'LONG_TEXT',
      value:
        '• Bangladeshi citizens aged 18+, applying alone or as a team of up to 5\n• Registered organisations (startups, NGOs, academic institutions)\n• Government officials may apply with their office’s consent',
      valueBn:
        '• ১৮ বছর বা তার বেশি বয়সী বাংলাদেশি নাগরিক, একক বা সর্বোচ্চ ৫ জনের দল\n• নিবন্ধিত প্রতিষ্ঠান (স্টার্টআপ, এনজিও, শিক্ষা প্রতিষ্ঠান)\n• সরকারি কর্মকর্তারা নিজ দপ্তরের সম্মতিতে আবেদন করতে পারবেন',
    },
    {
      key: 'evaluation_criteria', labelEn: 'How submissions are evaluated', labelBn: 'মূল্যায়ন পদ্ধতি', type: 'LONG_TEXT',
      value:
        '1. Impact on citizens (30%)\n2. Feasibility and cost (25%)\n3. Innovation / originality (20%)\n4. Scalability across districts (15%)\n5. Team capacity (10%)',
      valueBn:
        '১. নাগরিকের উপর প্রভাব (৩০%)\n২. বাস্তবায়নযোগ্যতা ও ব্যয় (২৫%)\n৩. উদ্ভাবনী মৌলিকত্ব (২০%)\n৪. জেলাব্যাপী সম্প্রসারণযোগ্যতা (১৫%)\n৫. দলের সক্ষমতা (১০%)',
    },
    {
      key: 'prize_details', labelEn: 'Prizes & support', labelBn: 'পুরস্কার ও সহায়তা', type: 'LONG_TEXT',
      value:
        'Winner: BDT 20 lakh + 6-month government pilot\nRunner-up: BDT 15 lakh\nThird place: BDT 10 lakh\nSpecial award (women-led team): BDT 5 lakh',
      valueBn:
        'বিজয়ী: ২০ লক্ষ টাকা + ৬ মাসের সরকারি পাইলট\nদ্বিতীয়: ১৫ লক্ষ টাকা\nতৃতীয়: ১০ লক্ষ টাকা\nবিশেষ পুরস্কার (নারী নেতৃত্বাধীন দল): ৫ লক্ষ টাকা',
    },
    {
      key: 'additional_info', labelEn: 'Additional information', labelBn: 'অতিরিক্ত তথ্য', type: 'LONG_TEXT',
      value:
        'Intellectual property stays with the applicant. Shortlisted applicants will be invited to a two-day bootcamp in Dhaka (travel covered).',
      valueBn:
        'মেধাস্বত্ব আবেদনকারীর কাছেই থাকবে। নির্বাচিত আবেদনকারীদের ঢাকায় দুই দিনের বুটক্যাম্পে আমন্ত্রণ জানানো হবে (যাতায়াত খরচ বহন করা হবে)।',
    },
  ],
  // Contact box (2026-11-18): admin-defined fields only.
  contactFields: [
    { key: 'name', labelEn: 'Name', labelBn: 'নাম', type: 'SHORT_TEXT', value: 'Challenge Secretariat, a2i' },
    { key: 'email', labelEn: 'Email', labelBn: 'ইমেইল', type: 'EMAIL', value: 'challenge-demo@a2i.gov.bd' },
    { key: 'phone', labelEn: 'Phone', labelBn: 'ফোন', type: 'PHONE', value: '+880 2 5500 6931' },
    { key: 'whatsapp', labelEn: 'WhatsApp', labelBn: 'হোয়াটসঅ্যাপ', type: 'PHONE', value: '+880 1700 000000' },
    { key: 'office_hours', labelEn: 'Office hours', labelBn: 'অফিস সময়', type: 'SHORT_TEXT', value: 'Sun–Thu, 9am–5pm', valueBn: 'রবি–বৃহস্পতি, সকাল ৯টা–বিকেল ৫টা' },
  ],
  submitButtonLabelEn: 'Apply to the demo',
  submitButtonLabelBn: 'ডেমোতে আবেদন করুন',
  applyUrl: '',
  status: 'OPEN',
  startDate: '2026-11-01',
  deadline: '2026-12-31',
  isFeatured: false, // leave the site's real featured challenge (and its popup) alone
  isPublished: true,
  isActive: true,
  submissionsEnabled: true,
  timelinePhases: [
    { label: 'Applications open', labelBn: 'আবেদন শুরু', date: '2026-11-01', description: 'Online submission opens.', descriptionBn: 'অনলাইনে আবেদন গ্রহণ শুরু।' },
    { label: 'Applications close', labelBn: 'আবেদনের শেষ দিন', date: '2026-12-31', description: 'Last day to submit.', descriptionBn: 'আবেদনের শেষ তারিখ।' },
    { label: 'Shortlist announced', labelBn: 'সংক্ষিপ্ত তালিকা প্রকাশ', date: '2027-01-20', description: 'Top 30 ideas published.', descriptionBn: 'সেরা ৩০টি ধারণা প্রকাশ।' },
    { label: 'Bootcamp & pitch', labelBn: 'বুটক্যাম্প ও পিচ', date: '2027-02-10', description: 'Two-day bootcamp in Dhaka, then live pitch.', descriptionBn: 'ঢাকায় দুই দিনের বুটক্যাম্প, এরপর সরাসরি উপস্থাপনা।' },
    { label: 'Winners announced', labelBn: 'বিজয়ী ঘোষণা', date: '2027-03-01', description: 'Awards ceremony.', descriptionBn: 'পুরস্কার বিতরণী অনুষ্ঠান।' },
  ],
  faqs: [
    { question: 'Can I submit more than one idea?', questionBn: 'আমি কি একাধিক ধারণা জমা দিতে পারব?', answer: 'Yes — each idea needs its own submission.', answerBn: 'হ্যাঁ — প্রতিটি ধারণার জন্য আলাদা আবেদন করতে হবে।' },
    { question: 'Do I need a working prototype?', questionBn: 'কার্যকর প্রোটোটাইপ কি লাগবে?', answer: 'No. Ideas at any stage are welcome; stage is one of the questions on the form.', answerBn: 'না। যেকোনো পর্যায়ের ধারণা গ্রহণযোগ্য; পর্যায়টি ফরমে জানাতে হবে।' },
    { question: 'Who owns the intellectual property?', questionBn: 'মেধাস্বত্ব কার?', answer: 'You do. a2i only gets the right to showcase the shortlisted ideas.', answerBn: 'আপনার। এটুআই শুধু নির্বাচিত ধারণাগুলো প্রদর্শনের অধিকার পাবে।' },
  ],
};

/** All 11 field types; conditional fields point at earlier choice fields by payload index. */
const FIELDS = [
  /* 0 */ { label: 'Innovation / idea title', labelBn: 'উদ্ভাবন / ধারণার শিরোনাম', type: 'SHORT_TEXT', required: true, mapsTo: 'TITLE', placeholder: 'A short, descriptive name', placeholderBn: 'সংক্ষিপ্ত, বর্ণনামূলক নাম' },
  /* 1 */ { label: 'Summary', labelBn: 'সারসংক্ষেপ', type: 'LONG_TEXT', required: true, mapsTo: 'SUMMARY', helpText: 'Two or three sentences reviewers can read at a glance.', helpTextBn: 'দুই-তিন বাক্যে, যা পর্যালোচক এক নজরে পড়তে পারেন।' },
  /* 2 */ { label: 'Problem you are solving', labelBn: 'যে সমস্যার সমাধান করছেন', type: 'LONG_TEXT', required: true, mapsTo: 'PROBLEM_STATEMENT' },
  /* 3 */ { label: 'Your proposed solution', labelBn: 'আপনার প্রস্তাবিত সমাধান', type: 'LONG_TEXT', required: true, mapsTo: 'PROPOSED_SOLUTION' },
  /* 4 */ { label: 'Applying as', labelBn: 'আবেদনকারীর ধরন', type: 'RADIO', required: true, options: ['Individual', 'Team', 'Organisation'], optionsBn: ['ব্যক্তি', 'দল', 'প্রতিষ্ঠান'] },
  /* 5 */ { label: 'National ID number', labelBn: 'জাতীয় পরিচয়পত্র নম্বর', type: 'SHORT_TEXT', required: true, showIfFieldIndex: 4, showIfValues: ['Individual'], placeholder: '10 or 17 digits', placeholderBn: '১০ বা ১৭ অঙ্ক' },
  /* 6 */ { label: 'Number of team members', labelBn: 'দলের সদস্য সংখ্যা', type: 'NUMBER', required: true, showIfFieldIndex: 4, showIfValues: ['Team'], helpText: 'Including yourself (max 5).', helpTextBn: 'আপনাকে সহ (সর্বোচ্চ ৫)।' },
  /* 7 */ { label: 'Organisation name', labelBn: 'প্রতিষ্ঠানের নাম', type: 'SHORT_TEXT', required: true, showIfFieldIndex: 4, showIfValues: ['Organisation'] },
  /* 8 */ { label: 'Organisation registration certificate', labelBn: 'প্রতিষ্ঠানের নিবন্ধন সনদ', type: 'FILE', required: true, acceptedFileTypes: ['.pdf'], maxFileSizeMb: 5, showIfFieldIndex: 4, showIfValues: ['Organisation'] },
  /* 9 */ { label: 'Contact email', labelBn: 'যোগাযোগের ইমেইল', type: 'EMAIL', required: true },
  /* 10 */ { label: 'Contact phone', labelBn: 'যোগাযোগের ফোন', type: 'PHONE', required: true },
  /* 11 */ { label: 'Sector', labelBn: 'খাত', type: 'SELECT', required: true, options: ['Agriculture', 'Health', 'Education', 'Climate resilience', 'Other'], optionsBn: ['কৃষি', 'স্বাস্থ্য', 'শিক্ষা', 'জলবায়ু সহনশীলতা', 'অন্যান্য'] },
  /* 12 */ { label: 'Please specify the sector', labelBn: 'খাতটি উল্লেখ করুন', type: 'SHORT_TEXT', required: true, showIfFieldIndex: 11, showIfValues: ['Other'] },
  /* 13 */ { label: 'Stage of development', labelBn: 'উন্নয়নের পর্যায়', type: 'SELECT', required: true, options: ['Idea', 'Prototype', 'Pilot', 'Scaling'], optionsBn: ['ধারণা', 'প্রোটোটাইপ', 'পাইলট', 'সম্প্রসারণ'] },
  /* 14 */ { label: 'Pilot start date', labelBn: 'পাইলট শুরুর তারিখ', type: 'DATE', required: true, showIfFieldIndex: 13, showIfValues: ['Pilot', 'Scaling'] },
  /* 15 */ { label: 'Support needed', labelBn: 'প্রয়োজনীয় সহায়তা', type: 'CHECKBOX', options: ['Funding', 'Mentoring', 'Government partnership', 'Pilot site'], optionsBn: ['অর্থায়ন', 'মেন্টরিং', 'সরকারি অংশীদারিত্ব', 'পাইলট সাইট'], description: 'Tick all that apply.', descriptionBn: 'প্রযোজ্য সবগুলো চিহ্নিত করুন।' },
  /* 16 */ { label: 'Funding amount needed (BDT)', labelBn: 'প্রয়োজনীয় অর্থের পরিমাণ (টাকা)', type: 'NUMBER', required: true, showIfFieldIndex: 15, showIfValues: ['Funding'] },
  /* 17 */ { label: 'Concept note', labelBn: 'ধারণাপত্র', type: 'FILE', required: true, acceptedFileTypes: ['.pdf', '.docx'], maxFileSizeMb: 10, description: 'Use the template under Attachments on the challenge page.', descriptionBn: 'চ্যালেঞ্জ পাতার সংযুক্তি অংশের টেমপ্লেট ব্যবহার করুন।' },
  /* 18 */ { label: 'Photos or demo video', labelBn: 'ছবি বা ডেমো ভিডিও', type: 'MULTI_FILE', required: false, acceptedFileTypes: ['.png', '.jpg', '.jpeg', '.mp4'], maxFileSizeMb: 20, maxFiles: 3 },
  /* 19 */ { label: 'Declaration', labelBn: 'ঘোষণা', type: 'CHECKBOX', required: true, options: [], placeholder: 'I confirm this submission is my own work and I accept the challenge rules.', placeholderBn: 'আমি নিশ্চিত করছি এটি আমার নিজের কাজ এবং আমি চ্যালেঞ্জের নিয়মাবলি মেনে নিচ্ছি।' },
];

// ---------------------------------------------------------------------------------------- main
(async () => {
  try { await fetch(`${API}/settings/submission`); } catch { throw new Error(`API not reachable at ${API}`); }

  const admin = await login('admin@nir.gov.bd');
  const inn1 = await login('innovator1@nir.gov.bd');
  const inn2 = await login('innovator2@nir.gov.bd');
  const category = await prisma.category.findFirst({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });

  console.log('\n== Setup: create / refresh the demo challenge');
  const banner = await upload(admin, makePng(1200, 480, [6, 95, 70], [16, 185, 129]), 'demo-challenge-banner.png', 'image/png');
  const guide = await upload(admin, makePdf('Smart Bangladesh Innovation Challenge 2026 - Guidelines (demo)'), 'Challenge guidelines.pdf', 'application/pdf');
  const template = await upload(admin, makePdf('Concept note template (demo)'), 'Concept note template.pdf', 'application/pdf');
  const body = {
    ...DETAILS,
    categoryId: category.id,
    bannerImageUrl: banner.url,
    resources: [
      { label: 'Challenge guidelines (PDF)', labelBn: 'চ্যালেঞ্জ নির্দেশিকা (PDF)', url: guide.url },
      { label: 'Concept note template (PDF)', labelBn: 'ধারণাপত্রের টেমপ্লেট (PDF)', url: template.url },
      { label: 'a2i website', labelBn: 'এটুআই ওয়েবসাইট', url: 'https://a2i.gov.bd' },
    ],
  };
  const existing = await prisma.challenge.findUnique({ where: { slug: SLUG } });
  const saved = existing
    ? await call('PATCH', `/challenges/${existing.id}`, { token: admin, body })
    : await call('POST', '/challenges', { token: admin, body: { slug: SLUG, ...body } });
  check(`challenge ${existing ? 'updated' : 'created'}`, saved.status < 300, saved.body);
  const challenge = saved.body;
  // submissionsEnabled needs a category, so set it again after create, as the admin UI does.
  await call('PATCH', `/challenges/${challenge.id}`, { token: admin, body: { submissionsEnabled: true, isActive: true, isPublished: true } });

  const formSave = await call('PUT', `/challenges/${challenge.id}/form`, { token: admin, body: { fields: FIELDS } });
  check('form saved (20 fields, all 11 types, 7 conditional)', formSave.status === 200, formSave.body);

  console.log('\n== Public view');
  const list = await call('GET', '/challenges');
  const listItems = Array.isArray(list.body) ? list.body : list.body?.items ?? [];
  check('listed on the public challenges endpoint', listItems.some((c) => c.slug === SLUG));
  const pub = await call('GET', `/challenges/${SLUG}`);
  check('detail is public and accepting submissions', pub.status === 200 && pub.body.acceptingSubmissions === true, pub.body?.closedReason);
  check('Bangla title / agency / prize present', pub.body.titleBn === DETAILS.titleBn && pub.body.organizingAgencyBn === DETAILS.organizingAgencyBn && pub.body.prizeInfoBn === DETAILS.prizeInfoBn);
  check('timeline (5), FAQs (3), attachments (3) stored', pub.body.timelinePhases?.length === 5 && pub.body.faqs?.length === 3 && pub.body.resources?.length === 3);
  check('custom submit-button labels stored', pub.body.submitButtonLabelEn === DETAILS.submitButtonLabelEn && pub.body.submitButtonLabelBn === DETAILS.submitButtonLabelBn);
  check('banner and attachment files are served', (await fetch(`${API.replace('/api/v1', '')}${banner.url}`)).ok && (await fetch(`${API.replace('/api/v1', '')}${guide.url}`)).ok);

  const form = (await call('GET', `/challenges/${SLUG}/form`)).body.fields;
  const types = new Set(form.map((f) => f.type));
  check('form exposes 20 fields covering all 11 types', form.length === 20 && types.size === 11, [...types]);
  const byKey = Object.fromEntries(form.map((f) => [f.key, f]));
  check('conditions resolved to controller keys', byKey.national_id_number.showIfFieldKey === 'applying_as' && byKey.funding_amount_needed_bdt.showIfFieldKey === 'support_needed' && sameSet(byKey.pilot_start_date.showIfValues, ['Pilot', 'Scaling']));
  check('Bangla option labels kept index-aligned', byKey.sector.optionsBn[4] === 'অন্যান্য');

  console.log('\n== Submission validation');
  check('anonymous submit refused (401)', (await call('POST', `/challenges/${SLUG}/submissions`, { body: { responses: {} } })).status === 401);

  const empty = await call('POST', `/challenges/${SLUG}/submissions`, { token: inn1, body: { responses: {} } });
  check('empty submission: only always-visible required fields error', empty.status === 400 && sameSet(Object.keys(empty.body.fieldErrors ?? {}), [
    'innovation_idea_title', 'summary', 'problem_you_are_solving', 'your_proposed_solution', 'applying_as',
    'contact_email', 'contact_phone', 'sector', 'stage_of_development', 'concept_note', 'declaration',
  ]), empty.body.fieldErrors);

  const wrongPng = await upload(inn1, makePng(40, 40, [200, 0, 0], [0, 0, 200]), 'not-a-concept-note.png', 'image/png');
  const badFormats = await call('POST', `/challenges/${SLUG}/submissions`, {
    token: inn1,
    body: { responses: {
      innovation_idea_title: 'x', summary: 'x', problem_you_are_solving: 'x', your_proposed_solution: 'x',
      applying_as: 'Alien', contact_email: 'not-an-email', contact_phone: 'abc', sector: 'Space',
      stage_of_development: 'Pilot', pilot_start_date: '2026-02-30', concept_note: wrongPng, declaration: true,
      photos_or_demo_video: [wrongPng, wrongPng, wrongPng, wrongPng],
    } },
  });
  check('bad formats rejected per field (radio, email, phone, select, date, file type, file count)', badFormats.status === 400 && sameSet(Object.keys(badFormats.body.fieldErrors ?? {}), [
    'applying_as', 'contact_email', 'contact_phone', 'sector', 'pilot_start_date', 'concept_note', 'photos_or_demo_video',
  ]), badFormats.body.fieldErrors);

  const pdf1 = await upload(inn1, makePdf('Concept note - AgriVoice'), 'AgriVoice concept note.pdf', 'application/pdf');
  const base = {
    innovation_idea_title: 'x', summary: 'x', problem_you_are_solving: 'x', your_proposed_solution: 'x',
    contact_email: 'a@b.bd', contact_phone: '+8801711000000', stage_of_development: 'Idea', concept_note: pdf1, declaration: true,
  };
  const condMissing = await call('POST', `/challenges/${SLUG}/submissions`, {
    token: inn1,
    body: { responses: { ...base, applying_as: 'Organisation', sector: 'Other', stage_of_development: 'Scaling', support_needed: ['Funding'] } },
  });
  check('chosen options make their conditional fields required', condMissing.status === 400 && sameSet(Object.keys(condMissing.body.fieldErrors ?? {}), [
    'organisation_name', 'organisation_registration_certificate', 'please_specify_the_sector', 'pilot_start_date', 'funding_amount_needed_bdt',
  ]), condMissing.body.fieldErrors);

  console.log('\n== Valid submissions (kept)');
  const photo1 = await upload(inn1, makePng(640, 360, [34, 139, 34], [154, 205, 50]), 'Field test photo 1.png', 'image/png');
  const photo2 = await upload(inn1, makePng(640, 360, [0, 105, 148], [72, 209, 204]), 'Field test photo 2.png', 'image/png');
  const r1 = await call('POST', `/challenges/${SLUG}/submissions`, {
    token: inn1,
    body: { responses: {
      innovation_idea_title: 'AgriVoice — voice-based crop advisory for farmers',
      summary: 'An IVR + WhatsApp service that answers farmers’ crop questions in Bangla within minutes, using extension officers’ verified answers.',
      problem_you_are_solving: 'Farmers wait days for advice from upazila agriculture offices and often act on rumours, losing crops to pests.',
      your_proposed_solution: 'A voice line that routes questions to a knowledge base and, when needed, to the nearest agriculture extension officer.',
      applying_as: 'Individual', national_id_number: '1234567890',
      team_size_should_be_dropped: 'ignored', number_of_team_members: 4, // hidden (not Team) → dropped
      contact_email: 'salma.akter@example.com', contact_phone: '+880 1711-000111',
      sector: 'Agriculture', stage_of_development: 'Prototype',
      support_needed: ['Mentoring', 'Government partnership'],
      concept_note: pdf1, photos_or_demo_video: [photo1, photo2], declaration: true,
    } },
  });
  check('Individual / Agriculture / Prototype submission accepted', r1.status === 201, r1.body);

  const cert = await upload(inn2, makePdf('Registration certificate - Sera Health Ltd'), 'Registration certificate.pdf', 'application/pdf');
  const note2 = await upload(inn2, makePdf('Concept note - FloodSafe'), 'FloodSafe concept note.pdf', 'application/pdf');
  const r2 = await call('POST', `/challenges/${SLUG}/submissions`, {
    token: inn2,
    body: { responses: {
      innovation_idea_title: 'FloodSafe — community flood early-warning by SMS',
      summary: 'Low-cost river-level sensors trigger Bangla SMS and loudspeaker alerts in vulnerable unions.',
      problem_you_are_solving: 'Char and haor communities get flood warnings too late to move livestock and belongings.',
      your_proposed_solution: 'Solar river sensors + an alerting service integrated with Union Digital Centres.',
      applying_as: 'Organisation', organisation_name: 'Sera Health Ltd', organisation_registration_certificate: cert,
      national_id_number: '9999999999', // hidden (not Individual) → dropped
      contact_email: 'tanvir.rahman@example.com', contact_phone: '+8801811000222',
      sector: 'Other', please_specify_the_sector: 'Disaster management',
      stage_of_development: 'Pilot', pilot_start_date: '2026-09-15',
      support_needed: ['Funding', 'Pilot site'], funding_amount_needed_bdt: '1500000',
      concept_note: note2, declaration: true,
    } },
  });
  check('Organisation / Other sector / Pilot / Funding submission accepted', r2.status === 201, r2.body);

  if (r1.status === 201 && r2.status === 201) {
    const [row1, row2] = await Promise.all([
      prisma.innovation.findUnique({ where: { id: r1.body.id }, include: { attachments: true } }),
      prisma.innovation.findUnique({ where: { id: r2.body.id }, include: { attachments: true } }),
    ]);
    const keys = (row) => row.challengeResponses.map((e) => e.key);
    check('#1 stores only shown fields (team size dropped)', sameSet(keys(row1), [
      'innovation_idea_title', 'summary', 'problem_you_are_solving', 'your_proposed_solution', 'applying_as', 'national_id_number',
      'contact_email', 'contact_phone', 'sector', 'stage_of_development', 'support_needed', 'concept_note', 'photos_or_demo_video', 'declaration',
    ]), keys(row1));
    check('#2 stores its branch (NID dropped, chained funding kept)', sameSet(keys(row2), [
      'innovation_idea_title', 'summary', 'problem_you_are_solving', 'your_proposed_solution', 'applying_as', 'organisation_name',
      'organisation_registration_certificate', 'contact_email', 'contact_phone', 'sector', 'please_specify_the_sector',
      'stage_of_development', 'pilot_start_date', 'support_needed', 'funding_amount_needed_bdt', 'concept_note', 'photos_or_demo_video', 'declaration',
    ]), keys(row2));
    check('mapped fields fill the innovation (title/summary/problem/solution)', row1.titleEn.startsWith('AgriVoice') && row2.problemStatement.startsWith('Char and haor'));
    check('number answer normalised to a number', row2.challengeResponses.find((e) => e.key === 'funding_amount_needed_bdt').value === 1500000);
    check('files became attachments (#1: 3, #2: 2)', row1.attachments.length === 3 && row2.attachments.length === 2, [row1.attachments.length, row2.attachments.length]);
    check('both are CHALLENGE channel, UNDER_REVIEW, in the challenge category', [row1, row2].every((r) => r.submissionChannel === 'CHALLENGE' && r.reviewStatus === 'UNDER_REVIEW' && r.categoryId === category.id && r.challengeId === challenge.id));

    console.log('\n== Review pipeline & visibility');
    const queue = await call('GET', '/innovations/preliminary-review-queue', { token: admin });
    check('both appear in the preliminary review queue', [r1.body.id, r2.body.id].every((id) => queue.body.some((i) => i.id === id)));
    const prelim = await login('preliminary@nir.gov.bd');
    const asReviewer = await call('GET', `/innovations/${r1.body.id}`, { token: prelim });
    check('preliminary reviewer sees the responses', asReviewer.status === 200 && Array.isArray(asReviewer.body.challengeResponses), asReviewer.status);
    const asOwner = await call('GET', `/innovations/${r1.body.id}`, { token: inn1 });
    check('submitter sees own responses', asOwner.status === 200 && Array.isArray(asOwner.body.challengeResponses));
    // innovator2 is innovator-only (innovator3 also holds EXPERT_EVALUATOR locally, which may see responses).
    const asOther = await call('GET', `/innovations/${r1.body.id}`, { token: inn2 });
    check('another innovator cannot see the responses', asOther.status !== 200 || asOther.body.challengeResponses == null, asOther.status);
    const asPublic = await call('GET', `/innovations/${r1.body.id}`);
    check('public cannot see the responses', asPublic.status !== 200 || asPublic.body.challengeResponses == null, asPublic.status);
    const mon = await call('GET', `/submissions?channel=CHALLENGE&challengeId=${challenge.id}`, { token: admin });
    check('admin monitoring lists them under this challenge', mon.status === 200 && [r1.body.id, r2.body.id].every((id) => mon.body.items.some((i) => i.id === id)), mon.body);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log(`Challenge kept: http://localhost:3000/en/challenges/${SLUG}  (id ${challenge.id})`);
  if (r1.body?.innovationCode) console.log(`Submissions kept: ${r1.body.innovationCode} (innovator1), ${r2.body?.innovationCode} (innovator2)`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
