-- Configurable challenge details fields (2026-11-18).
-- The details-page fields are now created by admins per challenge (no fixed or default sections).
-- Existing content of the five old fixed sections is kept: every section that has text becomes a
-- field (same order and headings the public page used); empty sections are not carried over.
-- Then the fixed columns are dropped.

ALTER TABLE "Challenge" ADD COLUMN "detailFields" JSONB;

UPDATE "Challenge" c SET "detailFields" = (
  SELECT jsonb_agg(
           jsonb_strip_nulls(jsonb_build_object(
             'key', s.key, 'labelEn', s.label_en, 'labelBn', s.label_bn, 'type', 'LONG_TEXT',
             'value', s.value_en, 'valueBn', s.value_bn
           ))
           ORDER BY s.ord
         )
  FROM (VALUES
    (1, 'objective', 'Objective', 'উদ্দেশ্য',
        NULLIF(btrim(c."problemStatementEn"), ''), NULLIF(btrim(c."problemStatementBn"), '')),
    (2, 'eligibility', 'Who can apply', 'কারা আবেদন করতে পারবেন',
        NULLIF(btrim(c."eligibilityEn"), ''), NULLIF(btrim(c."eligibilityBn"), '')),
    (3, 'evaluation_criteria', 'How submissions are evaluated', 'মূল্যায়ন পদ্ধতি',
        NULLIF(btrim(c."evaluationCriteriaEn"), ''), NULLIF(btrim(c."evaluationCriteriaBn"), '')),
    (4, 'prize_details', 'Prizes & support', 'পুরস্কার ও সহায়তা',
        NULLIF(btrim(c."prizeDetailsEn"), ''), NULLIF(btrim(c."prizeDetailsBn"), '')),
    (5, 'additional_info', 'Additional information', 'অতিরিক্ত তথ্য',
        NULLIF(btrim(c."additionalInfoEn"), ''), NULLIF(btrim(c."additionalInfoBn"), ''))
  ) AS s(ord, key, label_en, label_bn, value_en, value_bn)
  WHERE s.value_en IS NOT NULL OR s.value_bn IS NOT NULL
);

ALTER TABLE "Challenge"
  DROP COLUMN "problemStatementEn",
  DROP COLUMN "problemStatementBn",
  DROP COLUMN "eligibilityEn",
  DROP COLUMN "eligibilityBn",
  DROP COLUMN "evaluationCriteriaEn",
  DROP COLUMN "evaluationCriteriaBn",
  DROP COLUMN "prizeDetailsEn",
  DROP COLUMN "prizeDetailsBn",
  DROP COLUMN "additionalInfoEn",
  DROP COLUMN "additionalInfoBn";
