-- ============================================================================
-- MYTRADER TRADE ENGINE - DATABASE DDL SCRIPTS
-- ============================================================================
-- Project: MyTrader White-Label Kripto Exchange Platform
-- Component: Trade Engine Database Schema
-- Version: 1.0
-- Date: 2024-11-22
-- Database: PostgreSQL 15+
-- Description: Production-ready DDL with partitioning, indexes, triggers
-- ============================================================================

-- ============================================================================
-- PART 1: ENUM TYPES
-- ============================================================================

-- IMPORTANT: Enum values must match OpenAPI 3.0 specification exactly
-- File: trade-engine-api-spec.yaml
-- Validation: enum values are case-sensitive and must be identical

-- Order Side
CREATE TYPE order_side_enum AS ENUM (
    'BUY',    -- OpenAPI: Side.BUY
    'SELL'    -- OpenAPI: Side.SELL
);

-- Order Type
CREATE TYPE order_type_enum AS ENUM (
    'MARKET',
    'LIMIT',
    'STOP',
    'STOP_LIMIT',      -- Phase 2
    'TRAILING_STOP'    -- Phase 2
);

-- Order Status
CREATE TYPE order_status_enum AS ENUM (
    'PENDING',          -- Order submitted, awaiting validation
    'OPEN',             -- Order active in order book
    'PARTIALLY_FILLED', -- Order partially executed
    'FILLED',           -- Order completely executed
    'CANCELLED',        -- Order cancelled by user
    'REJECTED',         -- Order rejected by system
    'EXPIRED'           -- Order expired (FOK/IOC/DAY)
);

-- Time in Force
CREATE TYPE time_in_force_enum AS ENUM (
    'GTC',  -- Good Till Cancelled
    'IOC',  -- Immediate or Cancel
    'FOK',  -- Fill or Kill
    'DAY'   -- Day order (Phase 2)
);

-- Symbol Status
CREATE TYPE symbol_status_enum AS ENUM (
    'ACTIVE',       -- Normal trading
    'HALTED',       -- Trading suspended
    'MAINTENANCE',  -- Under maintenance
    'DELISTED'      -- No longer tradable
);

COMMENT ON TYPE order_side_enum IS 'Order side: BUY or SELL';
COMMENT ON TYPE order_type_enum IS 'Type of order: MARKET, LIMIT, STOP, etc.';
COMMENT ON TYPE order_status_enum IS 'Current status of an order';
COMMENT ON TYPE time_in_force_enum IS 'Time in force instruction for order';
COMMENT ON TYPE symbol_status_enum IS 'Trading status of a symbol';

-- ============================================================================
-- PART 2: CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: orders (Partitioned by created_at - Monthly)
-- ----------------------------------------------------------------------------
CREATE TABLE orders (
    -- Primary Key
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User & Institution (Multi-tenancy)
    user_id UUID NOT NULL,
    institution_id UUID,
    
    -- Order Details
    symbol VARCHAR(20) NOT NULL,
    side order_side_enum NOT NULL,
    order_type order_type_enum NOT NULL,
    status order_status_enum NOT NULL DEFAULT 'PENDING',
    
    -- Quantities
    quantity DECIMAL(20,8) NOT NULL,
    filled_quantity DECIMAL(20,8) NOT NULL DEFAULT 0,
    
    -- Prices
    price DECIMAL(20,8),           -- NULL for MARKET orders
    average_price DECIMAL(20,8),    -- Average fill price
    stop_price DECIMAL(20,8),       -- For STOP orders
    
    -- Order Instructions
    time_in_force time_in_force_enum NOT NULL DEFAULT 'GTC',
    
    -- Idempotency & Metadata
    client_order_id VARCHAR(100),   -- Client-provided unique ID
    order_source VARCHAR(50),       -- 'WEB' | 'MOBILE' | 'API' | 'BOT'
    fee_profile_id UUID,            -- Link to fee structure
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    filled_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    expires_at TIMESTAMP,           -- For FOK/IOC/DAY orders
    
    -- Constraints
    CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_filled_lte_quantity CHECK (filled_quantity <= quantity),
    CONSTRAINT chk_market_no_price CHECK (
        order_type != 'MARKET' OR price IS NULL
    ),
    CONSTRAINT chk_limit_has_price CHECK (
        order_type != 'LIMIT' OR price IS NOT NULL
    ),
    CONSTRAINT chk_stop_has_stop_price CHECK (
        order_type NOT IN ('STOP', 'STOP_LIMIT') OR stop_price IS NOT NULL
    )
) PARTITION BY RANGE (created_at);

