-- Initialize Amperio Testing Database
-- Run this script to set up the database from scratch

-- 1. Load the schema
SOURCE Amperio_test_schema.sql;

-- 2. Load indexes
SOURCE Indexes.sql;

-- 3. Load views
SOURCE Views.sql;

-- 4. Load triggers
SOURCE Triggers.sql;

