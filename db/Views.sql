\set ON_ERROR_STOP on
\connect gridwatch

DROP VIEW IF EXISTS v_report_engagement     CASCADE;
DROP VIEW IF EXISTS v_dept_workload         CASCADE;
DROP VIEW IF EXISTS v_sla_status            CASCADE;
DROP VIEW IF EXISTS v_assignment_active     CASCADE;
DROP VIEW IF EXISTS v_report_overview       CASCADE;

CREATE OR REPLACE VIEW v_report_overview AS
SELECT
  r.report_id,
  r.title,
  r.current_status,
  r.created_at,
  r.latitude, r.longitude, r.geohash, r.address,
  c.category_id, c.name AS category,
  s.severity_id, s.label AS severity, s.weight AS severity_weight,
  sa.area_id, sa.name AS service_area, d.dept_id, d.name AS dept,
  u.user_id AS created_by, u.name AS created_by_name
FROM report r
JOIN category c       ON r.category_id = c.category_id
JOIN severity s       ON r.severity_id = s.severity_id
JOIN service_area sa  ON r.area_id     = sa.area_id
JOIN department d     ON sa.dept_id    = d.dept_id
JOIN "user" u         ON r.created_by  = u.user_id;

CREATE OR REPLACE VIEW v_assignment_active AS
SELECT a.*
FROM assignment a
WHERE a.is_active IS TRUE;

CREATE OR REPLACE VIEW v_sla_status AS
SELECT
  r.report_id,
  r.title,
  c.name AS category,
  s.label AS severity,
  sc.target_due_at,
  sc.breached,
  sc.breached_at,
  (sc.target_due_at - now()) AS time_to_deadline
FROM report r
JOIN category c  ON r.category_id = c.category_id
JOIN severity s  ON r.severity_id = s.severity_id
JOIN sla_clock sc ON sc.report_id = r.report_id;

CREATE OR REPLACE VIEW v_dept_workload AS
SELECT
  d.dept_id,
  d.name AS dept,
  COUNT(*) FILTER (WHERE r.current_status IN ('SUBMITTED','TRIAGED','IN_PROGRESS','ON_HOLD')) AS open_reports,
  COUNT(*) FILTER (WHERE a.assignment_id IS NOT NULL) AS assigned_reports,
  COUNT(*) FILTER (WHERE sc.breached) AS breached_reports
FROM department d
LEFT JOIN service_area sa ON sa.dept_id = d.dept_id
LEFT JOIN report r        ON r.area_id  = sa.area_id
LEFT JOIN v_assignment_active a ON a.report_id = r.report_id
LEFT JOIN sla_clock sc     ON sc.report_id = r.report_id
GROUP BY 1,2;

CREATE OR REPLACE VIEW v_report_engagement AS
SELECT
  r.report_id,
  COUNT(DISTINCT s.user_id) AS subscribers,
  COUNT(DISTINCT u.user_id) AS upvotes,
  COUNT(*) FILTER (WHERE c.comment_id IS NOT NULL) AS comments
FROM report r
LEFT JOIN subscription s ON s.report_id = r.report_id
LEFT JOIN upvote u       ON u.report_id = r.report_id
LEFT JOIN comment c      ON c.report_id = r.report_id
GROUP BY r.report_id;