-- Indexes for orders (applied to each partition automatically)
CREATE INDEX idx_orders_user_symbol_status ON orders (user_id, symbol, status)
    WHERE status IN ('OPEN', 'PARTIALLY_FILLED');

CREATE INDEX idx_orders_symbol_status_price ON orders (symbol, status, price)
    WHERE status IN ('OPEN', 'PARTIALLY_FILLED') AND price IS NOT NULL;

CREATE INDEX idx_orders_status_created ON orders (status, created_at DESC);

CREATE INDEX idx_orders_client_order_id ON orders (client_order_id, user_id)
    WHERE client_order_id IS NOT NULL;

CREATE INDEX idx_orders_stop_monitoring ON orders (symbol, stop_price)
    WHERE order_type IN ('STOP', 'STOP_LIMIT') AND status = 'OPEN';

-- Comments
COMMENT ON TABLE orders IS 'Main orders table - partitioned by created_at (monthly)';
COMMENT ON COLUMN orders.client_order_id IS 'Client-provided unique ID for idempotency (24h TTL)';
COMMENT ON COLUMN orders.average_price IS 'Average fill price for partially filled orders';
COMMENT ON COLUMN orders.fee_profile_id IS 'Reference to user fee tier (VIP, etc.)';

-- ----------------------------------------------------------------------------
-- Table: trades (Partitioned by executed_at - Daily for high volume)
-- ----------------------------------------------------------------------------
CREATE TABLE trades (
    -- Primary Key
    trade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Symbol
    symbol VARCHAR(20) NOT NULL,
    
    -- Order References
    buyer_order_id UUID NOT NULL,
    seller_order_id UUID NOT NULL,
    buyer_user_id UUID NOT NULL,
    seller_user_id UUID NOT NULL,
    buyer_institution_id UUID,
    seller_institution_id UUID,
    
    -- Trade Details
    price DECIMAL(20,8) NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    
    -- Fees
    buyer_fee DECIMAL(20,8) NOT NULL,
    seller_fee DECIMAL(20,8) NOT NULL,
    buyer_fee_asset VARCHAR(10) NOT NULL,
    seller_fee_asset VARCHAR(10) NOT NULL,
    
    -- Maker/Taker
    is_buyer_maker BOOLEAN NOT NULL,
    
    -- Metadata
    trade_source VARCHAR(50),       -- 'INTERNAL' | 'BROKER' | 'SIMULATION'
    execution_venue VARCHAR(50),    -- For multi-venue routing (Phase 3)
    
    -- Timestamps
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    settled_at TIMESTAMP,           -- Settlement time (for real broker)
    
    -- Constraints
    CONSTRAINT chk_price_positive CHECK (price > 0),
    CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_self_trade_prevention CHECK (buyer_user_id != seller_user_id),
    
    -- Foreign Keys (referencing orders)
    CONSTRAINT fk_buyer_order FOREIGN KEY (buyer_order_id) 
        REFERENCES orders(order_id) ON DELETE RESTRICT,
    CONSTRAINT fk_seller_order FOREIGN KEY (seller_order_id) 
        REFERENCES orders(order_id) ON DELETE RESTRICT
) PARTITION BY RANGE (executed_at);

-- Indexes for trades
CREATE INDEX idx_trades_buyer ON trades (buyer_user_id, executed_at DESC);
CREATE INDEX idx_trades_seller ON trades (seller_user_id, executed_at DESC);
CREATE INDEX idx_trades_symbol_time ON trades (symbol, executed_at DESC);
CREATE INDEX idx_trades_executed_at ON trades (executed_at DESC);
CREATE INDEX idx_trades_buyer_order ON trades (buyer_order_id);
CREATE INDEX idx_trades_seller_order ON trades (seller_order_id);

