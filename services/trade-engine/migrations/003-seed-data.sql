-- Seed initial data for Trade Engine

-- Insert default trading pairs
INSERT INTO symbols (symbol, base_asset, quote_asset, min_order_qty, max_order_qty, price_precision, qty_precision, status) VALUES
    ('BTC/USDT', 'BTC', 'USDT', 0.00000001, 10000, 2, 8, 'ACTIVE'),
    ('ETH/USDT', 'ETH', 'USDT', 0.00000001, 100000, 2, 8, 'ACTIVE'),
    ('BNB/USDT', 'BNB', 'USDT', 0.00000001, 1000000, 2, 8, 'ACTIVE'),
    ('ADA/USDT', 'ADA', 'USDT', 0.00000001, 10000000, 4, 8, 'ACTIVE'),
    ('SOL/USDT', 'SOL', 'USDT', 0.00000001, 1000000, 2, 8, 'ACTIVE'),
    ('XRP/USDT', 'XRP', 'USDT', 0.00000001, 10000000, 4, 8, 'ACTIVE'),
    ('DOGE/USDT', 'DOGE', 'USDT', 0.00000001, 100000000, 4, 8, 'ACTIVE'),
    ('LINK/USDT', 'LINK', 'USDT', 0.00000001, 1000000, 2, 8, 'ACTIVE'),
    ('USDC/USDT', 'USDC', 'USDT', 0.01, 10000000, 4, 8, 'ACTIVE'),
    ('MATIC/USDT', 'MATIC', 'USDT', 0.00000001, 10000000, 4, 8, 'ACTIVE')
ON CONFLICT (symbol) DO NOTHING;
