-- NYC311_Integrate.sql — integrate NYC 311 rows into GridWatch
\set ON_ERROR_STOP on
\connect gridwatch
BEGIN;

-- 0) CONFIG
\if :{?CSV}
  \echo Using CSV from -v: :CSV
\else
  \set CSV 'C:/Users/kashi/OneDrive/Documents/CSE 412 - Fall 25/Group Project/nyc311_sample.csv'
  \echo Using CSV from script: :CSV
\endif

-- 1) STAGING
DROP TABLE IF EXISTS staging_311;
CREATE TABLE staging_311 (
  unique_key       TEXT,
  created_date     TIMESTAMPTZ,
  closed_date      TIMESTAMPTZ,
  agency           TEXT,
  agency_name      TEXT,
  complaint_type   TEXT,
  descriptor       TEXT,
  status           TEXT,
  latitude         NUMERIC(9,6),
  longitude        NUMERIC(9,6),
  incident_address TEXT,
  borough          TEXT,
  city             TEXT
);

\copy staging_311(unique_key,created_date,closed_date,agency,agency_name,complaint_type,descriptor,status,latitude,longitude,incident_address,borough,city) FROM 'C:/Users/kashi/OneDrive/Documents/CSE 412 - Fall 25/Group Project/nyc311_sample.csv' WITH (FORMAT csv, HEADER true);

DELETE FROM staging_311
WHERE created_date IS NULL
   OR latitude IS NULL
   OR longitude IS NULL;

-- 2) LOOKUP / NORMALIZATION
DROP TABLE IF EXISTS map_dept CASCADE;
CREATE TEMP TABLE map_dept(agency TEXT PRIMARY KEY, dept_name TEXT);
INSERT INTO map_dept VALUES
 ('DOT','Streets'),
 ('DPR','Parks'),
 ('DSNY','Operations'),
 ('DEP','Water'),
 ('HPD','Operations'),
 ('DOB','Operations'),
 ('TLC','Operations');

-- Ensure departments exist (idempotent)
INSERT INTO department(name)
SELECT md.dept_name
FROM map_dept md
LEFT JOIN department d ON d.name = md.dept_name
WHERE d.dept_id IS NULL
ON CONFLICT (name) DO NOTHING;

-- Make sure we have at least 5 distinct depts for 5 boroughs
INSERT INTO department(name)
SELECT x.dept_name
FROM (VALUES ('Civic Services')) x(dept_name)
LEFT JOIN department d ON d.name = x.dept_name
WHERE d.dept_id IS NULL;

DROP TABLE IF EXISTS map_category CASCADE;
CREATE TEMP TABLE map_category(complaint_type TEXT PRIMARY KEY, category_name TEXT);
INSERT INTO map_category VALUES
 ('Street Light Condition','Streetlight Out'),
 ('Street Light Outage','Streetlight Out'),
 ('Street Condition','Pothole'),
 ('Pothole','Pothole'),
 ('Sidewalk Condition','Sidewalk Crack'),
 ('Graffiti','Graffiti'),
 ('Sanitation Condition','Trash Overflow'),
 ('Illegal Dumping','Trash Overflow'),
 ('Sewer','Water Leak'),
 ('Water System','Water Leak');

-- Ensure categories
INSERT INTO category(name, description, default_sla_hours)
SELECT mc.category_name,
       mc.category_name || ' (imported)',
       CASE mc.category_name
         WHEN 'Pothole' THEN 72
         WHEN 'Streetlight Out' THEN 48
         WHEN 'Graffiti' THEN 72
         WHEN 'Trash Overflow' THEN 24
         WHEN 'Water Leak' THEN 12
         WHEN 'Sidewalk Crack' THEN 96
         ELSE 72
       END
FROM map_category mc
LEFT JOIN category c ON c.name = mc.category_name
WHERE c.category_id IS NULL
ON CONFLICT (name) DO NOTHING;

-- Ensure fallback category 'Other' exists for unmapped complaint types
INSERT INTO category(name, description, default_sla_hours)
SELECT 'Other', 'Unmapped/Other (imported)', 72
WHERE NOT EXISTS (SELECT 1 FROM category WHERE name = 'Other');

-- Ensure severities
INSERT INTO severity(label, weight)
SELECT lbl, w
FROM (VALUES ('Low',0.75),('Normal',1.0),('High',1.5),('Critical',2.0)) v(lbl,w)
WHERE NOT EXISTS (SELECT 1 FROM severity s WHERE s.label = v.lbl);

-- Map boroughs → service_area, ensuring dept_id uniqueness
WITH needed AS (
  SELECT sa_name
  FROM (VALUES ('Manhattan'),('Brooklyn'),('Queens'),('Bronx'),('Staten Island')) x(sa_name)
  WHERE NOT EXISTS (SELECT 1 FROM service_area sa WHERE sa.name = x.sa_name)
),
assign AS (
  SELECT
    sa_name,
    ('{"type":"Polygon","coordinates":[[[-74.10,40.55],[-73.70,40.55],[-73.70,40.95],[-74.10,40.95],[-74.10,40.55]]]}')::jsonb AS geojson,
    (
      SELECT d.dept_id
      FROM department d
      WHERE NOT EXISTS (SELECT 1 FROM service_area sa WHERE sa.dept_id = d.dept_id)
      ORDER BY d.dept_id
      LIMIT 1
    ) AS dept_id
  FROM needed
)
INSERT INTO service_area(name, geojson, dept_id)
SELECT sa_name, geojson, dept_id
FROM assign
WHERE dept_id IS NOT NULL;  -- if you ever run out of depts, this will skip instead of failing

