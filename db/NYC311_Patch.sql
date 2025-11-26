\set ON_ERROR_STOP on
\connect gridwatch
BEGIN;

-- 0) guard: staging_311 must exist (created by the Integrate script)
-- If this fails, re-run the Integrate script first to \copy the CSV.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='staging_311'
  ) THEN
    RAISE EXCEPTION 'staging_311 not found. Re-run NYC311_Integrate.sql first.';
  END IF;
END$$;

-- 1) ensure fallback category exists
INSERT INTO category(name, description, default_sla_hours)
SELECT 'Other','Unmapped/Other (imported)',72
WHERE NOT EXISTS (SELECT 1 FROM category WHERE name='Other');

-- 2) (re)create a NON-TEMP view mirroring the one from Integrate
DROP VIEW IF EXISTS v_import_rows;
CREATE VIEW v_import_rows AS
SELECT
  s.*,
  COALESCE(NULLIF(borough,''), NULLIF(city,'')) AS borough_norm,
  COALESCE(mc.category_name,'Other')            AS category_norm,
  COALESCE(md.dept_name,'Operations')           AS dept_norm,
  COALESCE(ms.our,'SUBMITTED')::report_status   AS status_norm,
  CASE
    WHEN LOWER(mc.category_name)='water leak' AND s.status ILIKE '%open%' THEN 'Critical'
    WHEN LOWER(mc.category_name)='pothole' THEN 'High'
    ELSE 'Normal'
  END AS severity_norm
FROM staging_311 s
LEFT JOIN (
  VALUES
    ('Street Light Condition','Streetlight Out'),
    ('Street Light Outage','Streetlight Out'),
    ('Street Condition','Pothole'),
    ('Pothole','Pothole'),
    ('Sidewalk Condition','Sidewalk Crack'),
    ('Graffiti','Graffiti'),
    ('Sanitation Condition','Trash Overflow'),
    ('Illegal Dumping','Trash Overflow'),
    ('Sewer','Water Leak'),
    ('Water System','Water Leak')
) AS mc(complaint_type,category_name) ON mc.complaint_type = s.complaint_type
LEFT JOIN (
  VALUES
    ('DOT','Streets'),
    ('DPR','Parks'),
    ('DSNY','Operations'),
    ('DEP','Water'),
    ('HPD','Operations'),
    ('DOB','Operations'),
    ('TLC','Operations')
) AS md(agency,dept_name) ON md.agency = s.agency
LEFT JOIN (
  VALUES
    ('Closed','CLOSED'::report_status),
    ('Resolved','RESOLVED'::report_status),
    ('Open','IN_PROGRESS'::report_status),
    ('In Progress','IN_PROGRESS'::report_status),
    ('Pending','TRIAGED'::report_status)
) AS ms(nyc,our) ON ms.nyc = s.status;

-- 3) insert reports with borough normalization + de-dup
WITH v AS (
  SELECT v.*,
         CASE UPPER(COALESCE(v.borough_norm,''))
           WHEN 'MANHATTAN' THEN 'Manhattan'
           WHEN 'BROOKLYN' THEN 'Brooklyn'
           WHEN 'QUEENS' THEN 'Queens'
           WHEN 'BRONX' THEN 'Bronx'
           WHEN 'STATEN ISLAND' THEN 'Staten Island'
           ELSE 'Manhattan'
         END AS area_name
  FROM v_import_rows v
),
refs AS (
  SELECT
    v.*,
    (SELECT category_id FROM category  WHERE name=v.category_norm LIMIT 1)                         AS category_id,
    (SELECT severity_id FROM severity  WHERE label=v.severity_norm LIMIT 1)                        AS severity_id,
    (SELECT area_id     FROM service_area WHERE name=v.area_name LIMIT 1)                          AS area_id,
    (SELECT user_id     FROM "user" u WHERE u.role='RESIDENT' ORDER BY random() LIMIT 1)           AS creator_id
  FROM v
)
INSERT INTO report
(title, description, latitude, longitude, geohash, address,
 created_at, created_by, category_id, severity_id, area_id, current_status)
