-- Migration: Create price_alerts table
-- Purpose: Store user price alerts for cryptocurrency pairs

CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    alert_type VARCHAR(10) NOT NULL CHECK (alert_type IN ('above', 'below')),
    target_price DECIMAL(20, 8) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notifications_sent INTEGER DEFAULT 0,
    triggered_at TIMESTAMP,
    last_checked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_symbol ON price_alerts(symbol);
CREATE INDEX idx_price_alerts_active ON price_alerts(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_price_alerts_user_symbol ON price_alerts(user_id, symbol);

-- Create unique constraint to prevent duplicate alerts
CREATE UNIQUE INDEX idx_price_alerts_unique
ON price_alerts(user_id, symbol, alert_type, target_price)
WHERE is_active = TRUE;

-- Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_price_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_price_alerts_updated_at
BEFORE UPDATE ON price_alerts
FOR EACH ROW
EXECUTE FUNCTION update_price_alerts_updated_at();

-- Add comments
COMMENT ON TABLE price_alerts IS 'User price alerts for cryptocurrency pairs';
COMMENT ON COLUMN price_alerts.user_id IS 'Reference to user who created the alert';
COMMENT ON COLUMN price_alerts.symbol IS 'Trading pair symbol (e.g., BTC/USD)';
COMMENT ON COLUMN price_alerts.alert_type IS 'Alert triggers when price goes above or below target';
COMMENT ON COLUMN price_alerts.target_price IS 'Target price to trigger alert';
COMMENT ON COLUMN price_alerts.is_active IS 'Whether alert is currently active';
COMMENT ON COLUMN price_alerts.notifications_sent IS 'Count of notifications sent for this alert';
COMMENT ON COLUMN price_alerts.triggered_at IS 'Timestamp when alert was last triggered';
COMMENT ON COLUMN price_alerts.last_checked_at IS 'Timestamp when alert was last checked';
