BEGIN;

-- 1) Add a MultiPolygon service area (edge-case for geojson)
INSERT INTO service_area(name, geojson, dept_id)
VALUES (
  'River Islands',
  '{
    "type":"MultiPolygon",
    "coordinates":[
      [[[-111.970,33.420],[-111.960,33.420],[-111.960,33.430],[-111.970,33.430],[-111.970,33.420]]],
      [[[-111.955,33.425],[-111.945,33.425],[-111.945,33.435],[-111.955,33.435],[-111.955,33.425]]]
    ]
  }'::jsonb,
  2
);

-- 2) Parameters
WITH params AS (
  SELECT 300::int AS n_reports       -- adjust volume here
),

-- 3) Helper pools
pools AS (
  SELECT
    ARRAY(SELECT category_id FROM category)        AS cat_ids,
    ARRAY(SELECT severity_id FROM severity)        AS sev_ids,
    ARRAY(SELECT area_id FROM service_area)        AS area_ids,
    ARRAY(SELECT user_id FROM "user" WHERE role='RESIDENT') AS resident_ids,
    ARRAY(SELECT user_id FROM "user" WHERE role IN ('STAFF','MODERATOR','ADMIN')) AS staffish_ids
),

-- 4) Generate reports with varied lifecycle & content
r_ins AS (
  INSERT INTO report(title, description, latitude, longitude, geohash, address,
                     created_by, category_id, severity_id, area_id, current_status)
  SELECT
    -- titles vary by category
    CASE (gs % 6)
      WHEN 0 THEN 'Pothole report #'||gs
      WHEN 1 THEN 'Streetlight issue #'||gs
      WHEN 2 THEN 'Graffiti spotted #'||gs
      WHEN 3 THEN 'Trash overflow #'||gs
      WHEN 4 THEN 'Water leak #'||gs
      ELSE 'Sidewalk crack #'||gs
    END AS title,
    -- longish body every ~15th for robustness + a couple unicode chars
    CASE WHEN gs % 15 = 0
      THEN repeat('Detailed notes. ', 50) || ' — Ω ✓'
      ELSE 'Auto-generated report body '||gs
    END AS description,
    -- lat/lon near Tempe bounds with occasional boundary values
    (33.42 + ((gs % 200) * 0.0001))::numeric(9,6) AS latitude,
    (-111.95 + ((gs % 220) * 0.0001))::numeric(9,6) AS longitude,
    -- coarse fake geohash
    '9tq0' || lpad(((gs % 999)::text), 3, '0') AS geohash,
    (100 + (gs % 900))||' N Example Ave' AS address,
    (SELECT resident_ids[(gs % array_length(resident_ids,1))+1] FROM pools) AS created_by,
    (SELECT cat_ids[(gs % array_length(cat_ids,1))+1] FROM pools)            AS category_id,
    (SELECT sev_ids[(gs % array_length(sev_ids,1))+1] FROM pools)            AS severity_id,
    (SELECT area_ids[(gs % array_length(area_ids,1))+1] FROM pools)          AS area_id,
    -- lifecycle distribution
    CASE
      WHEN gs % 50 = 0 THEN 'MERGED'
      WHEN gs % 16 IN (0,1,2) THEN 'SUBMITTED'
      WHEN gs % 16 IN (3,4)   THEN 'TRIAGED'
      WHEN gs % 16 IN (5,6,7,8,9) THEN 'IN_PROGRESS'
      WHEN gs % 16 = 10 THEN 'ON_HOLD'
      WHEN gs % 16 IN (11,12) THEN 'RESOLVED'
      ELSE 'CLOSED'
    END::report_status AS current_status
  FROM params, generate_series(1, (SELECT n_reports FROM params)) AS gs
  RETURNING report_id, created_at, category_id, severity_id, area_id, current_status
),

