-- PostgreSQL Database Initialization Script for Trade Engine
-- This script creates the Trade Engine database and user
-- It runs after init-db.sql during PostgreSQL container initialization

-- Create Trade Engine database
SELECT 'CREATE DATABASE mytrader_trade_engine'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mytrader_trade_engine')\gexec

-- Create Trade Engine user
DO
$$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'trade_engine_app') THEN
      CREATE ROLE trade_engine_app LOGIN PASSWORD 'dev_password_change_in_prod';
   END IF;
END
$$;

-- Grant privileges to Trade Engine user
GRANT ALL PRIVILEGES ON DATABASE mytrader_trade_engine TO trade_engine_app;

-- Connect to Trade Engine database and set up permissions
\c mytrader_trade_engine

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Grant schema privileges
GRANT USAGE ON SCHEMA public TO trade_engine_app;
GRANT CREATE ON SCHEMA public TO trade_engine_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO trade_engine_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO trade_engine_app;

-- Verify setup
SELECT 'Trade Engine database initialization complete' as status;
SELECT datname FROM pg_database WHERE datname = 'mytrader_trade_engine';
