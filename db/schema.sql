
BEGIN;

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('RESIDENT','STAFF','MODERATOR','ADMIN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE report_status AS ENUM ('SUBMITTED','TRIAGED','IN_PROGRESS','ON_HOLD','RESOLVED','CLOSED','MERGED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type') THEN
    CREATE TYPE media_type AS ENUM ('IMAGE','VIDEO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notif_channel') THEN
    CREATE TYPE notif_channel AS ENUM ('EMAIL','SMS','PUSH');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notif_status') THEN
    CREATE TYPE notif_status AS ENUM ('PENDING','SENT','FAILED');
  END IF;
END $$;

-- Create tables
CREATE TABLE "user" (
    user_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                TEXT NOT NULL,
    EMAIL               TEXT UNIQUE,
    password_hash       TEXT NOT NULL,
    phone               TEXT,
    role                user_role NOT NULL DEFAULT 'RESIDENT',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT email_has_at CHECK (email IS NULL OR position('@' IN email) > 1)
);

CREATE TABLE department (
    dept_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                TEXT NOT NULL UNIQUE,
    email               TEXT,
    phone               TEXT
    CONSTRAINT email_has_at CHECK (email IS NULL OR position('@' IN email) > 1)
);

CREATE TABLE service_area (
    area_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                TEXT NOT NULL UNIQUE,
    geojson             JSONB NOT NULL,
    dept_id             BIGINT NOT NULL UNIQUE REFERENCES department(dept_id),
    CONSTRAINT geojson_is_object CHECK (jsonb_typeof(geojson) = 'object')
);

CREATE TABLE category (
    category_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                TEXT NOT NULL UNIQUE,
    description         TEXT,
    default_sla_hours   INT NOT NULL,
    CONSTRAINT sla_hours_positive CHECK (default_sla_hours > 0)
);

CREATE TABLE severity (
    severity_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    label               TEXT NOT NULL,
    weight              NUMERIC(6,2) NOT NULL DEFAULT 1.00,
    CONSTRAINT weight_positive CHECK (weight > 0)
);

CREATE TABLE report (
    report_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title               TEXT NOT NULL,
    description         TEXT,
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6),
    geohash             TEXT,
    address             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          BIGINT NOT NULL,
    category_id         BIGINT NOT NULL,
    severity_id         BIGINT NOT NULL,
    area_id             BIGINT NOT NULL,
    current_status      report_status NOT NULL DEFAULT 'IN_PROGRESS',
    FOREIGN KEY (created_by) REFERENCES "user"(user_id),
    FOREIGN KEY (category_id) REFERENCES category(category_id),
    FOREIGN KEY (severity_id) REFERENCES severity(severity_id),
    FOREIGN KEY (area_id) REFERENCES service_area(area_id)
);

CREATE INDEX idx_report_area     ON report(area_id);
CREATE INDEX idx_report_category ON report(category_id);
CREATE INDEX idx_report_status   ON report(current_status);