-- 5) Status histories (latest matches current_status)
st_hist AS (
  INSERT INTO status_update(report_id, status, note, changed_by, changed_at)
  SELECT
    r.report_id,
    path.st,                                       -- scalar report_status
    'Auto status: ' || path.st::text               -- cast to text for concatenation
      AS note,
    (SELECT staffish_ids[
              (r.report_id % array_length(staffish_ids,1)) + 1
            ]
     FROM pools)                                    AS changed_by,
    r.created_at + (gs.i * interval '2 hours')      AS changed_at
  FROM r_ins r
  -- build plausible path ending at r.current_status; alias the column AS st
  CROSS JOIN LATERAL (
    SELECT unnest(
      CASE r.current_status
        WHEN 'SUBMITTED'   THEN ARRAY['SUBMITTED']
        WHEN 'TRIAGED'     THEN ARRAY['SUBMITTED','TRIAGED']
        WHEN 'IN_PROGRESS' THEN ARRAY['SUBMITTED','TRIAGED','IN_PROGRESS']
        WHEN 'ON_HOLD'     THEN ARRAY['SUBMITTED','TRIAGED','ON_HOLD']
        WHEN 'RESOLVED'    THEN ARRAY['SUBMITTED','TRIAGED','IN_PROGRESS','RESOLVED']
        WHEN 'CLOSED'      THEN ARRAY['SUBMITTED','TRIAGED','IN_PROGRESS','RESOLVED','CLOSED']
        WHEN 'MERGED'      THEN ARRAY['SUBMITTED','MERGED']
      END::report_status[]
    ) AS st
  ) AS path
  -- name the generate_series column explicitly as i
  CROSS JOIN LATERAL generate_series(0,3) AS gs(i)
  WHERE gs.i < 1 + CASE r.current_status
                     WHEN 'SUBMITTED'   THEN 0
                     WHEN 'TRIAGED'     THEN 1
                     WHEN 'MERGED'      THEN 1
                     WHEN 'ON_HOLD'     THEN 2
                     WHEN 'IN_PROGRESS' THEN 2
                     WHEN 'RESOLVED'    THEN 3
                     WHEN 'CLOSED'      THEN 4
                   END
  RETURNING report_id
),

-- 6) SLA due times (some breached)
sla_ins AS (
  INSERT INTO sla_clock(report_id, target_due_at, breached, breached_at)
  SELECT r.report_id,
         r.created_at + ((c.default_sla_hours * s.weight)::text::interval),
         -- breach ~30%
         (r.report_id % 10) IN (0,1,2),
         CASE WHEN (r.report_id % 10) IN (0,1,2)
           THEN r.created_at + ((c.default_sla_hours * s.weight)::text::interval) + interval '1 hour'
           ELSE NULL
         END
  FROM r_ins r
  JOIN category c ON c.category_id = r.category_id
  JOIN severity s ON s.severity_id = r.severity_id
  RETURNING report_id
),

-- 7) One active assignment for most active reports; some inactive history
asmt AS (
  INSERT INTO assignment(report_id, dept_id, assignee_user_id, is_active, assigned_at, accepted_at)
  SELECT r.report_id,
         -- map area -> owning dept for realism
         CASE
           WHEN r.area_id % 4 = 1 THEN (SELECT dept_id FROM department WHERE name='Operations' LIMIT 1)
           WHEN r.area_id % 4 = 2 THEN (SELECT dept_id FROM department WHERE name='Parks' LIMIT 1)
           WHEN r.area_id % 4 = 3 THEN (SELECT dept_id FROM department WHERE name='Streets' LIMIT 1)
           ELSE (SELECT dept_id FROM department WHERE name='Water' LIMIT 1)
         END,
         (SELECT staffish_ids[(r.report_id % array_length(staffish_ids,1))+1] FROM pools),
         -- active for non-final states
         (r.current_status NOT IN ('RESOLVED','CLOSED','MERGED')),
         now() - interval '1 day',
         CASE WHEN r.current_status IN ('IN_PROGRESS','ON_HOLD','RESOLVED','CLOSED')
              THEN now() - interval '20 hours' END
  FROM r_ins r
  RETURNING report_id
),

-- 8) Media: ~60% reports have 1–2 media; mix image/video
media AS (
  INSERT INTO report_media(report_id, url, media_type)
  SELECT r.report_id,
         'https://cdn.example.com/r' || r.report_id || '_' || i || CASE WHEN r.report_id % 5 = 0 THEN '.mp4' ELSE '.jpg' END,
         CASE WHEN r.report_id % 5 = 0 THEN 'VIDEO'::media_type ELSE 'IMAGE'::media_type END
  FROM r_ins r
  JOIN LATERAL generate_series(1, CASE WHEN r.report_id % 10 < 6 THEN 1 + (r.report_id % 2) ELSE 0 END) AS i ON TRUE
  WHERE i > 0
  RETURNING report_id
),

