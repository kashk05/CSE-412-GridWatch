-- Initialize.sql 
\set ON_ERROR_STOP on
\timing on

-- EDIT THIS PATH ONCE:
\set BASE './db'
\set DB gridwatch

-- Always reset the DB cleanly
-- Terminate sessions then DROP DATABASE IF EXISTS
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = :'DB'
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS :DB;

-- Recreate and connect
SELECT format('CREATE DATABASE %I', :'DB')\gexec
\connect :DB

\echo === Running from :BASE ===
\cd :BASE

\echo --- ProjectSchema.sql ---
\i ProjectSchema.sql

\echo --- DataSeeding.sql ---
\i DataSeeding.sql

\echo --- InsertFurther.sql ---
\i InsertFurther.sql
\i InsertRecent.sql

\echo --- Verification.sql ---
\i Verification.sql

\echo ✅ All scripts executed successfully. Ready to query.