-- Comments
COMMENT ON TABLE trades IS 'Trade execution records - partitioned by executed_at (daily)';
COMMENT ON COLUMN trades.is_buyer_maker IS 'TRUE if buyer is maker (passive), FALSE if taker (aggressive)';
COMMENT ON COLUMN trades.trade_source IS 'Execution source: INTERNAL (matching engine), BROKER (external), SIMULATION (paper trading)';

-- ----------------------------------------------------------------------------
-- Table: symbols (Trading Pairs Configuration)
-- ----------------------------------------------------------------------------
CREATE TABLE symbols (
    -- Primary Key
    symbol_id SERIAL PRIMARY KEY,
    
    -- Symbol Details
    symbol VARCHAR(20) UNIQUE NOT NULL,
    base_asset VARCHAR(10) NOT NULL,
    quote_asset VARCHAR(10) NOT NULL,
    
    -- Status
    status symbol_status_enum NOT NULL DEFAULT 'ACTIVE',
    status_reason TEXT,
    estimated_resume TIMESTAMP,
    
    -- Trading Parameters
    tick_size DECIMAL(20,8) NOT NULL DEFAULT 0.01,
    min_order_size DECIMAL(20,8) NOT NULL DEFAULT 0.0001,
    max_order_size DECIMAL(20,8) NOT NULL DEFAULT 100,
    min_order_value DECIMAL(20,8) NOT NULL DEFAULT 10,
    price_band_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    
    -- Fees
    maker_fee DECIMAL(6,4) NOT NULL DEFAULT 0.0005,
    taker_fee DECIMAL(6,4) NOT NULL DEFAULT 0.0010,
    
    -- Trading Hours (NULL = 24/7)
    trading_start TIME,
    trading_end TIME,
    trading_timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_tick_size_positive CHECK (tick_size > 0),
    CONSTRAINT chk_min_order_positive CHECK (min_order_size > 0),
    CONSTRAINT chk_max_gt_min CHECK (max_order_size >= min_order_size),
    CONSTRAINT chk_price_band_positive CHECK (price_band_percentage > 0)
);

-- Indexes
CREATE INDEX idx_symbols_status ON symbols (status);
CREATE INDEX idx_symbols_base_quote ON symbols (base_asset, quote_asset);

-- Comments
COMMENT ON TABLE symbols IS 'Trading pairs configuration and parameters';
COMMENT ON COLUMN symbols.tick_size IS 'Minimum price increment (e.g., 0.01 for BTC/USDT)';
COMMENT ON COLUMN symbols.price_band_percentage IS 'Max price deviation from last trade (±%)';