-- 9) Engagement (subscriptions/upvotes/comments) with power-ish distribution
subs AS (
  INSERT INTO subscription(report_id, user_id)
  SELECT r.report_id,
         (SELECT resident_ids[(1 + (r.report_id + i) % array_length(resident_ids,1))] FROM pools)
  FROM r_ins r
  JOIN LATERAL generate_series(1, 1 + (r.report_id % 4)) AS i ON TRUE
  ON CONFLICT (report_id, user_id) DO NOTHING
  RETURNING report_id
),
upv AS (
  INSERT INTO upvote(report_id, user_id)
  SELECT r.report_id,
         (SELECT resident_ids[(1 + (r.report_id + i*2) % array_length(resident_ids,1))] FROM pools)
  FROM r_ins r
  JOIN LATERAL generate_series(1, 1 + (r.report_id % 6)) AS i ON TRUE
  ON CONFLICT (report_id, user_id) DO NOTHING
  RETURNING report_id
),
cmts AS (
  INSERT INTO comment(report_id, user_id, body, created_at)
  SELECT r.report_id,
         (SELECT resident_ids[(1 + (r.report_id + i*3) % array_length(resident_ids,1))] FROM pools),
         CASE WHEN i % 7 = 0 THEN 'long comment '||repeat('x', 600) ELSE 'comment #'||i END,
         now() - (i * interval '3 hours')
  FROM r_ins r
  JOIN LATERAL generate_series(1, 1 + (r.report_id % 5)) AS i ON TRUE
  RETURNING report_id
),

-- 10) Notifications: include FAILED/PENDING/SENT mix; keep sent_at for SENT only if you add a check later
ntf AS (
  INSERT INTO notification(report_id, recipient_user_id, channel, payload, status, sent_at)
  SELECT r.report_id,
         (SELECT resident_ids[(1 + (r.report_id) % array_length(resident_ids,1))] FROM pools),
         CASE r.report_id % 3 WHEN 0 THEN 'EMAIL' WHEN 1 THEN 'PUSH' ELSE 'SMS' END::notif_channel,
         jsonb_build_object('report_id', r.report_id, 'kind', 'update'),
         CASE r.report_id % 7 WHEN 0 THEN 'FAILED' WHEN 1 THEN 'PENDING' ELSE 'SENT' END::notif_status,
         CASE WHEN r.report_id % 7 IN (0,1) THEN NULL ELSE now() - interval '1 hour' END
  FROM r_ins r
  RETURNING report_id
)

-- 11) Work orders & parts for a subset (active infra + resolved ones)
INSERT INTO work_order(report_id, dept_id, opened_at, closed_at, cost_estimate, cost_actual)
SELECT r.report_id,
       CASE
         WHEN r.area_id % 4 = 1 THEN (SELECT dept_id FROM department WHERE name='Operations' LIMIT 1)
         WHEN r.area_id % 4 = 2 THEN (SELECT dept_id FROM department WHERE name='Parks' LIMIT 1)
         WHEN r.area_id % 4 = 3 THEN (SELECT dept_id FROM department WHERE name='Streets' LIMIT 1)
         ELSE (SELECT dept_id FROM department WHERE name='Water' LIMIT 1)
       END,
       now() - interval '2 days',
       CASE WHEN r.current_status IN ('RESOLVED','CLOSED') THEN now() - interval '1 day' END,
       round( (50 + (r.report_id % 500))::numeric, 2),
       CASE WHEN r.current_status IN ('RESOLVED','CLOSED') THEN round( (45 + (r.report_id % 480))::numeric, 2) END
FROM r_ins r
WHERE r.report_id % 5 IN (0,1,2);  -- about 60% get a WO

-- parts
INSERT INTO work_part(wo_id, sku, description, qty, unit_cost)
SELECT wo.wo_id,
       CASE WHEN wo.dept_id % 4 = 0 THEN 'ASPH-COLD'
            WHEN wo.dept_id % 4 = 1 THEN 'BLST-120V'
            WHEN wo.dept_id % 4 = 2 THEN 'CLAMP-8IN'
            ELSE 'BAG-TRSH-55'
       END,
       'Auto part for WO '||wo.wo_id,
       1 + (wo.wo_id % 3),
       CASE WHEN wo.dept_id % 4 = 0 THEN 12.50
            WHEN wo.dept_id % 4 = 1 THEN 65.00
            WHEN wo.dept_id % 4 = 2 THEN 180.00
            ELSE 1.25
       END
FROM work_order wo
WHERE wo.opened_at > now() - interval '3 days';

COMMIT;
