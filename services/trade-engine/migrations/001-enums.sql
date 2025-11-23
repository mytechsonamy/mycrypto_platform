-- Create ENUM types for Trade Engine
-- This migration creates all required ENUM types

CREATE TYPE order_side_enum AS ENUM ('BUY', 'SELL');

CREATE TYPE order_type_enum AS ENUM (
    'MARKET',
    'LIMIT',
    'STOP',
    'STOP_LIMIT',
    'TRAILING_STOP'
);

CREATE TYPE order_status_enum AS ENUM (
    'PENDING',
    'OPEN',
    'PARTIALLY_FILLED',
    'FILLED',
    'CANCELLED',
    'REJECTED',
    'EXPIRED'
);

CREATE TYPE time_in_force_enum AS ENUM (
    'GTC',
    'IOC',
    'FOK',
    'DAY'
);

CREATE TYPE symbol_status_enum AS ENUM (
    'ACTIVE',
    'HALTED',
    'DELISTED'
);
