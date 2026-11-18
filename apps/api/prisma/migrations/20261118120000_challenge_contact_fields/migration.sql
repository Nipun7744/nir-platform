-- Dynamic contact fields per challenge (2026-11-18). The Contact box on the challenge details page
-- is now made only of admin-defined fields (same JSON item shape as "detailFields", no sections).
-- The old fixed contactName / contactEmail / contactPhone values become the first fields of the
-- list (only those that were filled), then the columns are dropped.

ALTER TABLE "Challenge" ADD COLUMN "contactFields" JSONB;

UPDATE "Challenge" c SET "contactFields" = (
  SELECT jsonb_agg(
           jsonb_build_object('key', s.key, 'labelEn', s.label_en, 'labelBn', s.label_bn, 'type', s.type, 'value', s.value)
           ORDER BY s.ord
         )
  FROM (VALUES
    (1, 'name', 'Name', 'নাম', 'SHORT_TEXT', NULLIF(btrim(c."contactName"), '')),
    (2, 'email', 'Email', 'ইমেইল',
        CASE WHEN btrim(c."contactEmail") ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN 'EMAIL' ELSE 'SHORT_TEXT' END,
        NULLIF(btrim(c."contactEmail"), '')),
    (3, 'phone', 'Phone', 'ফোন',
        CASE WHEN btrim(c."contactPhone") ~ '^\+?[0-9][0-9 ()-]{4,19}$' THEN 'PHONE' ELSE 'SHORT_TEXT' END,
        NULLIF(btrim(c."contactPhone"), ''))
  ) AS s(ord, key, label_en, label_bn, type, value)
  WHERE s.value IS NOT NULL
);

ALTER TABLE "Challenge"
  DROP COLUMN "contactName",
  DROP COLUMN "contactEmail",
  DROP COLUMN "contactPhone";