CREATE TABLE report_media (
    media_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id           BIGINT NOT NULL REFERENCES report(report_id),
    url                 TEXT NOT NULL,
    media_type          media_type NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assignment (
    assignment_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id           BIGINT NOT NULL,
    dept_id             BIGINT NOT NULL,
    assignee_user_id    BIGINT,
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at         TIMESTAMPTZ,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (report_id) REFERENCES report(report_id),
    FOREIGN KEY (dept_id) REFERENCES department(dept_id),
    FOREIGN KEY (assignee_user_id) REFERENCES "user"(user_id)
);

-- Enforce only one active assignment per report
CREATE UNIQUE INDEX uq_assignment_one_active_per_report
    ON assignment(report_id) WHERE is_active;

CREATE TABLE status_update (
    status_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id           BIGINT NOT NULL,
    status              report_status NOT NULL,
    note                TEXT,
    changed_by          BIGINT NOT NULL,
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (report_id) REFERENCES report(report_id),
    FOREIGN KEY (changed_by) REFERENCES "user"(user_id)
);

CREATE TABLE sla_clock (
    sla_id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id           BIGINT NOT NULL UNIQUE REFERENCES report(report_id),
    target_due_at       TIMESTAMPTZ NOT NULL,
    breached            BOOLEAN NOT NULL DEFAULT FALSE,
    breached_at         TIMESTAMPTZ,
    CONSTRAINT breach_time_if_true CHECK (breached = FALSE OR breached_at IS NOT NULL)
);

CREATE TABLE duplicate_link (
    dup_id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    primary_report_id   BIGINT NOT NULL,
    duplicate_report_id BIGINT NOT NULL UNIQUE,
    merged_by           BIGINT,
    merged_at           TIMESTAMPTZ,
    FOREIGN KEY (primary_report_id) REFERENCES report(report_id),
    FOREIGN KEY (duplicate_report_id) REFERENCES report(report_id),
    FOREIGN KEY (merged_by) REFERENCES "user"(user_id),
    CONSTRAINT different_id_for_duplicate CHECK (primary_report_id <> duplicate_report_id)
);

CREATE TABLE subscription (
    sub_id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id           BIGINT NOT NULL UNIQUE,
    user_id             BIGINT NOT NULL UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (report_id) REFERENCES report(report_id),
    FOREIGN KEY (user_id) REFERENCES "user"(user_id)
);

CREATE TABLE upvote (
    upvote_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id           BIGINT NOT NULL UNIQUE,
    user_id             BIGINT NOT NULL UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (report_id) REFERENCES report(report_id),
    FOREIGN KEY (user_id) REFERENCES "user"(user_id)
);

CREATE TABLE comment (
    comment_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id           BIGINT NOT NULL,
    user_id             BIGINT NOT NULL,
    body                TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (report_id) REFERENCES report(report_id),
    FOREIGN KEY (user_id) REFERENCES "user"(user_id)
);

CREATE TABLE work_order (
    wo_id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id           BIGINT NOT NULL,
    dept_id             BIGINT NOT NULL,
    opened_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at           TIMESTAMPTZ,
    cost_estimate       NUMERIC(12,2),
    cost_actual         NUMERIC(12,2),
    FOREIGN KEY (report_id) REFERENCES report(report_id),
    FOREIGN KEY (dept_id) REFERENCES department(dept_id),
    CONSTRAINT costs_nonneg CHECK (
        (cost_estimate IS NULL OR cost_estimate >= 0)
        AND (cost_actual IS NULL OR cost_actual >= 0)
    )
);

CREATE TABLE work_part (
    part_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wo_id               BIGINT NOT NULL REFERENCES work_order(wo_id),
    sku                 TEXT NOT NULL,
    description         TEXT,
    qty                 INT NOT NULL,
    unit_cost           NUMERIC(12,2) NOT NULL,
    CONSTRAINT qty_positive CHECK (qty > 0),
    CONSTRAINT unit_cost_nonneg CHECK (unit_cost >= 0)
);

CREATE TABLE notification (
    notif_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id           BIGINT NOT NULL,
    recipient_user_id   BIGINT NOT NULL,
    channel             notif_channel NOT NULL,
    payload             JSONB NOT NULL,
    sent_at             TIMESTAMPTZ,
    status              notif_status NOT NULL DEFAULT 'PENDING',
    FOREIGN KEY (report_id) REFERENCES report(report_id),
    FOREIGN KEY (recipient_user_id) REFERENCES "user"(user_id)
);

CREATE TABLE audit_log (
    audit_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity_type         TEXT NOT NULL,
    entity_id           BIGINT NOT NULL,
    action              TEXT NOT NULL,
    actor_user_id       BIGINT NOT NULL REFERENCES "user"(user_id),
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    detail_json         JSONB
);

-- Tiny seeds for FK sanity
INSERT INTO department(name) VALUES ('Operations'), ('Parks');

INSERT INTO "user"(name, email, password_hash, role) VALUES
('Alice Resident','alice@example.com','x', 'RESIDENT'),
('Sam Staff','sam@example.com','x','STAFF');

INSERT INTO category(name, description, default_sla_hours) VALUES
('Pothole','Street surface defect',72);

INSERT INTO severity(label, weight) VALUES
('Normal', 1.0), ('High', 2.0);

INSERT INTO service_area(name, geojson, dept_id) VALUES
('Downtown', '{"type":"Polygon","coordinates":[]}'::jsonb, 1);

INSERT INTO report(title, description, created_by, category_id, severity_id, area_id)
VALUES ('Pothole on 3rd', 'Large pothole near crosswalk', 1, 1, 1, 1);

COMMIT;