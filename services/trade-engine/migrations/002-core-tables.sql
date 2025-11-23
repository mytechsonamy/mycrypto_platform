-- Create core tables for Trade Engine
-- Symbols, Orders, and Trades tables with partitioning

-- Symbols table
CREATE TABLE IF NOT EXISTS symbols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL UNIQUE,
    base_asset VARCHAR(10) NOT NULL,
    quote_asset VARCHAR(10) NOT NULL,
    min_order_qty DECIMAL(20, 8) NOT NULL,
    max_order_qty DECIMAL(20, 8) NOT NULL,
    price_precision INT NOT NULL,
    qty_precision INT NOT NULL,
    status symbol_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_symbols_symbol ON symbols(symbol);
CREATE INDEX idx_symbols_status ON symbols(status);

-- Orders table (partitioned by month on created_at)
CREATE TABLE IF NOT EXISTS orders (
    order_id UUID NOT NULL,
    user_id UUID NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side order_side_enum NOT NULL,
    order_type order_type_enum NOT NULL,
    status order_status_enum NOT NULL DEFAULT 'PENDING',
    quantity DECIMAL(20, 8) NOT NULL CHECK (quantity > 0),
    filled_quantity DECIMAL(20, 8) NOT NULL DEFAULT 0 CHECK (filled_quantity >= 0 AND filled_quantity <= quantity),
    price DECIMAL(20, 8),
    stop_price DECIMAL(20, 8),
    time_in_force time_in_force_enum NOT NULL DEFAULT 'GTC',
    client_order_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    filled_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    PRIMARY KEY (order_id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial partitions for orders (12 months)
CREATE TABLE orders_2024_11 PARTITION OF orders
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE orders_2024_12 PARTITION OF orders
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE orders_2025_01 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE orders_2025_02 PARTITION OF orders
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE orders_2025_03 PARTITION OF orders
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE orders_2025_04 PARTITION OF orders
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE orders_2025_05 PARTITION OF orders
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE orders_2025_06 PARTITION OF orders
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE orders_2025_07 PARTITION OF orders
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE orders_2025_08 PARTITION OF orders
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE orders_2025_09 PARTITION OF orders
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE orders_2025_10 PARTITION OF orders
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Indexes on orders table
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_symbol_status ON orders(symbol, status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_symbol ON orders(symbol);
CREATE INDEX idx_orders_client_order_id ON orders(client_order_id) WHERE client_order_id IS NOT NULL;

-- Trades table (partitioned by day on executed_at)
CREATE TABLE IF NOT EXISTS trades (
    trade_id UUID NOT NULL,
    buy_order_id UUID,
    sell_order_id UUID,
    buyer_user_id UUID NOT NULL,
    seller_user_id UUID NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL CHECK (quantity > 0),
    price DECIMAL(20, 8) NOT NULL CHECK (price > 0),
    executed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (trade_id, executed_at)
) PARTITION BY RANGE (executed_at);

-- Create initial partitions for trades (30 days)
CREATE TABLE trades_2025_11_23 PARTITION OF trades
    FOR VALUES FROM ('2025-11-23') TO ('2025-11-24');
CREATE TABLE trades_2025_11_24 PARTITION OF trades
    FOR VALUES FROM ('2025-11-24') TO ('2025-11-25');
CREATE TABLE trades_2025_11_25 PARTITION OF trades
    FOR VALUES FROM ('2025-11-25') TO ('2025-11-26');
CREATE TABLE trades_2025_11_26 PARTITION OF trades
    FOR VALUES FROM ('2025-11-26') TO ('2025-11-27');
CREATE TABLE trades_2025_11_27 PARTITION OF trades
    FOR VALUES FROM ('2025-11-27') TO ('2025-11-28');
CREATE TABLE trades_2025_11_28 PARTITION OF trades
    FOR VALUES FROM ('2025-11-28') TO ('2025-11-29');
CREATE TABLE trades_2025_11_29 PARTITION OF trades
    FOR VALUES FROM ('2025-11-29') TO ('2025-11-30');
CREATE TABLE trades_2025_11_30 PARTITION OF trades
    FOR VALUES FROM ('2025-11-30') TO ('2025-12-01');
CREATE TABLE trades_2025_12_01 PARTITION OF trades
    FOR VALUES FROM ('2025-12-01') TO ('2025-12-02');
CREATE TABLE trades_2025_12_02 PARTITION OF trades
    FOR VALUES FROM ('2025-12-02') TO ('2025-12-03');
CREATE TABLE trades_2025_12_03 PARTITION OF trades
    FOR VALUES FROM ('2025-12-03') TO ('2025-12-04');
CREATE TABLE trades_2025_12_04 PARTITION OF trades
    FOR VALUES FROM ('2025-12-04') TO ('2025-12-05');
CREATE TABLE trades_2025_12_05 PARTITION OF trades
    FOR VALUES FROM ('2025-12-05') TO ('2025-12-06');
CREATE TABLE trades_2025_12_06 PARTITION OF trades
    FOR VALUES FROM ('2025-12-06') TO ('2025-12-07');
CREATE TABLE trades_2025_12_07 PARTITION OF trades
    FOR VALUES FROM ('2025-12-07') TO ('2025-12-08');
CREATE TABLE trades_2025_12_08 PARTITION OF trades
    FOR VALUES FROM ('2025-12-08') TO ('2025-12-09');
CREATE TABLE trades_2025_12_09 PARTITION OF trades
    FOR VALUES FROM ('2025-12-09') TO ('2025-12-10');
CREATE TABLE trades_2025_12_10 PARTITION OF trades
    FOR VALUES FROM ('2025-12-10') TO ('2025-12-11');
CREATE TABLE trades_2025_12_11 PARTITION OF trades
    FOR VALUES FROM ('2025-12-11') TO ('2025-12-12');
CREATE TABLE trades_2025_12_12 PARTITION OF trades
    FOR VALUES FROM ('2025-12-12') TO ('2025-12-13');
CREATE TABLE trades_2025_12_13 PARTITION OF trades
    FOR VALUES FROM ('2025-12-13') TO ('2025-12-14');
CREATE TABLE trades_2025_12_14 PARTITION OF trades
    FOR VALUES FROM ('2025-12-14') TO ('2025-12-15');
CREATE TABLE trades_2025_12_15 PARTITION OF trades
    FOR VALUES FROM ('2025-12-15') TO ('2025-12-16');
CREATE TABLE trades_2025_12_16 PARTITION OF trades
    FOR VALUES FROM ('2025-12-16') TO ('2025-12-17');
CREATE TABLE trades_2025_12_17 PARTITION OF trades
    FOR VALUES FROM ('2025-12-17') TO ('2025-12-18');
CREATE TABLE trades_2025_12_18 PARTITION OF trades
    FOR VALUES FROM ('2025-12-18') TO ('2025-12-19');
CREATE TABLE trades_2025_12_19 PARTITION OF trades
    FOR VALUES FROM ('2025-12-19') TO ('2025-12-20');
CREATE TABLE trades_2025_12_20 PARTITION OF trades
    FOR VALUES FROM ('2025-12-20') TO ('2025-12-21');
CREATE TABLE trades_2025_12_21 PARTITION OF trades
    FOR VALUES FROM ('2025-12-21') TO ('2025-12-22');
CREATE TABLE trades_2025_12_22 PARTITION OF trades
    FOR VALUES FROM ('2025-12-22') TO ('2025-12-23');

-- Indexes on trades table
CREATE INDEX idx_trades_symbol_executed_at ON trades(symbol, executed_at DESC);
CREATE INDEX idx_trades_buyer_user_id ON trades(buyer_user_id);
CREATE INDEX idx_trades_seller_user_id ON trades(seller_user_id);
CREATE INDEX idx_trades_executed_at ON trades(executed_at DESC);
CREATE INDEX idx_trades_symbol ON trades(symbol);

-- Order Book table (real-time, no partitioning)
CREATE TABLE IF NOT EXISTS order_book (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    side order_side_enum NOT NULL,
    price DECIMAL(20, 8) NOT NULL CHECK (price > 0),
    quantity DECIMAL(20, 8) NOT NULL CHECK (quantity > 0),
    order_count INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, side, price)
);

CREATE INDEX idx_order_book_symbol_side ON order_book(symbol, side);
CREATE INDEX idx_order_book_symbol ON order_book(symbol);
