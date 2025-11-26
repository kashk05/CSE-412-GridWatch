BEGIN;

-- ------------------------------------------------------------------
-- SAFETY RESET (data only)
-- ------------------------------------------------------------------
-- Re-seed from a known state. Keeps types and tables.
TRUNCATE
  audit_log,
  notification,
  work_part,
  work_order,
  comment,
  upvote,
  subscription,
  duplicate_link,
  sla_clock,
  status_update,
  assignment,
  report_media,
  report,
  service_area,
  severity,
  category,
  department,
  "user"
RESTART IDENTITY CASCADE;

-- ------------------------------------------------------------------
-- CORE DIMENSIONS
-- ------------------------------------------------------------------

-- Users (mix of roles; emails pass the '@' check; names simple)
INSERT INTO "user"(name, email, password_hash, role, phone) VALUES
('Alice Resident','alice@example.com','x','RESIDENT','480-555-0001'),
('Sam Staff','sam@example.com','x','STAFF','480-555-0002'),
('Maya Moderator','maya.mod@example.com','x','MODERATOR','480-555-0003'),
('Ava Admin','ava.admin@example.com','x','ADMIN','480-555-0004'),
('Ben Resident','ben@example.com','x','RESIDENT',NULL),
('Chloe Resident','chloe@example.com','x','RESIDENT',NULL),
('Diego Staff','diego.staff@example.com','x','STAFF',NULL),
('Iris Staff','iris.staff@example.com','x','STAFF',NULL),
('Kai Resident','kai@example.com','x','RESIDENT',NULL),
('Liam Resident','liam@example.com','x','RESIDENT',NULL);

-- Departments (city ops style)
INSERT INTO department(name, email, phone) VALUES
('Operations','ops@city.gov','480-555-1000'),
('Parks','parks@city.gov','480-555-1100'),
('Streets','streets@city.gov','480-555-1200'),
('Water','water@city.gov','480-555-1300');

-- Service areas (simple valid GeoJSON objects; multiple areas per dept)
INSERT INTO service_area(name, geojson, dept_id) VALUES
('Downtown',  '{"type":"Polygon","coordinates":[[[-111.94,33.43],[-111.92,33.43],[-111.92,33.45],[-111.94,33.45],[-111.94,33.43]]]}'::jsonb, 1),
('Riverside', '{"type":"Polygon","coordinates":[[[-111.95,33.42],[-111.93,33.42],[-111.93,33.44],[-111.95,33.44],[-111.95,33.42]]]}'::jsonb, 2),
('Campus North','{"type":"Polygon","coordinates":[[[-111.94,33.42],[-111.92,33.42],[-111.92,33.44],[-111.94,33.44],[-111.94,33.42]]]}'::jsonb, 3),
('Campus South','{"type":"Polygon","coordinates":[[[-111.94,33.40],[-111.92,33.40],[-111.92,33.42],[-111.94,33.42],[-111.94,33.40]]]}'::jsonb, 3),
('Greenbelt', '{"type":"Polygon","coordinates":[[[-111.97,33.42],[-111.95,33.42],[-111.95,33.44],[-111.97,33.44],[-111.97,33.42]]]}'::jsonb, 2),
('Eastworks', '{"type":"Polygon","coordinates":[[[-111.90,33.42],[-111.88,33.42],[-111.88,33.44],[-111.90,33.44],[-111.90,33.42]]]}'::jsonb, 1);

-- Categories (SLA hours reflect typical city SLAs)
INSERT INTO category(name, description, default_sla_hours) VALUES
('Pothole','Street surface defect',72),
('Streetlight Out','Non-functioning streetlight',48),
('Graffiti','Vandalism on public property',72),
('Trash Overflow','Public trash overflow or missed pickup',24),
('Water Leak','Suspected potable/wastewater leak',12),
('Sidewalk Crack','Trip hazard on sidewalk',96);

-- Severities (weights scale SLA; all > 0)
INSERT INTO severity(label, weight) VALUES
('Low', 0.75),
('Normal', 1.00),
('High', 1.50),
('Critical', 2.00);