-- ----------------------------------------------------------------------------
-- Table: stop_orders_watchlist (Monitoring stop orders)
-- ----------------------------------------------------------------------------
CREATE TABLE stop_orders_watchlist (
    -- Composite Primary Key
    order_id UUID PRIMARY KEY,
    
    -- Order Details
    user_id UUID NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side order_side_enum NOT NULL,
    stop_price DECIMAL(20,8) NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    
    -- Metadata
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key
    CONSTRAINT fk_watchlist_order FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_stop_watchlist_symbol_price ON stop_orders_watchlist (symbol, stop_price);
CREATE INDEX idx_stop_watchlist_user ON stop_orders_watchlist (user_id);

-- Comments
COMMENT ON TABLE stop_orders_watchlist IS 'Active stop orders being monitored for trigger conditions';

-- ----------------------------------------------------------------------------
-- Table: order_book_snapshots (Periodic snapshots for recovery)
-- ----------------------------------------------------------------------------
CREATE TABLE order_book_snapshots (
    snapshot_id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    
    -- Order Book Data (JSON)
    bids JSONB NOT NULL,    -- [{price, quantity, orders: [order_ids]}]
    asks JSONB NOT NULL,
    
    -- Metadata
    sequence_number BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    CONSTRAINT uq_symbol_sequence UNIQUE (symbol, sequence_number)
);

-- Indexes
CREATE INDEX idx_snapshots_symbol_time ON order_book_snapshots (symbol, created_at DESC);

-- Comments
COMMENT ON TABLE order_book_snapshots IS 'Periodic order book snapshots for recovery and auditing';

-- ============================================================================
-- PART 3: PARTITION MANAGEMENT
-- ============================================================================

-- Retention Policy Configuration
-- Adjust these values based on regulatory and business requirements
CREATE TABLE IF NOT EXISTS partition_retention_config (
    table_name VARCHAR(50) PRIMARY KEY,
    retention_months INT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default retention policies
INSERT INTO partition_retention_config (table_name, retention_months, description) VALUES
('orders', 60, 'Keep orders for 5 years (SPK/MASAK compliance)'),
('trades', 60, 'Keep trades for 5 years (regulatory requirement)')
ON CONFLICT (table_name) DO NOTHING;

COMMENT ON TABLE partition_retention_config IS 'Retention policy configuration for partitioned tables';

-- ----------------------------------------------------------------------------
-- Optional: TimescaleDB Extension (for time-series optimization)
-- ----------------------------------------------------------------------------
-- Uncomment below if using TimescaleDB for better time-series performance
-- 
-- CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
-- 
-- -- Convert orders table to hypertable (after creating base table)
-- -- SELECT create_hypertable('orders', 'created_at', 
-- --   chunk_time_interval => INTERVAL '1 month',
-- --   if_not_exists => TRUE
-- -- );
-- 
-- -- Convert trades table to hypertable
-- -- SELECT create_hypertable('trades', 'executed_at',
-- --   chunk_time_interval => INTERVAL '1 day',
-- --   if_not_exists => TRUE
-- -- );
-- 
-- -- Add compression policy (compress chunks older than 7 days)
-- -- SELECT add_compression_policy('trades', INTERVAL '7 days');
-- 
-- -- Add retention policy (drop chunks older than configured retention)
-- -- SELECT add_retention_policy('trades', INTERVAL '60 months');
-- 
-- Note: TimescaleDB provides better performance for time-series queries
-- and automatic compression. Consider enabling for production deployment.

-- ----------------------------------------------------------------------------
-- Function: Create Order Partitions (Monthly)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_orders_partition(partition_date DATE)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Calculate partition boundaries
    start_date := DATE_TRUNC('month', partition_date)::DATE;
    end_date := (start_date + INTERVAL '1 month')::DATE;
    
    -- Generate partition name (e.g., orders_2024_11)
    partition_name := 'orders_' || TO_CHAR(start_date, 'YYYY_MM');
    
    -- Check if partition already exists
    IF EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = partition_name
    ) THEN
        RETURN 'Partition ' || partition_name || ' already exists';
    END IF;
    
    -- Create partition
    EXECUTE format(
        'CREATE TABLE %I PARTITION OF orders FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        start_date,
        end_date
    );
    
    RETURN 'Created partition: ' || partition_name;
END;
$$ LANGUAGE plpgsql;

-- Create initial partitions (12 months ahead)
DO $$
DECLARE
    i INT;
BEGIN
    FOR i IN 0..11 LOOP
        PERFORM create_orders_partition(CURRENT_DATE + (i || ' months')::INTERVAL);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Function: Create Trade Partitions (Daily)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_trades_partition(partition_date DATE)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    start_date := partition_date;
    end_date := start_date + INTERVAL '1 day';
    
    -- Generate partition name (e.g., trades_2024_11_22)
    partition_name := 'trades_' || TO_CHAR(start_date, 'YYYY_MM_DD');
    
    IF EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = partition_name
    ) THEN
        RETURN 'Partition ' || partition_name || ' already exists';
    END IF;
    
    EXECUTE format(
        'CREATE TABLE %I PARTITION OF trades FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        start_date,
        end_date
    );
    
    RETURN 'Created partition: ' || partition_name;
END;
$$ LANGUAGE plpgsql;

-- Create initial partitions (30 days ahead)
DO $$
DECLARE
    i INT;
BEGIN
    FOR i IN 0..29 LOOP
        PERFORM create_trades_partition(CURRENT_DATE + i);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Function: Automated Partition Creation (Cron Job)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION maintain_partitions()
RETURNS VOID AS $$
DECLARE
    orders_retention INT;
    trades_retention INT;
