import { PrismaClient, Role, OrganizationType, InnovationType, DevelopmentStage, ChallengeStatus, ResourceType, RegionType } from '@prisma/client';
import * as argon2 from 'argon2';
import { CATEGORY_SEEDS } from '@nir/shared';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';

const SDG_SEEDS = [
  'No Poverty', 'Zero Hunger', 'Good Health and Well-being', 'Quality Education',
  'Gender Equality', 'Clean Water and Sanitation', 'Affordable and Clean Energy',
  'Decent Work and Economic Growth', 'Industry, Innovation and Infrastructure',
  'Reduced Inequalities', 'Sustainable Cities and Communities',
  'Responsible Consumption and Production', 'Climate Action', 'Life Below Water',
  'Life on Land', 'Peace, Justice and Strong Institutions', 'Partnerships for the Goals',
];

const DIVISIONS = ['Dhaka', 'Chattogram', 'Khulna', 'Rajshahi', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'];

const MINISTRY_SEEDS = [
  { code: 'ICTD', nameEn: 'ICT Division', nameBn: 'তথ্য ও যোগাযোগ প্রযুক্তি বিভাগ' },
  { code: 'MOA', nameEn: 'Ministry of Agriculture', nameBn: 'কৃষি মন্ত্রণালয়' },
  { code: 'MOHFW', nameEn: 'Ministry of Health and Family Welfare', nameBn: 'স্বাস্থ্য ও পরিবার কল্যাণ মন্ত্রণালয়' },
  { code: 'MOE', nameEn: 'Ministry of Education', nameBn: 'শিক্ষা মন্ত্রণালয়' },
  { code: 'LGD', nameEn: 'Local Government Division', nameBn: 'স্থানীয় সরকার বিভাগ' },
];

async function main() {
  console.log('Seeding categories...');
  for (const [i, c] of CATEGORY_SEEDS.entries()) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, sortOrder: i },
    });
  }

  console.log('Seeding SDG tags...');
  for (const [i, name] of SDG_SEEDS.entries()) {
    await prisma.sdgTag.upsert({
      where: { code: i + 1 },
      update: {},
      create: { code: i + 1, nameEn: `SDG ${i + 1}: ${name}`, nameBn: `SDG ${i + 1}` },
    });
  }

  console.log('Seeding regions (divisions)...');
  const regionByName: Record<string, string> = {};
  for (const name of DIVISIONS) {
    const region = await prisma.region.upsert({
      where: { id: `division-${name.toLowerCase()}` },
      update: {},
      create: { id: `division-${name.toLowerCase()}`, type: RegionType.DIVISION, nameEn: name, nameBn: name },
    });
    regionByName[name] = region.id;
  }

  console.log('Seeding ministries...');
  for (const m of MINISTRY_SEEDS) {
    await prisma.ministry.upsert({ where: { code: m.code }, update: {}, create: m });
  }

  console.log('Seeding tags...');
  const techTags = ['Artificial Intelligence', 'IoT', 'Blockchain', 'Mobile App', 'Cloud Computing'];
  const thematicTags = ['Climate Resilience', 'Gender Inclusion', 'Rural Development', 'Youth Empowerment'];
  for (const nameEn of techTags) {
    await prisma.tag.upsert({
      where: { type_nameEn: { type: 'TECHNOLOGY', nameEn } },
      update: {},
      create: { type: 'TECHNOLOGY', nameEn, nameBn: nameEn },
    });
  }
  for (const nameEn of thematicTags) {
    await prisma.tag.upsert({
      where: { type_nameEn: { type: 'THEMATIC', nameEn } },
      update: {},
      create: { type: 'THEMATIC', nameEn, nameBn: nameEn },
    });
  }

  console.log('Seeding notification templates...');
  const templates = [
    { code: 'WELCOME', channel: 'EMAIL' as const, bodyEn: 'Welcome to the NIR, {{fullName}}! Your Innovator ID is {{irn}}.' },
    { code: 'EVALUATION_ASSIGNED', channel: 'EMAIL' as const, bodyEn: 'You have been assigned to evaluate innovation {{innovationId}}.' },
    { code: 'EOI_RECEIVED', channel: 'EMAIL' as const, bodyEn: 'An investor expressed interest in "{{innovationTitle}}".' },
    { code: 'MENTOR_MATCHED', channel: 'EMAIL' as const, bodyEn: 'You have been matched as a mentor for innovation {{innovationId}}.' },
    { code: 'MENTOR_SESSION_PROPOSED', channel: 'EMAIL' as const, bodyEn: 'A mentorship session has been proposed for {{scheduledAt}}.' },
    { code: 'INNOVATION_REFERRED', channel: 'EMAIL' as const, bodyEn: 'An evaluator referred "{{innovationTitle}}" to you for funding consideration.' },
  ];
  for (const t of templates) {
    await prisma.notificationTemplate.upsert({ where: { code: t.code }, update: {}, create: t });
  }

  console.log('Seeding FAQs...');
  const faqs = [
    { categoryLabel: 'Getting Started', questionEn: 'Who can submit an innovation?', answerEn: 'Any individual, team, university, startup, government agency, or NGO in Bangladesh may register and submit an innovation.' },
    { categoryLabel: 'Getting Started', questionEn: 'Is there a fee to submit?', answerEn: 'No. Submission and evaluation on the National Innovation Repository is free.' },
    { categoryLabel: 'Evaluation', questionEn: 'How long does evaluation take?', answerEn: 'Most submissions receive an initial decision within 4-6 weeks of being placed under review.' },
    { categoryLabel: 'IP & Recognition', questionEn: 'Does NIR register my patent for me?', answerEn: 'No. NIR records your declared IP status and can flag your innovation for advisory referral, but formal registration is handled by the Department of Patents, Designs and Trademarks (DPDT).' },
  ];
  for (const f of faqs) {
    const existing = await prisma.faqItem.findFirst({ where: { questionEn: f.questionEn } });
    if (!existing) await prisma.faqItem.create({ data: f });
  }

  console.log('Seeding partners...');
  const partners = [
    { name: 'a2i Accelerator Lab', logoUrl: '/partners/acclabs.png' },
    { name: 'BUET RISE', logoUrl: '/partners/buet-rise.png' },
    { name: 'Bangladesh Youth Environmental Initiative', logoUrl: '/partners/byei.png' },
    { name: 'Bangladesh Youth Leadership Center', logoUrl: '/partners/bylc.png' },
    { name: 'GP Accelerator Lab', logoUrl: '/partners/gp-accelerator.png' },
    { name: 'Institute of Information Technology, DU', logoUrl: '/partners/iit-du.png' },
    { name: 'Light Castle Partners', logoUrl: '/partners/light-castle.png' },
    { name: 'MIST Innovation Club', logoUrl: '/partners/mist-innovation-club.png' },
    { name: 'Sajida Foundation', logoUrl: '/partners/sajida-foundation.png' },
    { name: 'Youth Co:Lab', logoUrl: '/partners/youth-colab.png' },
    { name: 'BRAC Social Innovation Lab', logoUrl: '/partners/brac.png' },
    { name: 'r-ventures', logoUrl: '/partners/r-ventures.jpeg' },
    { name: 'YY Ventures', logoUrl: '/partners/yy-ventures.png' },
  ];
  for (const [i, p] of partners.entries()) {
    const existing = await prisma.partner.findFirst({ where: { name: p.name } });
    if (!existing) await prisma.partner.create({ data: { ...p, sortOrder: i } });
  }

  console.log('Seeding resources...');
  const resources = [
    { titleEn: 'NIR Submission Guideline', type: ResourceType.GUIDELINE, fileUrl: '/resources/nir-submission-guideline.txt', fileType: 'txt', fileSizeBytes: 900 },
    { titleEn: 'NIR Evaluation SOP', type: ResourceType.SOP, fileUrl: '/resources/nir-evaluation-sop.txt', fileType: 'txt', fileSizeBytes: 800 },
  ];
  for (const r of resources) {
    const existing = await prisma.resourceDocument.findFirst({ where: { titleEn: r.titleEn } });
    if (!existing) await prisma.resourceDocument.create({ data: r });
  }

  console.log('Seeding challenge...');
  const environmentCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'environment-climate' } });
  const existingChallenge = await prisma.challenge.findUnique({ where: { slug: 'national-climate-innovation-challenge-2026' } });
  if (!existingChallenge) {
    await prisma.challenge.create({
      data: {
        slug: 'national-climate-innovation-challenge-2026',
        titleEn: 'National Climate Innovation Challenge 2026',
        organizingAgency: 'Aspire to Innovate (a2i), ICT Division',
        categoryId: environmentCategory.id,
        descriptionEn:
          'Bangladesh continues to face significant challenges related to climate change, including floods, cyclones, salinity intrusion, and water scarcity. This challenge invites innovators to develop practical, scalable, and technology-enabled solutions that strengthen climate resilience and support sustainable development.',
        status: ChallengeStatus.OPEN,
        deadline: new Date('2026-09-30'),
        prizeInfoEn: 'Prototype Development Grant (up to BDT 20 lakh), Technical Mentorship, Pilot Implementation Support, Opportunity for Commercialization',
        applyUrl: '/submit',
      },
    });
  }

  console.log('Seeding news posts...');
  const newsPosts = [
    {
      slug: 'water-innovation-challenge-2021-pilot-evaluation-completed',
      titleEn: 'Pilot Evaluation of Water Innovation Challenge 2021 Projects Completed',
      bodyEn:
        'Aspire to Innovate (a2i), ICT Division, has completed the pilot evaluation of two winning innovations — WaterWise and PANI — developed under the Water Innovation Challenge 2021. Both teams successfully completed their project activities and submitted their Project Completion Letters. The solutions are currently being piloted in Uttara (WaterWise) and Savar (PANI). A field evaluation and expert review workshop was held on 19 August 2025.',
      coverImageUrl: '/news/water-innovation-challenge-pilot.jpg',
      eventDate: new Date('2025-08-19'),
      category: 'Evaluation',
    },
    {
      slug: 'smart-union-upazila-municipality-system-panchagarh',
      titleEn: 'Smart Union, Upazila and Municipality Management System Successfully Evaluated in Panchagarh',
      bodyEn:
        'Aspire to Innovate (a2i), ICT Division, has completed the evaluation of the Smart Union, Upazila and Municipality Management System, the winning innovation under the Smart District Innovation Challenge 2023. Implemented with support from the a2i Innovation Fund, it has successfully completed its pilot implementation in Panchagarh. An evaluation workshop was held on 24 September 2025.',
      coverImageUrl: '/news/smart-union-panchagarh.jpeg',
      eventDate: new Date('2025-09-24'),
      category: 'Evaluation',
    },
    {
      slug: 'smart-school-bus-pilot-evaluated-chattogram',
      titleEn: 'Smart School Bus Pilot Successfully Evaluated Under the Smart District Innovation Challenge 2023',
      bodyEn:
        'Aspire to Innovate (a2i), ICT Division, has completed the evaluation of the Smart School Bus initiative from Chattogram. The pilot introduced IoT-based attendance tracking, GPS-enabled real-time bus tracking, live video streaming, NFC-enabled student attendance, and instant SMS notifications. An evaluation workshop was held on 3 September 2025 at the Chattogram Deputy Commissioner’s Office.',
      coverImageUrl: '/news/smart-school-bus-pilot.jpg',
      eventDate: new Date('2025-09-03'),
      category: 'Evaluation',
    },
    {
      slug: 'creative-problem-solving-workshop-citizen-centric-innovation',
      titleEn: 'a2i Organizes Workshop on Creative Problem-Solving to Strengthen Citizen-Centric Innovation',
      bodyEn:
        'Aspire to Innovate (a2i), ICT Division, organized a day-long workshop titled "From Challenges to Innovative Solutions" on 17 September 2025 at the National Museum of Science & Technology, conducted by the a2i Innovation Cluster to strengthen creative problem-solving and design thinking in citizen service delivery.',
      coverImageUrl: '/news/creative-problem-solving-workshop.jpg',
      eventDate: new Date('2025-09-17'),
      category: 'Workshop',
    },
  ];
  for (const n of newsPosts) {
    await prisma.newsPost.upsert({
      where: { slug: n.slug },
      update: {},
      create: { ...n, publishedAt: n.eventDate },
    });
  }

  console.log('Seeding demo users, organizations, and innovations...');
  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  async function ensureUser(email: string, fullName: string, roles: Role[]) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return existing;
    return prisma.user.create({ data: { email, fullName, passwordHash, roles, emailVerifiedAt: new Date() } });
  }

  const admin = await ensureUser('admin@nir.gov.bd', 'Platform Administrator', [Role.PLATFORM_ADMIN, Role.SYSTEM_ADMIN]);
  const coordinator = await ensureUser('coordinator@nir.gov.bd', 'Institutional Coordinator', [Role.INSTITUTIONAL_COORDINATOR]);
  const evaluator = await ensureUser('evaluator@nir.gov.bd', 'Dr. Farhana Islam', [Role.EXPERT_EVALUATOR]);
  const manager = await ensureUser('manager@nir.gov.bd', 'Innovation Manager', [Role.INNOVATION_MANAGER]);
  const policyObserver = await ensureUser('policy@nir.gov.bd', 'Policy Observer', [Role.POLICY_OBSERVER]);
  // Specialization category ids (evaluatorCategoryIds / preliminaryReviewerCategoryIds /
  // authenticityReviewerCategoryIds) are deliberately left unset here, same as the `evaluator`
  // account above — an admin assigns those from the Users tab after approval, for every
  // reviewer-type account, seeded or not.
  const preliminaryReviewer = await ensureUser('preliminary@nir.gov.bd', 'Nasima Begum', [Role.PRELIMINARY_REVIEWER]);
  const authenticityReviewer = await ensureUser('authenticity@nir.gov.bd', 'Dr. Kamruzzaman Bhuiyan', [Role.AUTHENTICITY_REVIEWER]);
  // Stakeholder/Partner has no SRS-defined actions beyond public browsing (see ROLES.md) —
  // this account exists only so the role has a working login to demo with, not because it
  // unlocks any dashboard.
  const stakeholderPartner = await ensureUser('stakeholder@nir.gov.bd', 'Community Stakeholder Partner', [Role.STAKEHOLDER_PARTNER]);

  const investorUser = await ensureUser('investor@nir.gov.bd', 'Rahim Ventures', [Role.INVESTOR]);
  await prisma.investor.upsert({
    where: { userId: investorUser.id },
    update: {},
    create: { userId: investorUser.id, organizationName: 'Rahim Ventures Ltd.', binVerified: true, sectorInterestIds: [] },
  });
  const investorProfile = await prisma.investor.findUniqueOrThrow({ where: { userId: investorUser.id } });

  const mentorUser = await ensureUser('mentor@nir.gov.bd', 'Prof. Kamal Hossain', [Role.MENTOR]);
  await prisma.mentor.upsert({
    where: { userId: mentorUser.id },
    update: {},
    create: { userId: mentorUser.id, bio: 'Professor of Industrial Engineering, 15+ years mentoring cleantech startups.', availability: 'Weekday evenings' },
  });
  const mentorProfile = await prisma.mentor.findUniqueOrThrow({ where: { userId: mentorUser.id } });

  const ictDivision = await prisma.ministry.findUniqueOrThrow({ where: { code: 'ICTD' } });
  const ministryUser = await ensureUser('ministry@nir.gov.bd', 'ICT Division Focal Point', [Role.MINISTRY_FOCAL_POINT]);
  await prisma.ministryFocalPoint.upsert({
    where: { userId: ministryUser.id },
    update: {},
    create: { userId: ministryUser.id, ministryId: ictDivision.id, title: 'Innovation Officer' },
  });

  async function ensureInnovator(email: string, fullName: string, orgId?: string) {
    const user = await ensureUser(email, fullName, [Role.INNOVATION_SUBMITTER]);
    const existing = await prisma.innovator.findUnique({ where: { userId: user.id } });
    if (existing) return { user, innovator: existing };

    let irn: string;
    do {
      irn = `IRN-2026-${String(Math.floor(Math.random() * 900000) + 100000)}`;
      // eslint-disable-next-line no-await-in-loop
    } while (await prisma.innovator.findUnique({ where: { irn } }));

    const innovator = await prisma.innovator.create({
      data: { userId: user.id, irn, organizationId: orgId, nidVerified: true },
    });
    return { user, innovator };
  }

  const bioTechOrg = await prisma.organization.upsert({
    where: { id: 'org-biotechnology-bangladesh' },
    update: {},
    create: { id: 'org-biotechnology-bangladesh', name: 'Biotechnology Bangladesh', type: OrganizationType.PRIVATE_SECTOR, isVerified: true },
  });
  const seraOrg = await prisma.organization.upsert({
    where: { id: 'org-sera-bangladesh' },
    update: {},
    create: { id: 'org-sera-bangladesh', name: 'SERA Bangladesh', type: OrganizationType.NGO, isVerified: true },
  });
  const chattogramOrg = await prisma.organization.upsert({
    where: { id: 'org-chattogram-district' },
    update: {},
    create: { id: 'org-chattogram-district', name: 'Chattogram District Administration', type: OrganizationType.GOVERNMENT, isVerified: true },
  });

  const { user: innovator1, innovator: innovatorProfile1 } = await ensureInnovator('innovator1@nir.gov.bd', 'Dr. Salma Akter', bioTechOrg.id);
  const { user: innovator2, innovator: innovatorProfile2 } = await ensureInnovator('innovator2@nir.gov.bd', 'Tanvir Rahman', seraOrg.id);
  const { user: innovator3, innovator: innovatorProfile3 } = await ensureInnovator('innovator3@nir.gov.bd', 'Chattogram DC Office', chattogramOrg.id);

  const biotechCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'biotechnology-life-sciences' } });
  const agriCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'agriculture-food-security' } });
  const smartCityCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'smart-cities-infrastructure' } });

  async function ensureInnovation(params: {
    code: string;
    slug: string;
    titleEn: string;
    summaryEn: string;
    problemStatement: string;
    proposedSolution: string;
    innovationType: InnovationType;
    developmentStage: DevelopmentStage;
    categoryId: string;
    organizationId?: string;
    submittedById: string;
    regionId: string;
    teamInnovatorId?: string;
    teamDisplayName: string;
    reviewStatus?: 'PUBLISHED' | 'UNDER_REVIEW' | 'DRAFT';
    isFeatured?: boolean;
    photoUrl?: string;
  }) {
    const existing = await prisma.innovation.findUnique({ where: { slug: params.slug } });
    if (existing) return existing;
    const reviewStatus = params.reviewStatus ?? 'PUBLISHED';
    return prisma.innovation.create({
      data: {
        innovationCode: params.code,
        slug: params.slug,
        titleEn: params.titleEn,
        summaryEn: params.summaryEn,
        problemStatement: params.problemStatement,
        proposedSolution: params.proposedSolution,
        innovationType: params.innovationType,
        developmentStage: params.developmentStage,
        categoryId: params.categoryId,
        organizationId: params.organizationId,
        submittedById: params.submittedById,
        regionId: params.regionId,
        reviewStatus,
        isFeatured: params.isFeatured ?? reviewStatus === 'PUBLISHED',
        submittedAt: reviewStatus === 'DRAFT' ? undefined : new Date('2025-01-15'),
        publishedAt: reviewStatus === 'PUBLISHED' ? new Date('2025-02-01') : undefined,
        team: {
          create: {
            innovatorId: params.teamInnovatorId ?? innovatorProfile1?.id,
            displayName: params.teamDisplayName,
            roleInTeam: 'Lead Innovator',
          },
        },
        attachments: params.photoUrl
          ? { create: { kind: 'PHOTO', url: params.photoUrl, caption: params.titleEn } }
          : undefined,
      },
    });
  }

  await ensureInnovation({
    code: 'NIR-2025-000001',
    slug: 'biodiesel-from-used-cooking-oil',
    titleEn: 'Biodiesel from Used Cooking Oil — From Waste to Energy',
    summaryEn:
      'Most significant innovation in the field of Circular Economy, successfully implemented throughout the country. Converts used cooking oil into biodiesel, transforming waste into a sustainable alternative fuel while reducing environmental pollution and promoting renewable energy.',
    problemStatement: 'Used cooking oil is commonly discarded, polluting waterways and wasting a viable energy resource.',
    proposedSolution: 'A closed-loop collection and refining process converts used cooking oil into road-ready biodiesel.',
    innovationType: InnovationType.PROCESS,
    developmentStage: DevelopmentStage.COMMERCIALIZED,
    categoryId: biotechCategory.id,
    organizationId: bioTechOrg.id,
    submittedById: innovator1.id,
    regionId: regionByName['Dhaka'],
    teamInnovatorId: innovatorProfile1.id,
    teamDisplayName: innovator1.fullName,
    photoUrl: '/home/dna-innovation.jpeg',
  });

  await ensureInnovation({
    code: 'NIR-2025-000002',
    slug: 'e-traceability-exportable-agri-products',
    titleEn: 'Development of Sustainable E-Traceability System for Exportable Agri-Products',
    summaryEn:
      'A digital traceability system enabling end-to-end tracking of exportable agricultural products, enhancing transparency, food safety, quality assurance, and compliance with international market requirements. A pilot export of local fruits and vegetables was successfully conducted through the Central Packing House.',
    problemStatement: 'Exportable agricultural products lack an end-to-end digital record, limiting compliance with international traceability requirements.',
    proposedSolution: 'A blockchain-backed traceability platform records every stage from farm to packing house to export.',
    innovationType: InnovationType.DIGITAL_SOLUTION,
    developmentStage: DevelopmentStage.PILOT_IMPLEMENTED,
    categoryId: agriCategory.id,
    organizationId: seraOrg.id,
    submittedById: innovator2.id,
    regionId: regionByName['Rajshahi'],
    teamInnovatorId: innovatorProfile2.id,
    teamDisplayName: innovator2.fullName,
    photoUrl: '/home/ecosystem-connecting.jpeg',
  });

  await ensureInnovation({
    code: 'NIR-2025-000003',
    slug: 'smart-school-bus-chattogram',
    titleEn: 'Smart School Bus — Chattogram',
    summaryEn:
      'IoT-enabled smart transportation system designed to improve the safety, security, and monitoring of school bus services, winner of the Smart District Innovation Challenge 2023.',
    problemStatement: 'Parents and schools lack real-time visibility into student transportation safety.',
    proposedSolution: 'IoT attendance tracking, GPS bus tracking, live video streaming, and SMS alerts for parents.',
    innovationType: InnovationType.TECHNOLOGY,
    developmentStage: DevelopmentStage.PILOT_IMPLEMENTED,
    categoryId: smartCityCategory.id,
    organizationId: chattogramOrg.id,
    submittedById: innovator3.id,
    regionId: regionByName['Chattogram'],
    teamInnovatorId: innovatorProfile3.id,
    teamDisplayName: innovator3.fullName,
    photoUrl: '/news/smart-school-bus-pilot.jpg',
  });

  const energyCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'energy-renewables' } });
  const inProgress = await ensureInnovation({
    code: 'NIR-2025-000004',
    slug: 'solar-powered-cold-storage-rural-farmers',
    titleEn: 'Solar-Powered Cold Storage for Rural Farmers',
    summaryEn:
      'A low-cost, solar-powered cold storage unit that helps smallholder farmers reduce post-harvest losses of perishable produce in areas without reliable grid electricity.',
    problemStatement: 'Smallholder farmers in off-grid areas lose a large share of perishable harvests before reaching market.',
    proposedSolution: 'Modular solar-powered cold rooms deployed at union-level collection points, run as a shared community service.',
    innovationType: InnovationType.PRODUCT,
    developmentStage: DevelopmentStage.PROTOTYPE_DEVELOPED,
    categoryId: energyCategory.id,
    submittedById: innovator2.id,
    regionId: regionByName['Rangpur'],
    teamInnovatorId: innovatorProfile2.id,
    teamDisplayName: innovator2.fullName,
    reviewStatus: 'UNDER_REVIEW',
    isFeatured: false,
  });

  // Cross-role demo activity, so evaluator/mentor/investor dashboards aren't empty on first login.
  await prisma.evaluationPanelAssignment.upsert({
    where: { innovationId_evaluatorId: { innovationId: inProgress.id, evaluatorId: evaluator.id } },
    update: {},
    create: { innovationId: inProgress.id, evaluatorId: evaluator.id, assignedById: coordinator.id },
  });

  const biodieselInnovation = await prisma.innovation.findUnique({ where: { slug: 'biodiesel-from-used-cooking-oil' } });

  const existingEoi = biodieselInnovation
    ? await prisma.expressionOfInterest.findFirst({ where: { innovationId: biodieselInnovation.id, investorId: investorProfile.id } })
    : null;
  if (biodieselInnovation && !existingEoi) {
    await prisma.expressionOfInterest.create({
      data: {
        innovationId: biodieselInnovation.id,
        investorId: investorProfile.id,
        message: 'Interested in co-financing a second production facility outside Dhaka.',
      },
    });
  }

  // Mentorship matches, sessions, feedback, and logged hours, so any Mentor dashboard
  // (the seeded demo mentor, or a real account that self-adds the Mentor role) shows a
  // realistic history instead of empty states. Guarded on session count so re-running
  // the seed doesn't pile up duplicates, and safe to call for more than one mentor.
  async function seedMentorDemoData(mentorId: string) {
    await prisma.mentorMatch.upsert({
      where: { mentorId_innovationId: { mentorId, innovationId: inProgress.id } },
      update: {},
      create: { mentorId, innovationId: inProgress.id },
    });
    if (biodieselInnovation) {
      await prisma.mentorMatch.upsert({
        where: { mentorId_innovationId: { mentorId, innovationId: biodieselInnovation.id } },
        update: {},
        create: { mentorId, innovationId: biodieselInnovation.id },
      });
    }

    const existingSessions = await prisma.mentorSession.count({ where: { mentorId } });
    if (existingSessions > 0) return;

    const completedSession = await prisma.mentorSession.create({
      data: {
        mentorId,
        innovatorUserId: innovator2.id,
        innovationId: inProgress.id,
        scheduledAt: new Date('2026-06-10T10:00:00Z'),
        mode: 'ONLINE',
        status: 'COMPLETED',
        notes: 'Reviewed the cold storage prototype and discussed off-grid power sizing.',
      },
    });
    await prisma.mentorFeedback.create({
      data: {
        sessionId: completedSession.id,
        feedback: 'Strong grasp of the technical trade-offs. Suggested testing panel capacity against peak monsoon-season demand before the next pilot site.',
        rating: 5,
      },
    });

    if (biodieselInnovation) {
      await prisma.mentorSession.create({
        data: {
          mentorId,
          innovatorUserId: innovator1.id,
          innovationId: biodieselInnovation.id,
          scheduledAt: new Date('2026-08-05T09:30:00Z'),
          mode: 'IN_PERSON',
          status: 'CONFIRMED',
          notes: 'Walkthrough of the second production facility site plan.',
        },
      });
    }

    await prisma.mentorSession.create({
      data: {
        mentorId,
        innovatorUserId: innovator2.id,
        innovationId: inProgress.id,
        scheduledAt: new Date('2026-08-20T11:00:00Z'),
        mode: 'ONLINE',
        status: 'PROPOSED',
        notes: 'Follow-up on union-level collection point rollout.',
      },
    });

    await prisma.mentorActivityLog.createMany({
      data: [
        { mentorId, hours: 2, description: 'Reviewed prototype design documents ahead of the session.', loggedAt: new Date('2026-06-09T15:00:00Z') },
        { mentorId, hours: 1.5, description: 'Cold storage mentorship session with Tanvir Rahman.', loggedAt: new Date('2026-06-10T10:00:00Z') },
        { mentorId, hours: 1, description: 'Pre-session prep call ahead of the biodiesel facility site visit.', loggedAt: new Date('2026-07-20T13:00:00Z') },
      ],
    });
  }

  await seedMentorDemoData(mentorProfile.id);

  // Backfill the same demo data for any other mentor profile (e.g. an admin who
  // self-added the Mentor role to explore the dashboard) that has none yet.
  const otherMentorsWithoutData = await prisma.mentor.findMany({
    where: { id: { not: mentorProfile.id }, sessions: { none: {} } },
    select: { id: true },
  });
  for (const m of otherMentorsWithoutData) {
    // eslint-disable-next-line no-await-in-loop
    await seedMentorDemoData(m.id);
  }

  // Evaluation history demo data — gives the Platform Admin "Evaluations" page
  // (shortlisted-by-evaluators list, grouped by month, plus IP advisory flags) a realistic
  // multi-month history instead of just the single cross-role panel assignment above.
  // Three extra evaluators and four extra lightweight innovations exist purely so every
  // (innovation, evaluator) pair below is unique — Evaluation has a unique constraint on
  // [innovationId, evaluatorId], so re-using the same evaluator on the same innovation twice
  // isn't possible.
  const evaluator2 = await ensureUser('evaluator2@nir.gov.bd', 'Dr. Nasrin Sultana', [Role.EXPERT_EVALUATOR]);
  const evaluator3 = await ensureUser('evaluator3@nir.gov.bd', 'Prof. Imtiaz Ahmed', [Role.EXPERT_EVALUATOR]);
  const evaluator4 = await ensureUser('evaluator4@nir.gov.bd', 'Dr. Rezaul Karim', [Role.EXPERT_EVALUATOR]);

  const washCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'wash' } });
  const educationCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'education-skills' } });

  const cropDiseaseApp = await ensureInnovation({
    code: 'NIR-2025-000005',
    slug: 'ai-crop-disease-detection-app',
    titleEn: 'AI-Powered Crop Disease Detection App',
    summaryEn: 'A smartphone app that uses on-device AI to identify crop diseases from a leaf photo and recommend locally available treatments.',
    problemStatement: 'Smallholder farmers often lack timely access to agronomists, letting treatable crop diseases spread before diagnosis.',
    proposedSolution: 'A lightweight on-device vision model flags common diseases from a photo and suggests low-cost, locally available treatments.',
    innovationType: InnovationType.DIGITAL_SOLUTION,
    developmentStage: DevelopmentStage.PROTOTYPE_DEVELOPED,
    categoryId: agriCategory.id,
    submittedById: innovator2.id,
    regionId: regionByName['Rajshahi'],
    teamInnovatorId: innovatorProfile2.id,
    teamDisplayName: innovator2.fullName,
  });

  const trafficSignalSystem = await ensureInnovation({
    code: 'NIR-2025-000006',
    slug: 'smart-traffic-signal-optimization',
    titleEn: 'Smart Traffic Signal Optimization System',
    summaryEn: 'Sensor-driven adaptive traffic signal timing that reduces intersection congestion in dense urban corridors.',
    problemStatement: 'Fixed-timing traffic signals cause avoidable congestion at high-variance intersections.',
    proposedSolution: 'Camera and sensor input feeds an adaptive controller that retimes signals in real time based on live traffic load.',
    innovationType: InnovationType.TECHNOLOGY,
    developmentStage: DevelopmentStage.PILOT_IMPLEMENTED,
    categoryId: smartCityCategory.id,
    submittedById: innovator3.id,
    regionId: regionByName['Dhaka'],
    teamInnovatorId: innovatorProfile3.id,
    teamDisplayName: innovator3.fullName,
  });

  const waterQualityKit = await ensureInnovation({
    code: 'NIR-2025-000007',
    slug: 'portable-water-quality-testing-kit',
    titleEn: 'Portable Water Quality Testing Kit',
    summaryEn: 'A low-cost handheld kit that gives community health workers on-the-spot readings for common water contaminants.',
    problemStatement: 'Rural communities often wait days for lab results confirming whether local water sources are safe to drink.',
    proposedSolution: 'A rugged handheld sensor kit gives arsenic, bacterial, and turbidity readings on-site within minutes.',
    innovationType: InnovationType.PRODUCT,
    developmentStage: DevelopmentStage.PROTOTYPE_DEVELOPED,
    categoryId: washCategory.id,
    submittedById: innovator1.id,
    regionId: regionByName['Khulna'],
    teamInnovatorId: innovatorProfile1.id,
    teamDisplayName: innovator1.fullName,
  });

  const digitalLiteracyClassroom = await ensureInnovation({
    code: 'NIR-2025-000008',
    slug: 'mobile-digital-literacy-classroom',
    titleEn: 'Mobile Digital Literacy Classroom',
    summaryEn: 'A bus-mounted, solar-powered classroom that brings basic digital literacy training to underserved unions.',
    problemStatement: 'Underserved unions lack the fixed infrastructure needed to run regular digital literacy programs.',
    proposedSolution: 'A solar-powered mobile classroom with tablets and offline course content rotates across unions on a fixed schedule.',
    innovationType: InnovationType.SERVICE,
    developmentStage: DevelopmentStage.PILOT_IMPLEMENTED,
    categoryId: educationCategory.id,
    submittedById: innovator2.id,
    regionId: regionByName['Sylhet'],
    teamInnovatorId: innovatorProfile2.id,
    teamDisplayName: innovator2.fullName,
  });

  if (!biodieselInnovation) throw new Error('Expected the biodiesel innovation to exist by this point in the seed.');
  const eTraceabilityInnovation = await prisma.innovation.findUniqueOrThrow({ where: { slug: 'e-traceability-exportable-agri-products' } });
  const smartSchoolBusInnovation = await prisma.innovation.findUniqueOrThrow({ where: { slug: 'smart-school-bus-chattogram' } });

  async function ensureShortlistEvaluation(params: {
    innovationId: string;
    evaluatorId: string;
    comments: string;
    submittedAt: Date;
  }) {
    await prisma.evaluation.upsert({
      where: { innovationId_evaluatorId: { innovationId: params.innovationId, evaluatorId: params.evaluatorId } },
      update: {},
      create: {
        innovationId: params.innovationId,
        evaluatorId: params.evaluatorId,
        scores: { innovativeness: 8, feasibility: 7, impact: 8, scalability: 7 } as any,
        totalScore: 7.5,
        comments: params.comments,
        recommendation: 'SHORTLIST',
        submittedAt: params.submittedAt,
      },
    });
  }

  const shortlistHistory = [
    // May 2026 — 3
    { innovationId: biodieselInnovation.id, evaluatorId: evaluator.id, submittedAt: new Date('2026-05-04T10:00:00Z'), comments: 'Well-documented commercialization results; strong candidate for replication funding.' },
    { innovationId: eTraceabilityInnovation.id, evaluatorId: evaluator2.id, submittedAt: new Date('2026-05-12T10:00:00Z'), comments: 'Traceability pilot data is solid; recommend shortlisting for scale-up support.' },
    { innovationId: smartSchoolBusInnovation.id, evaluatorId: evaluator3.id, submittedAt: new Date('2026-05-22T10:00:00Z'), comments: 'Effective safety impact in the Chattogram pilot; shortlist for wider rollout.' },

    // June 2026 — 5
    { innovationId: inProgress.id, evaluatorId: evaluator.id, submittedAt: new Date('2026-06-03T10:00:00Z'), comments: 'Promising off-grid design; shortlist pending confirmation of panel sizing.' },
    { innovationId: cropDiseaseApp.id, evaluatorId: evaluator2.id, submittedAt: new Date('2026-06-09T10:00:00Z'), comments: 'High accuracy in field trials; shortlist for further agronomic validation.' },
    { innovationId: trafficSignalSystem.id, evaluatorId: evaluator4.id, submittedAt: new Date('2026-06-15T10:00:00Z'), comments: 'Simulation results show meaningful congestion reduction; shortlist for pilot funding.' },
    { innovationId: waterQualityKit.id, evaluatorId: evaluator3.id, submittedAt: new Date('2026-06-20T10:00:00Z'), comments: 'Low-cost design well suited for coastal and rural deployment; shortlist.' },
    { innovationId: digitalLiteracyClassroom.id, evaluatorId: evaluator.id, submittedAt: new Date('2026-06-27T10:00:00Z'), comments: 'Strong early engagement numbers from pilot unions; shortlist for scale-up.' },

    // July 2026 — 4
    { innovationId: biodieselInnovation.id, evaluatorId: evaluator4.id, submittedAt: new Date('2026-07-02T10:00:00Z'), comments: 'Second evaluator confirms strong commercial traction; shortlist reaffirmed.' },
    { innovationId: smartSchoolBusInnovation.id, evaluatorId: evaluator2.id, submittedAt: new Date('2026-07-11T10:00:00Z'), comments: 'IoT tracking accuracy validated independently; shortlist.' },
    { innovationId: cropDiseaseApp.id, evaluatorId: evaluator3.id, submittedAt: new Date('2026-07-19T10:00:00Z'), comments: 'Cross-checked against a second pilot site; shortlist maintained.' },
    { innovationId: digitalLiteracyClassroom.id, evaluatorId: evaluator4.id, submittedAt: new Date('2026-07-28T10:00:00Z'), comments: 'Additional union rollout data supports continued shortlist status.' },

    // August 2026 — 3
    { innovationId: eTraceabilityInnovation.id, evaluatorId: evaluator4.id, submittedAt: new Date('2026-08-01T10:00:00Z'), comments: 'Export compliance documentation now complete; shortlist for funding review.' },
    { innovationId: inProgress.id, evaluatorId: evaluator2.id, submittedAt: new Date('2026-08-02T10:00:00Z'), comments: 'Updated prototype specs address earlier concerns; shortlist.' },
    { innovationId: trafficSignalSystem.id, evaluatorId: evaluator.id, submittedAt: new Date('2026-08-04T10:00:00Z'), comments: 'Latest field data confirms consistent congestion reduction; shortlist.' },
  ];
  for (const entry of shortlistHistory) {
    // eslint-disable-next-line no-await-in-loop
    await ensureShortlistEvaluation(entry);
  }

  await prisma.ipAdvisoryFlag.upsert({
    where: { id: 'ipflag-demo-biodiesel' },
    update: {},
    create: {
      id: 'ipflag-demo-biodiesel',
      innovationId: biodieselInnovation.id,
      flaggedById: coordinator.id,
      note: 'Patent application referenced but not yet verified — needs IP desk review before funding commitment.',
      createdAt: new Date('2026-06-05T09:00:00Z'),
    },
  });
  await prisma.ipAdvisoryFlag.upsert({
    where: { id: 'ipflag-demo-traffic-signal' },
    update: {},
    create: {
      id: 'ipflag-demo-traffic-signal',
      innovationId: trafficSignalSystem.id,
      flaggedById: evaluator.id,
      note: 'Possible overlap with an existing municipal vendor patent; recommend legal review.',
      createdAt: new Date('2026-07-05T09:00:00Z'),
    },
  });
  await prisma.ipAdvisoryFlag.upsert({
    where: { id: 'ipflag-demo-water-kit' },
    update: {},
    create: {
      id: 'ipflag-demo-water-kit',
      innovationId: waterQualityKit.id,
      flaggedById: evaluator3.id,
      note: 'Check overlap with a similar BUET-patented sensor design.',
      createdAt: new Date('2026-06-21T09:00:00Z'),
    },
  });

  // Pending registration demo data — gives the "User Approvals" admin page a realistic
  // list to review instead of relying on whatever a tester happened to self-register.
  // Mirrors what AuthService.register actually produces (isActive: false, an Innovator
  // profile + IRN for every registrant, plus a role-specific profile row for the three
  // self-service roles Investor/Mentor/MinistryFocalPoint) so approving one of these behaves
  // exactly like approving a real signup.
  //
  // The other roles below (Expert Evaluator, Preliminary/Authenticity Reviewer, Institutional
  // Coordinator, Innovation Manager, Policy Observer) are NOT actually choosable at registration
  // in the real flow — RegisterDto only allows INVESTOR/MENTOR/MINISTRY_FOCAL_POINT (see
  // apps/api/src/auth/dto/register.dto.ts). Those rows exist purely as demo content so the
  // approvals queue shows the full breadth of roles an admin might grant; approving one here
  // just activates the account — an admin still assigns any specialization categories via the
  // "Users" tab afterwards, same as for the seeded evaluator1-4 accounts.
  const moaMinistry = await prisma.ministry.findUniqueOrThrow({ where: { code: 'MOA' } });

  async function ensurePendingUser(params: {
    email: string;
    fullName: string;
    phone: string;
    extraRole?: Role;
    organizationName?: string;
    ministryId?: string;
    createdAt: Date;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: params.email } });
    if (existing) return existing;

    const roles = [Role.INNOVATION_SUBMITTER, ...(params.extraRole ? [params.extraRole] : [])];
    const user = await prisma.user.create({
      data: {
        email: params.email,
        fullName: params.fullName,
        phone: params.phone,
        passwordHash,
        roles,
        isActive: false,
        createdAt: params.createdAt,
      },
    });

    let irn: string;
    do {
      irn = `IRN-2026-${String(Math.floor(Math.random() * 900000) + 100000)}`;
      // eslint-disable-next-line no-await-in-loop
    } while (await prisma.innovator.findUnique({ where: { irn } }));
    await prisma.innovator.create({ data: { userId: user.id, irn, nidVerified: false } });

    if (params.extraRole === Role.INVESTOR) {
      await prisma.investor.create({
        data: { userId: user.id, organizationName: params.organizationName ?? params.fullName, binVerified: false, sectorInterestIds: [] },
      });
    } else if (params.extraRole === Role.MENTOR) {
      await prisma.mentor.create({ data: { userId: user.id } });
    } else if (params.extraRole === Role.MINISTRY_FOCAL_POINT && params.ministryId) {
      await prisma.ministryFocalPoint.create({ data: { userId: user.id, ministryId: params.ministryId } });
    }

    return user;
  }

  const pendingRegistrations = [
    { email: 'pending1@nir.gov.bd', fullName: 'Mahfuz Rahman', phone: '+8801812345601', createdAt: new Date('2026-08-01T09:15:00Z') },
    {
      email: 'pending2@nir.gov.bd', fullName: 'Farzana Yasmin', phone: '+8801812345602',
      extraRole: Role.INVESTOR, organizationName: 'Yasmin Capital Partners', createdAt: new Date('2026-07-30T14:40:00Z'),
    },
    {
      email: 'pending3@nir.gov.bd', fullName: 'Dr. Shafiqul Islam', phone: '+8801812345603',
      extraRole: Role.MENTOR, createdAt: new Date('2026-08-03T11:05:00Z'),
    },
    {
      email: 'pending4@nir.gov.bd', fullName: 'Rownak Jahan', phone: '+8801812345604',
      extraRole: Role.MINISTRY_FOCAL_POINT, ministryId: moaMinistry.id, createdAt: new Date('2026-07-28T08:30:00Z'),
    },
    { email: 'pending5@nir.gov.bd', fullName: 'Nazia Chowdhury', phone: '+8801812345605', createdAt: new Date('2026-08-04T08:00:00Z') },
    {
      email: 'pending6@nir.gov.bd', fullName: 'Dr. Anwarul Kabir', phone: '+8801812345606',
      extraRole: Role.EXPERT_EVALUATOR, createdAt: new Date('2026-08-02T10:20:00Z'),
    },
    {
      email: 'pending7@nir.gov.bd', fullName: 'Sabrina Haque', phone: '+8801812345607',
      extraRole: Role.PRELIMINARY_REVIEWER, createdAt: new Date('2026-07-29T13:10:00Z'),
    },
    {
      email: 'pending8@nir.gov.bd', fullName: 'Kazi Nabil Hasan', phone: '+8801812345608',
      extraRole: Role.AUTHENTICITY_REVIEWER, createdAt: new Date('2026-08-03T16:45:00Z'),
    },
    {
      email: 'pending9@nir.gov.bd', fullName: 'Ruhul Amin', phone: '+8801812345609',
      extraRole: Role.INSTITUTIONAL_COORDINATOR, createdAt: new Date('2026-07-31T09:50:00Z'),
    },
    {
      email: 'pending10@nir.gov.bd', fullName: 'Tahmina Sultana', phone: '+8801812345610',
      extraRole: Role.INNOVATION_MANAGER, createdAt: new Date('2026-08-02T15:00:00Z'),
    },
    {
      email: 'pending11@nir.gov.bd', fullName: 'Golam Mostafa', phone: '+8801812345611',
      extraRole: Role.POLICY_OBSERVER, createdAt: new Date('2026-07-27T12:00:00Z'),
    },
  ] as const;
  for (const p of pendingRegistrations) {
    // eslint-disable-next-line no-await-in-loop
    await ensurePendingUser(p);
  }

  const currentYear = new Date().getFullYear();
  await prisma.ministrySubmissionCycle.upsert({
    where: { year: currentYear },
    update: {},
    create: {
      year: currentYear,
      opensAt: new Date(`${currentYear}-01-01`),
      closesAt: new Date(`${currentYear}-12-31`),
    },
  });

  console.log('\nSeed complete. Demo accounts (password for all: "Password123!"):');
  console.table([
    { email: admin.email, role: 'Platform + System Admin' },
    { email: coordinator.email, role: 'Institutional Coordinator' },
    { email: evaluator.email, role: 'Expert Evaluator' },
    { email: evaluator2.email, role: 'Expert Evaluator' },
    { email: evaluator3.email, role: 'Expert Evaluator' },
    { email: evaluator4.email, role: 'Expert Evaluator' },
    { email: preliminaryReviewer.email, role: 'Preliminary Reviewer' },
    { email: authenticityReviewer.email, role: 'Authenticity Reviewer' },
    { email: manager.email, role: 'Innovation Manager' },
    { email: policyObserver.email, role: 'Policy Observer' },
    { email: investorUser.email, role: 'Investor' },
    { email: mentorUser.email, role: 'Mentor' },
    { email: ministryUser.email, role: 'Ministry Focal Point (ICT Division)' },
    { email: stakeholderPartner.email, role: 'Stakeholder / Partner' },
    { email: innovator1.email, role: 'Innovation Submitter' },
    { email: innovator2.email, role: 'Innovation Submitter' },
    { email: innovator3.email, role: 'Innovation Submitter' },
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