-- ------------------------------------------------------------------
-- REPORTS
-- ------------------------------------------------------------------
-- Note: lat/lon within valid ranges and paired; statuses cover full lifecycle.
-- created_by points to a mix of residents.
INSERT INTO report
(title, description, latitude, longitude, geohash, address, created_by, category_id, severity_id, area_id, current_status)
VALUES
('Pothole near crosswalk', 'Deep pothole at NE corner.', 33.430100, -111.930500, '9tq0abc', '123 N 3rd St', 1, 1, 2, 1, 'SUBMITTED'),      -- r1
('Streetlight flickering', 'Light cycles on/off nightly.', 33.431200, -111.931000, '9tq0abd', '200 W Main St', 5, 2, 2, 1, 'TRIAGED'),       -- r2
('Graffiti on bridge', 'Tag on south face.', 33.423300, -111.944000, '9tq09zz', 'Riverside Bridge', 6, 3, 2, 2, 'IN_PROGRESS'),             -- r3
('Overflowing trash bin', 'Bin full and spilling onto sidewalk.', 33.432000, -111.952000, '9tq0ac3', '5th & Maple', 9, 4, 1, 5, 'RESOLVED'), -- r4
('Water leak by hydrant', 'Pooling water observed.', 33.421000, -111.922000, '9tq09ya', '400 S College Ave', 10, 5, 4, 3, 'IN_PROGRESS'),    -- r5
('Sidewalk crack', 'Large crack causing trip hazard.', 33.412900, -111.923000, '9tq09ax', '800 S Mill Ave', 1, 6, 2, 4, 'ON_HOLD'),          -- r6
('Pothole mid-block', 'Recurring depression re-opened.', 33.433100, -111.929500, '9tq0ac9', '600 E 6th St', 5, 1, 3, 1, 'CLOSED'),           -- r7
('Graffiti on park wall', 'Large mural defaced.', 33.433900, -111.953300, '9tq0acb', 'Greenbelt Park West', 6, 3, 3, 5, 'TRIAGED'),          -- r8
('Trash missed pickup', 'Weekly pickup missed two cycles.', 33.434500, -111.951000, '9tq0acc', '450 W 7th St', 9, 4, 2, 5, 'IN_PROGRESS'),   -- r9
('Streetlight out entirely', 'Total outage.', 33.423900, -111.939900, '9tq09z1', 'E Rio Salado Pkwy', 1, 2, 3, 2, 'RESOLVED'),               -- r10
('Water main break?', 'Significant flow across lane.', 33.424900, -111.889900, '9tq0c11', 'Eastworks Blvd', 10, 5, 4, 6, 'IN_PROGRESS'),     -- r11
('Duplicate: Pothole near crosswalk', 'Same hole as earlier report.', 33.430100, -111.930500, '9tq0abc', '123 N 3rd St', 6, 1, 2, 1, 'MERGED'); -- r12

-- ------------------------------------------------------------------
-- REPORT MEDIA
-- ------------------------------------------------------------------
INSERT INTO report_media(report_id, url, media_type) VALUES
(1, 'https://cdn.example.com/r1_1.jpg', 'IMAGE'),
(1, 'https://cdn.example.com/r1_2.jpg', 'IMAGE'),
(3, 'https://cdn.example.com/r3_1.jpg', 'IMAGE'),
(5, 'https://cdn.example.com/r5_1.mp4', 'VIDEO'),
(11,'https://cdn.example.com/r11_1.mp4','VIDEO');

-- ------------------------------------------------------------------
-- ASSIGNMENTS (only one active per report via partial unique)
-- ------------------------------------------------------------------
INSERT INTO assignment(report_id, dept_id, assignee_user_id, is_active) VALUES
(1, 3, 7, TRUE),   -- Streets active
(2, 3, 7, TRUE),   -- Streets active
(3, 2, 8, TRUE),   -- Parks active
(4, 1, 2, FALSE),  -- closed earlier; inactive
(5, 4, 8, TRUE),   -- Water active
(6, 3, NULL, FALSE), -- on hold; no current active
(7, 3, 7, FALSE),
(8, 2, 8, TRUE),
(9, 1, 2, TRUE),
(10,3, 7, FALSE),
(11,4, 8, TRUE);

-- ------------------------------------------------------------------
-- STATUS HISTORY (reflects lifecycle; latest matches report.current_status)
-- ------------------------------------------------------------------
INSERT INTO status_update(report_id, status, note, changed_by, changed_at) VALUES
(1,'SUBMITTED','Report filed by resident.',1, now() - INTERVAL '2 days'),
(1,'TRIAGED','Validated and queued.',3, now() - INTERVAL '1 day'),

(2,'SUBMITTED','Resident report.',5, now() - INTERVAL '3 days'),
(2,'TRIAGED','Assigned to Streets.',3, now() - INTERVAL '2 days'),