SELECT
  LEFT(COALESCE(descriptor, complaint_type), 80),
  COALESCE(descriptor, complaint_type),
  latitude::NUMERIC(9,6),
  longitude::NUMERIC(9,6),
  NULL,
  NULLIF(incident_address,''),
  created_date,
  creator_id,
  category_id,
  severity_id,
  area_id,
  status_norm
FROM refs
WHERE category_id IS NOT NULL AND severity_id IS NOT NULL AND area_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM report r
    WHERE r.created_at = refs.created_date
      AND r.title = LEFT(COALESCE(refs.descriptor, refs.complaint_type), 80)
  );

-- 4) status history (enum-safe)
WITH ins AS (
  SELECT r.report_id, r.created_at, r.current_status,
         (SELECT user_id FROM "user" WHERE role IN ('STAFF','MODERATOR','ADMIN')
          ORDER BY random() LIMIT 1) AS actor
  FROM report r
  WHERE r.created_at BETWEEN (SELECT MIN(created_date) FROM staging_311)
                         AND (SELECT MAX(created_date) FROM staging_311)
    AND NOT EXISTS (SELECT 1 FROM status_update su WHERE su.report_id = r.report_id)
)
INSERT INTO status_update(report_id, status, note, changed_by, changed_at)
SELECT report_id, 'SUBMITTED'::report_status, 'Imported from NYC 311', actor, created_at FROM ins
UNION ALL
SELECT report_id, 'TRIAGED'::report_status,   'Auto-triage', actor, created_at + INTERVAL '2 hours'
FROM ins WHERE current_status IN ('TRIAGED','IN_PROGRESS','ON_HOLD','RESOLVED','CLOSED')
UNION ALL
SELECT report_id, 'IN_PROGRESS'::report_status,'Auto-start', actor, created_at + INTERVAL '1 day'
FROM ins WHERE current_status IN ('IN_PROGRESS','ON_HOLD','RESOLVED','CLOSED')
UNION ALL
SELECT report_id, current_status,             'Auto-close', actor, created_at + INTERVAL '3 days'
FROM ins WHERE current_status IN ('RESOLVED','CLOSED');

-- 5) SLA clock
WITH cand AS (
  SELECT
    r.report_id,
    r.current_status,
    r.created_at + (INTERVAL '1 hour' * (c.default_sla_hours * s.weight)) AS due_at
  FROM report r
  JOIN category c ON c.category_id = r.category_id
  JOIN severity s ON s.severity_id = r.severity_id
  WHERE r.created_at BETWEEN (SELECT MIN(created_date) FROM staging_311)
                          AND (SELECT MAX(created_date) FROM staging_311)
    AND NOT EXISTS (SELECT 1 FROM sla_clock sc WHERE sc.report_id = r.report_id)
),
mark AS (
  SELECT
    report_id,
    due_at,
    CASE
      WHEN random() < 0.28
       AND current_status IN ('SUBMITTED','TRIAGED','IN_PROGRESS','ON_HOLD')
       AND now() > due_at
      THEN TRUE ELSE FALSE
    END AS breached
  FROM cand
)
INSERT INTO sla_clock (report_id, target_due_at, breached, breached_at)
SELECT
  m.report_id,
  m.due_at,
  m.breached,
  CASE WHEN m.breached THEN now() - INTERVAL '1 hour' ELSE NULL END
FROM mark AS m;

-- 6) Assignments (one active)
INSERT INTO assignment(report_id, dept_id, assignee_user_id, is_active, assigned_at, accepted_at)
SELECT
  r.report_id,
  sa.dept_id,
  (SELECT user_id FROM "user" WHERE role IN ('STAFF','MODERATOR','ADMIN') ORDER BY random() LIMIT 1),
  (r.current_status IN ('SUBMITTED','TRIAGED','IN_PROGRESS','ON_HOLD')),
  r.created_at + INTERVAL '2 hours',
  r.created_at + INTERVAL '10 hours'
FROM report r
JOIN service_area sa ON sa.area_id = r.area_id
LEFT JOIN assignment a ON a.report_id = r.report_id AND a.is_active
WHERE r.created_at BETWEEN (SELECT MIN(created_date) FROM staging_311)
                        AND (SELECT MAX(created_date) FROM staging_311)
  AND a.assignment_id IS NULL;

COMMIT;
\echo 👍 NYC 311 patch completed.