BEGIN
    -- Get retention policies
    SELECT retention_months INTO orders_retention 
    FROM partition_retention_config WHERE table_name = 'orders';
    
    SELECT retention_months INTO trades_retention 
    FROM partition_retention_config WHERE table_name = 'trades';
    
    -- Create order partitions for next 3 months if not exist
    PERFORM create_orders_partition(CURRENT_DATE + (i || ' months')::INTERVAL)
    FROM generate_series(1, 3) i;
    
    -- Create trade partitions for next 7 days if not exist
    PERFORM create_trades_partition(CURRENT_DATE + i)
    FROM generate_series(1, 7) i;
    
    -- Drop old order partitions (older than retention policy)
    -- WARNING: Ensure data is archived before dropping!
    PERFORM drop_old_partitions('orders', orders_retention);
    
    -- Drop old trade partitions (older than retention policy)
    PERFORM drop_old_partitions('trades', trades_retention);
    
    RAISE NOTICE 'Partition maintenance completed. Orders retention: % months, Trades retention: % months', 
        orders_retention, trades_retention;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Function: Drop Old Partitions (Based on Retention Policy)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION drop_old_partitions(
    p_table_name TEXT,
    p_retention_months INT
)
RETURNS VOID AS $$
DECLARE
    partition_record RECORD;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - (p_retention_months || ' months')::INTERVAL;
    
    FOR partition_record IN
        SELECT child.relname AS partition_name
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        WHERE parent.relname = p_table_name
          AND child.relname ~ '\d{4}_\d{2}'  -- Match date pattern
    LOOP
        -- Extract date from partition name and check if older than cutoff
        -- This is a simplified check - enhance based on your naming convention
        -- Example: orders_2024_11 -> check if 2024-11 < cutoff_date
        
        RAISE NOTICE 'Checking partition: %', partition_record.partition_name;
        
        -- Add your date extraction and comparison logic here
        -- If partition is older than retention, drop it:
        -- EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.partition_name);
    END LOOP;
    
    RAISE NOTICE 'Old partition cleanup completed for table: %', p_table_name;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (requires pg_cron extension)
-- SELECT cron.schedule('maintain-partitions', '0 2 * * *', 'SELECT maintain_partitions()');