(3,'SUBMITTED','Resident report.',6, now() - INTERVAL '4 days'),
(3,'TRIAGED','Confirmed graffiti.',3, now() - INTERVAL '3 days'),
(3,'IN_PROGRESS','Removal scheduled.',8, now() - INTERVAL '1 day'),

(4,'SUBMITTED','Overflow noted.',9, now() - INTERVAL '5 days'),
(4,'TRIAGED','Ops ticket created.',3, now() - INTERVAL '4 days'),
(4,'IN_PROGRESS','Truck dispatched.',2, now() - INTERVAL '3 days'),
(4,'RESOLVED','Bin cleared; area cleaned.',2, now() - INTERVAL '2 days'),

(5,'SUBMITTED','Resident reported pooling.',10, now() - INTERVAL '1 day 8 hours'),
(5,'IN_PROGRESS','Crew investigating valve.',8, now() - INTERVAL '6 hours'),

(6,'SUBMITTED','Trip hazard.',1, now() - INTERVAL '7 days'),
(6,'TRIAGED','Logged to Streets backlog.',3, now() - INTERVAL '6 days'),
(6,'ON_HOLD','Awaiting concrete vendor window.',7, now() - INTERVAL '3 days'),

(7,'SUBMITTED','Recurring issue.',5, now() - INTERVAL '40 days'),
(7,'TRIAGED','Patched scheduled.',3, now() - INTERVAL '39 days'),
(7,'IN_PROGRESS','Patch performed.',7, now() - INTERVAL '38 days'),
(7,'RESOLVED','Inspector sign-off.',7, now() - INTERVAL '35 days'),
(7,'CLOSED','Closed after 7-day monitor.',3, now() - INTERVAL '30 days'),

(8,'SUBMITTED','Large defacement.',6, now() - INTERVAL '3 days'),
(8,'TRIAGED','Parks notified.',3, now() - INTERVAL '2 days'),

(9,'SUBMITTED','Missed pickup(s).',9, now() - INTERVAL '2 days'),
(9,'IN_PROGRESS','Route updated.',2, now() - INTERVAL '1 day'),

(10,'SUBMITTED','Outage confirmed.',1, now() - INTERVAL '6 days'),
(10,'TRIAGED','Queued for repair.',3, now() - INTERVAL '5 days'),
(10,'IN_PROGRESS','Ballast replaced.',7, now() - INTERVAL '4 days'),
(10,'RESOLVED','Restored.',7, now() - INTERVAL '3 days'),

(11,'SUBMITTED','Possible main break.',10, now() - INTERVAL '3 hours'),
(11,'IN_PROGRESS','Emergency crew en route.',8, now() - INTERVAL '2 hours'),

(12,'SUBMITTED','Duplicate of r1.',6, now() - INTERVAL '1 day'),
(12,'MERGED','Merged into r1.',3, now() - INTERVAL '20 hours');

-- ------------------------------------------------------------------
-- SLA CLOCK (compute due from category SLA * severity weight)
-- ------------------------------------------------------------------
-- Assumes working directly with now(); realistic staggering via intervals above.
INSERT INTO sla_clock(report_id, target_due_at, breached, breached_at)
SELECT
  r.report_id,
  r.created_at
    + (c.default_sla_hours * s.weight)::text::interval, -- hours * weight
  FALSE,
  NULL
FROM report r
JOIN category c ON r.category_id = c.category_id
JOIN severity s ON r.severity_id = s.severity_id;

-- Mark one breached for demo (past due)
UPDATE sla_clock
SET breached = TRUE, breached_at = now() - INTERVAL '1 hour'
WHERE report_id = 7;  -- old case, closed after breach

-- ------------------------------------------------------------------
-- DUPLICATE LINK (r12 -> r1)
-- ------------------------------------------------------------------
INSERT INTO duplicate_link(primary_report_id, duplicate_report_id, merged_by, merged_at)
VALUES (1, 12, 3, now() - INTERVAL '20 hours');

-- ------------------------------------------------------------------
-- ENGAGEMENT: Subscriptions & Upvotes (M-N with composite unique)
-- ------------------------------------------------------------------
-- Subscriptions (residents + staff/mods following)
INSERT INTO subscription(report_id, user_id) VALUES
(1,1),(1,5),(1,6),(1,3),
(2,5),(2,7),
(3,6),(3,8),
(4,9),
(5,10),(5,8),
(6,1),
(7,5),
(8,6),
(9,9),
(10,1),
(11,10);