-- 3) HELPERS
DROP TABLE IF EXISTS map_status;
CREATE TEMP TABLE map_status(nyc TEXT PRIMARY KEY, our report_status);
INSERT INTO map_status VALUES
 ('Closed','CLOSED'),
 ('Resolved','RESOLVED'),
 ('Open','IN_PROGRESS'),
 ('In Progress','IN_PROGRESS'),
 ('Pending','TRIAGED');

CREATE TEMP VIEW v_import_rows AS
SELECT
  s.*,
  COALESCE(NULLIF(borough,''), NULLIF(city,'')) AS borough_norm,
  COALESCE(mc.category_name, 'Other')            AS category_norm,
  COALESCE(md.dept_name, 'Operations')           AS dept_norm,
  COALESCE(ms.our, 'SUBMITTED')                  AS status_norm,
  CASE
    WHEN LOWER(mc.category_name) = 'water leak' AND status ILIKE '%open%' THEN 'Critical'
    WHEN LOWER(mc.category_name) = 'pothole' THEN 'High'
    ELSE 'Normal'
  END AS severity_norm
FROM staging_311 s
LEFT JOIN map_category mc ON mc.complaint_type = s.complaint_type
LEFT JOIN map_dept md     ON md.agency = s.agency
LEFT JOIN map_status ms   ON ms.nyc = s.status;

-- 4) INSERT REPORTS
WITH refs AS (
  SELECT
    v.*,
    (SELECT category_id FROM category  WHERE name = v.category_norm LIMIT 1)                         AS category_id,
    (SELECT severity_id FROM severity  WHERE label = v.severity_norm LIMIT 1)                        AS severity_id,
    (SELECT area_id     FROM service_area WHERE name = COALESCE(v.borough_norm,'Manhattan') LIMIT 1) AS area_id,
    (SELECT d.dept_id   FROM department d WHERE d.name = v.dept_norm LIMIT 1)                        AS dept_id,
    (SELECT user_id     FROM "user" u WHERE u.role='RESIDENT' ORDER BY random() LIMIT 1)             AS creator_id
  FROM v_import_rows v
)
INSERT INTO report(title, description, latitude, longitude, geohash, address,
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
WHERE category_id IS NOT NULL
  AND severity_id IS NOT NULL
  AND area_id IS NOT NULL;

-- 5) STATUS HISTORY (enum casts to match report_status)
WITH ins AS (
  SELECT r.report_id, r.created_at, r.current_status,
         (SELECT user_id FROM "user"
            WHERE role IN ('STAFF','MODERATOR','ADMIN')
            ORDER BY random() LIMIT 1) AS actor
  FROM report r
  WHERE r.created_at BETWEEN (SELECT MIN(created_date) FROM staging_311)
                         AND (SELECT MAX(created_date) FROM staging_311)
)
INSERT INTO status_update(report_id, status, note, changed_by, changed_at)
SELECT report_id, 'SUBMITTED'::report_status, 'Imported from NYC 311', actor, created_at
FROM ins
UNION ALL
SELECT report_id, 'TRIAGED'::report_status, 'Auto-triage', actor, created_at + interval '2 hours'
FROM ins
WHERE current_status IN ('TRIAGED','IN_PROGRESS','ON_HOLD','RESOLVED','CLOSED')
UNION ALL
SELECT report_id, 'IN_PROGRESS'::report_status, 'Auto-start', actor, created_at + interval '1 day'
FROM ins
WHERE current_status IN ('IN_PROGRESS','ON_HOLD','RESOLVED','CLOSED')
UNION ALL
SELECT report_id, current_status, 'Auto-close', actor, created_at + interval '3 days'
FROM ins
WHERE current_status IN ('RESOLVED','CLOSED');

-- 6) SLA CLOCK
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

-- 7) ASSIGNMENTS (ensure one active)
INSERT INTO assignment(report_id, dept_id, assignee_user_id, is_active, assigned_at, accepted_at)
SELECT
  r.report_id,
  d.dept_id,
  (SELECT user_id FROM "user" WHERE role IN ('STAFF','MODERATOR','ADMIN') ORDER BY random() LIMIT 1),
  (r.current_status IN ('SUBMITTED','TRIAGED','IN_PROGRESS','ON_HOLD')),
  r.created_at + interval '2 hours',
  r.created_at + interval '10 hours'
FROM report r
JOIN service_area sa ON sa.area_id = r.area_id
JOIN department d    ON d.dept_id = sa.dept_id
LEFT JOIN assignment a ON a.report_id = r.report_id AND a.is_active
WHERE r.created_at BETWEEN (SELECT MIN(created_date) FROM staging_311)
                        AND (SELECT MAX(created_date) FROM staging_311)
  AND a.assignment_id IS NULL;

COMMIT;
\echo ✅ NYC 311 integration complete.