-- ============================================================================
-- PART 4: TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger: Auto-update updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_symbols_updated_at
    BEFORE UPDATE ON symbols
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Trigger: Add to stop_orders_watchlist on STOP order creation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_stop_order_to_watchlist()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_type IN ('STOP', 'STOP_LIMIT') AND NEW.status = 'OPEN' THEN
        INSERT INTO stop_orders_watchlist (
            order_id, user_id, symbol, side, stop_price, quantity
        ) VALUES (
            NEW.order_id, NEW.user_id, NEW.symbol, NEW.side, NEW.stop_price, NEW.quantity
        )
        ON CONFLICT (order_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_add_stop_order_to_watchlist
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION add_stop_order_to_watchlist();

-- ----------------------------------------------------------------------------
-- Trigger: Remove from stop_orders_watchlist on status change
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION remove_stop_order_from_watchlist()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED') THEN
        DELETE FROM stop_orders_watchlist WHERE order_id = NEW.order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_remove_stop_order_from_watchlist
    AFTER UPDATE ON orders
    FOR EACH ROW
    WHEN (OLD.status != NEW.status)
    EXECUTE FUNCTION remove_stop_order_from_watchlist();

-- ----------------------------------------------------------------------------
-- Trigger: Validate order status transitions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Define valid state transitions
    IF OLD.status = 'FILLED' AND NEW.status != 'FILLED' THEN
        RAISE EXCEPTION 'Cannot change status of a filled order';
    END IF;
    
    IF OLD.status = 'CANCELLED' AND NEW.status != 'CANCELLED' THEN
        RAISE EXCEPTION 'Cannot change status of a cancelled order';
    END IF;
    
    IF OLD.status = 'REJECTED' AND NEW.status != 'REJECTED' THEN
        RAISE EXCEPTION 'Cannot change status of a rejected order';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_order_status_transition
    BEFORE UPDATE ON orders
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION validate_order_status_transition();

-- ----------------------------------------------------------------------------
-- Trigger: Set filled_at timestamp when order is filled
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_filled_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'FILLED' AND OLD.status != 'FILLED' THEN
        NEW.filled_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_filled_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_filled_at_timestamp();

-- ----------------------------------------------------------------------------
-- Trigger: Set cancelled_at timestamp when order is cancelled
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_cancelled_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
        NEW.cancelled_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_cancelled_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_cancelled_at_timestamp();

-- ============================================================================
-- PART 5: VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: Active Orders (For Order Book)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_active_orders AS
SELECT 
    order_id,
    user_id,
    symbol,
    side,
    order_type,
    quantity,
    filled_quantity,
    (quantity - filled_quantity) AS remaining_quantity,
    price,
    created_at,
    updated_at
FROM orders
WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
  AND price IS NOT NULL
ORDER BY 
    symbol,
    side,
    CASE 
        WHEN side = 'BUY' THEN -price  -- Highest buy price first
        ELSE price                      -- Lowest sell price first
    END,
    created_at;  -- Time priority (FIFO)

COMMENT ON VIEW v_active_orders IS 'Active orders sorted by Price-Time Priority for matching';

-- ----------------------------------------------------------------------------
-- View: User Order Summary
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_user_order_summary AS
SELECT 
    user_id,
    symbol,
    COUNT(*) FILTER (WHERE status IN ('OPEN', 'PARTIALLY_FILLED')) AS open_orders,
    COUNT(*) FILTER (WHERE status = 'FILLED') AS filled_orders,
    COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_orders,
    SUM(quantity * price) FILTER (WHERE status = 'FILLED') AS total_volume
FROM orders
GROUP BY user_id, symbol;

-- ----------------------------------------------------------------------------
-- View: Symbol Statistics (24h)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_symbol_stats_24h AS
SELECT 
    symbol,
    COUNT(*) AS trade_count,
    SUM(quantity) AS volume,
    SUM(quantity * price) AS quote_volume,
    MIN(price) AS low_price,
    MAX(price) AS high_price,
    (SELECT price FROM trades t2 WHERE t2.symbol = t1.symbol ORDER BY executed_at DESC LIMIT 1) AS last_price
FROM trades t1
WHERE executed_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY symbol;

-- ============================================================================
-- PART 6: FUNCTIONS & PROCEDURES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: Get Order Book Depth
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_order_book_depth(
    p_symbol VARCHAR(20),
    p_depth INT DEFAULT 20
)
RETURNS TABLE (
    side VARCHAR(4),
    price DECIMAL(20,8),
    quantity DECIMAL(20,8),
    order_count INT
) AS $$
BEGIN
    -- Get BUY side (bids) - highest price first
    RETURN QUERY
    SELECT 
        'BID'::VARCHAR(4) AS side,
        o.price,
        SUM(o.quantity - o.filled_quantity) AS quantity,
        COUNT(*)::INT AS order_count
    FROM orders o
    WHERE o.symbol = p_symbol
      AND o.side = 'BUY'
      AND o.status IN ('OPEN', 'PARTIALLY_FILLED')
      AND o.price IS NOT NULL
    GROUP BY o.price
    ORDER BY o.price DESC
    LIMIT p_depth;
    
    -- Get SELL side (asks) - lowest price first
    RETURN QUERY
    SELECT 
        'ASK'::VARCHAR(4) AS side,
        o.price,
        SUM(o.quantity - o.filled_quantity) AS quantity,
        COUNT(*)::INT AS order_count
    FROM orders o
    WHERE o.symbol = p_symbol
      AND o.side = 'SELL'
      AND o.status IN ('OPEN', 'PARTIALLY_FILLED')
      AND o.price IS NOT NULL
    GROUP BY o.price
    ORDER BY o.price ASC
    LIMIT p_depth;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Function: Get User Trade History
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_trade_history(
    p_user_id UUID,
    p_symbol VARCHAR(20) DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    trade_id UUID,
    symbol VARCHAR(20),
    side VARCHAR(4),
    price DECIMAL(20,8),
    quantity DECIMAL(20,8),
    fee DECIMAL(20,8),
    is_maker BOOLEAN,
    executed_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.trade_id,
        t.symbol,
        CASE 
            WHEN t.buyer_user_id = p_user_id THEN 'BUY'::VARCHAR(4)
            ELSE 'SELL'::VARCHAR(4)
        END AS side,
        t.price,
        t.quantity,
        CASE 
            WHEN t.buyer_user_id = p_user_id THEN t.buyer_fee
            ELSE t.seller_fee
        END AS fee,
        CASE 
            WHEN t.buyer_user_id = p_user_id THEN t.is_buyer_maker
            ELSE NOT t.is_buyer_maker
        END AS is_maker,
        t.executed_at
    FROM trades t
    WHERE (t.buyer_user_id = p_user_id OR t.seller_user_id = p_user_id)
      AND (p_symbol IS NULL OR t.symbol = p_symbol)
    ORDER BY t.executed_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 7: INITIAL DATA (Symbols)
-- ============================================================================

-- Insert default trading pairs
INSERT INTO symbols (symbol, base_asset, quote_asset, status, tick_size, min_order_size, max_order_size) VALUES
('BTC/USDT', 'BTC', 'USDT', 'ACTIVE', 0.01, 0.0001, 100),
('ETH/USDT', 'ETH', 'USDT', 'ACTIVE', 0.01, 0.001, 1000),
('BNB/USDT', 'BNB', 'USDT', 'ACTIVE', 0.01, 0.01, 10000),
('SOL/USDT', 'SOL', 'USDT', 'ACTIVE', 0.01, 0.1, 50000),
('XRP/USDT', 'XRP', 'USDT', 'ACTIVE', 0.0001, 1, 1000000),
('ADA/USDT', 'ADA', 'USDT', 'ACTIVE', 0.0001, 1, 1000000),
('DOGE/USDT', 'DOGE', 'USDT', 'ACTIVE', 0.00001, 1, 10000000),
('AVAX/USDT', 'AVAX', 'USDT', 'ACTIVE', 0.01, 0.1, 10000),
('DOT/USDT', 'DOT', 'USDT', 'ACTIVE', 0.01, 0.1, 10000),
('MATIC/USDT', 'MATIC', 'USDT', 'ACTIVE', 0.0001, 1, 1000000)
ON CONFLICT (symbol) DO NOTHING;

-- ============================================================================
-- PART 8: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite index for order matching
CREATE INDEX idx_orders_matching ON orders (symbol, side, price, created_at)
    WHERE status IN ('OPEN', 'PARTIALLY_FILLED') AND price IS NOT NULL;

-- Index for user order queries
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);

-- Index for idempotency checks (with hash for performance)
CREATE INDEX idx_orders_client_order_hash ON orders 
    USING HASH (client_order_id)
    WHERE client_order_id IS NOT NULL;

-- Partial index for active orders (most queried)
CREATE INDEX idx_orders_active ON orders (symbol, side, price)
    WHERE status IN ('OPEN', 'PARTIALLY_FILLED');

-- ============================================================================
-- PART 9: MATERIALIZED VIEWS (For Performance)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Materialized View: Order Book Snapshot (Refreshed periodically)
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_order_book_snapshot AS
SELECT 
    symbol,
    side,
    price,
    SUM(quantity - filled_quantity) AS total_quantity,
    COUNT(*) AS order_count,
    CURRENT_TIMESTAMP AS last_refresh
FROM orders
WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
  AND price IS NOT NULL
GROUP BY symbol, side, price
ORDER BY symbol, side, price;

-- Index on materialized view
CREATE INDEX idx_mv_order_book ON mv_order_book_snapshot (symbol, side, price);

-- Refresh function (called by cron or on-demand)
CREATE OR REPLACE FUNCTION refresh_order_book_snapshot()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_order_book_snapshot;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 10: GRANTS & PERMISSIONS
-- ============================================================================

-- Create roles
CREATE ROLE trade_engine_app WITH LOGIN PASSWORD 'CHANGE_ME_IN_PRODUCTION';
CREATE ROLE trade_engine_readonly WITH LOGIN PASSWORD 'CHANGE_ME_IN_PRODUCTION';
CREATE ROLE trade_engine_admin WITH LOGIN PASSWORD 'CHANGE_ME_IN_PRODUCTION';

-- Grant permissions to application role
GRANT SELECT, INSERT, UPDATE ON orders TO trade_engine_app;
GRANT SELECT, INSERT ON trades TO trade_engine_app;
GRANT SELECT ON symbols TO trade_engine_app;
GRANT SELECT, INSERT, DELETE ON stop_orders_watchlist TO trade_engine_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO trade_engine_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO trade_engine_app;

-- Grant permissions to readonly role
GRANT SELECT ON ALL TABLES IN SCHEMA public TO trade_engine_readonly;

-- Grant permissions to admin role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO trade_engine_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO trade_engine_admin;

-- ============================================================================
-- PART 11: MONITORING QUERIES
-- ============================================================================

-- Active orders count by symbol
CREATE OR REPLACE VIEW v_monitoring_active_orders AS
SELECT 
    symbol,
    COUNT(*) FILTER (WHERE side = 'BUY') AS buy_orders,
    COUNT(*) FILTER (WHERE side = 'SELL') AS sell_orders,
    COUNT(*) AS total_orders,
    SUM(quantity - filled_quantity) AS total_quantity
FROM orders
WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
GROUP BY symbol;

-- Trade volume by symbol (last 24h)
CREATE OR REPLACE VIEW v_monitoring_trade_volume_24h AS
SELECT 
    symbol,
    COUNT(*) AS trade_count,
    SUM(quantity) AS volume,
    SUM(quantity * price) AS quote_volume,
    AVG(price) AS avg_price
FROM trades
WHERE executed_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY symbol;

-- Order status distribution
CREATE OR REPLACE VIEW v_monitoring_order_status AS
SELECT 
    status,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM orders
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY status
ORDER BY count DESC;

-- ============================================================================
-- PART 12: BACKUP & RECOVERY
-- ============================================================================

-- Continuous Archiving (WAL)
-- Edit postgresql.conf:
-- wal_level = replica
-- archive_mode = on
-- archive_command = 'cp %p /archive/%f'
-- max_wal_senders = 3
-- wal_keep_size = 1GB

-- Point-in-Time Recovery (PITR) restore command:
-- restore_command = 'cp /archive/%f %p'

-- ============================================================================
-- PART 13: MIGRATION SCRIPT EXAMPLE
-- ============================================================================

-- Migration: Add new column to orders table
-- File: migrations/V002__add_order_notes.sql

/*
BEGIN;

-- Add column
ALTER TABLE orders ADD COLUMN notes TEXT;

-- Add index
CREATE INDEX idx_orders_notes ON orders USING GIN (to_tsvector('english', notes))
    WHERE notes IS NOT NULL;

-- Update version
INSERT INTO schema_migrations (version, description, applied_at) 
VALUES ('V002', 'Add notes column to orders', CURRENT_TIMESTAMP);

COMMIT;
*/

-- ============================================================================
-- PART 14: HEALTH CHECKS
-- ============================================================================

-- Check database connections
CREATE OR REPLACE FUNCTION check_db_connections()
RETURNS TABLE (
    active_connections INT,
    idle_connections INT,
    max_connections INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE state = 'active')::INT AS active_connections,
        COUNT(*) FILTER (WHERE state = 'idle')::INT AS idle_connections,
        (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections') AS max_connections
    FROM pg_stat_activity
    WHERE datname = current_database();
END;
$$ LANGUAGE plpgsql;

-- Check table sizes
CREATE OR REPLACE FUNCTION check_table_sizes()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    total_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tablename::TEXT,
        n_live_tup AS row_count,
        pg_size_pretty(pg_total_relation_size(quote_ident(tablename)::regclass)) AS total_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(quote_ident(tablename)::regclass) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- END OF DDL SCRIPTS
-- ============================================================================

-- Verification queries (run after setup)
/*
-- Check partitions
SELECT 
    parent.relname AS parent_table,
    child.relname AS partition_name
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname IN ('orders', 'trades')
ORDER BY parent.relname, child.relname;

-- Check indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'trades', 'symbols')
ORDER BY tablename, indexname;

-- Check triggers
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
*/