-- Upvotes (one per (report,user))
INSERT INTO upvote(report_id, user_id) VALUES
(1,1),(1,5),(1,6),
(2,5),
(3,6),(3,1),
(4,9),
(5,10),(5,1),
(6,1),
(7,5),
(8,6),
(9,9),
(10,1),
(11,10);

-- ------------------------------------------------------------------
-- COMMENTS
-- ------------------------------------------------------------------
INSERT INTO comment(report_id, user_id, body, created_at) VALUES
(1,1,'This is right by the crosswalk—dangerous for bikes.', now() - INTERVAL '2 days'),
(1,7,'Crew scheduled tomorrow morning.', now() - INTERVAL '20 hours'),
(3,6,'Please prioritize before weekend event.', now() - INTERVAL '26 hours'),
(5,10,'Water still pooling as of this morning.', now() - INTERVAL '5 hours'),
(9,2,'Route re-planned; expect pickup next cycle.', now() - INTERVAL '20 hours'),
(11,8,'Valve isolation in progress; lane closure possible.', now() - INTERVAL '90 minutes');

-- ------------------------------------------------------------------
-- WORK ORDERS & PARTS (for resolved/active infra cases)
-- ------------------------------------------------------------------
INSERT INTO work_order(report_id, dept_id, opened_at, closed_at, cost_estimate, cost_actual) VALUES
(4, 1, now() - INTERVAL '4 days', now() - INTERVAL '2 days', 150.00, 135.25), -- trash cleared
(7, 3, now() - INTERVAL '39 days', now() - INTERVAL '35 days', 600.00, 575.00), -- pothole fixed
(10,3, now() - INTERVAL '5 days',  now() - INTERVAL '3 days', 200.00, 198.00), -- light fixed
(11,4, now() - INTERVAL '2 hours', NULL, 2500.00, NULL);                       -- ongoing water

-- Parts used
INSERT INTO work_part(wo_id, sku, description, qty, unit_cost) VALUES
(1,'BAG-TRSH-55','55-gal contractor bags', 10, 1.25),
(2,'ASPH-COLD','Cold patch asphalt (50 lb)', 8, 12.50),
(3,'BLST-120V','Ballast 120V LED', 1, 65.00),
(4,'CLAMP-8IN','8" repair clamp', 2, 180.00),
(4,'GSKT-8IN','8" pipe gasket', 4, 22.50);

-- ------------------------------------------------------------------
-- NOTIFICATIONS (mix of PENDING/SENT; payload JSONB)
-- ------------------------------------------------------------------
INSERT INTO notification(report_id, recipient_user_id, channel, payload, status, sent_at) VALUES
(1, 1, 'EMAIL', '{"subject":"Report received","template":"submitted","report_id":1}'::jsonb, 'SENT', now() - INTERVAL '2 days'),
(1, 3, 'PUSH',  '{"title":"New report triaged","report_id":1}'::jsonb, 'SENT', now() - INTERVAL '1 day'),
(5,10, 'SMS',   '{"msg":"Crew en route for water leak #5"}'::jsonb, 'SENT', now() - INTERVAL '1 hour'),
(8, 6, 'EMAIL', '{"subject":"Report triaged","report_id":8}'::jsonb, 'PENDING', NULL),
(11,8, 'PUSH',  '{"title":"Emergency WO opened","report_id":11}'::jsonb, 'SENT', now() - INTERVAL '90 minutes');

-- ------------------------------------------------------------------
-- AUDIT LOG (minimal examples)
-- ------------------------------------------------------------------
INSERT INTO audit_log(entity_type, entity_id, action, actor_user_id, changed_at, detail_json) VALUES
('report', 1, 'CREATE', 1, now() - INTERVAL '2 days', '{"title":"Pothole near crosswalk"}'),
('assignment', 1, 'ASSIGN', 3, now() - INTERVAL '1 day', '{"dept":"Streets","assignee":7}'),
('status_update', 3, 'UPDATE_STATUS', 8, now() - INTERVAL '1 day', '{"to":"IN_PROGRESS"}'),
('work_order', 4, 'OPEN', 2, now() - INTERVAL '4 days', '{"dept":"Operations"}'),
('work_order', 4, 'CLOSE', 2, now() - INTERVAL '2 days', '{"result":"completed"}'),
('duplicate_link', 1, 'MERGE', 3, now() - INTERVAL '20 hours', '{"primary":1,"duplicate":12}');

COMMIT;