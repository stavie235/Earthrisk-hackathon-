
-- Run this script to set up the database from scratch

-- 1. Load the schema
SOURCE earthrisk_schema.sql;

-- 2. Load indexes
SOURCE Indexes.sql;

-- 3. Load views
SOURCE Views.sql;

-- 4. Load triggers
SOURCE Triggers.sql;

-- If you have sample data, load it
-- SOURCE sample_data/add_sample_data.sql;
